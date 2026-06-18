// WorkOS AuthKit login on native via OAuth2 + PKCE.
//
// Flow:
//   1. Build an authorization request against WorkOS AuthKit (authorize endpoint),
//      with PKCE (expo-auth-session generates verifier/challenge).
//   2. Open it in the system browser (expo-web-browser via AuthSession).
//   3. WorkOS redirects back to our app scheme with a `code`.
//   4. Exchange the code for access/refresh tokens at the WorkOS token endpoint.
//   5. Persist tokens in expo-secure-store; expose user + authed fetch.
//
// The access token is the same WorkOS JWT that /api/mobile/* verifies via JWKS
// (packages/auth getSessionFromToken), so the phone and web share one identity.
import * as React from 'react'
import * as AuthSession from 'expo-auth-session'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import { config } from '../lib/config'

WebBrowser.maybeCompleteAuthSession()

const TOKEN_KEY = 'mcloud.workos.tokens'
const USER_KEY = 'mcloud.workos.user'
// Set on explicit sign-out, consumed on the next sign-in. WorkOS keeps its own
// session in the system browser, so clearing only our local tokens lets the next
// authorize silently re-auth (looks like sign-out "didn't work"). When this flag
// is present we add `prompt=login` so WorkOS shows the real login screen, letting
// the user sign in fresh or as a different account.
const FORCE_LOGIN_KEY = 'mcloud.workos.force_login'

// WorkOS AuthKit OAuth endpoints. AuthKit exposes standard OAuth2 endpoints under
// the WorkOS API domain.
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `${config.workosDomain}/user_management/authorize`,
  tokenEndpoint: `${config.workosDomain}/user_management/authenticate`,
}

type Tokens = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number // epoch ms
}

export type SessionUser = {
  id: string
  email: string
  name?: string
  avatarUrl?: string | null
}

type AuthState = {
  user: SessionUser | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  /** fetch() against apps/web with the bearer token attached + refresh-on-401. */
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>
  /** Re-resolve the current user from stored tokens (after deep-link auth completes). */
  refreshSession: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

async function saveTokens(t: Tokens) {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(t))
}
async function loadTokens(): Promise<Tokens | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY)
  return raw ? (JSON.parse(raw) as Tokens) : null
}
async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  try { await SecureStore.deleteItemAsync(USER_KEY) } catch {}
}

/** Mint a fresh access token from the stored refresh token. Returns null on failure. */
async function refreshTokens(): Promise<Tokens | null> {
  const tokens = await loadTokens()
  if (!tokens?.refreshToken) return null
  try {
    const refreshed = await AuthSession.refreshAsync(
      { clientId: config.workosClientId, refreshToken: tokens.refreshToken },
      discovery,
    )
    const next: Tokens = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      expiresAt: refreshed.expiresIn ? Date.now() + refreshed.expiresIn * 1000 : undefined,
    }
    await saveTokens(next)
    return next
  } catch {
    return null
  }
}

// Cache the last-known user so the app can show a session offline / on a flaky
// launch instead of bouncing to login when the server is briefly unreachable.
async function saveUser(u: SessionUser) {
  try { await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u)) } catch {}
}
async function loadCachedUser(): Promise<SessionUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch { return null }
}

type MeResult =
  | { kind: 'ok'; user: SessionUser }
  | { kind: 'unauthorized' } // token genuinely rejected (401/403) — safe to clear
  | { kind: 'network' } // couldn't reach the server — DO NOT clear the session

/**
 * Fetch /api/mobile/me. Crucially distinguishes a rejected token (unauthorized →
 * sign out) from a transient network failure (network → keep the session), so a
 * flaky connection on launch never logs the user out.
 */
async function fetchMe(accessToken: string): Promise<MeResult> {
  let res: Response
  try {
    res = await fetch(`${config.apiBaseUrl}/api/mobile/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    return { kind: 'network' } // server unreachable
  }
  if (res.status === 401 || res.status === 403) return { kind: 'unauthorized' }
  if (!res.ok) return { kind: 'network' } // 5xx etc. — transient, keep session
  try {
    const data = (await res.json()) as { user: SessionUser }
    return { kind: 'ok', user: data.user }
  } catch {
    return { kind: 'network' }
  }
}

// Deterministic redirect URI. We hardcode the native scheme form so the dev client
// and the production (standalone) build send the IDENTICAL value, and it matches the
// exact string registered in the WorkOS dashboard. makeRedirectUri can emit different
// shapes (mcloud://auth vs mcloud:///auth vs an exp proxy) across build types, which
// breaks WorkOS's exact-match on redirect_uri and bounces the user back to sign-in.
const redirectUri = 'mcloud://auth'

// PKCE verifier for the in-flight login. Persisted (secure store) so the redirect
// landing route (app/auth.tsx) can complete the token exchange even if promptAsync
// didn't resolve to success — which happens on production standalone builds where
// the mcloud:// deep link is routed by expo-router before AuthSession catches it.
const VERIFIER_KEY = 'mcloud.workos.pkce_verifier'

// An auth code may be reported through TWO paths at once: promptAsync resolving
// (dev) AND the mcloud://auth deep link landing on app/auth.tsx. WorkOS rejects a
// second exchange of the same code ("already exchanged"), which would clobber the
// session. So the PKCE verifier acts as a single-use CLAIM: the first caller to
// read-and-delete it owns the exchange; the other finds nothing and no-ops.
let claimInFlight: Promise<boolean> | null = null

// A sign-in already in progress. Tapping "Sign in" again while the browser is
// open (or while the redirect is being processed) must NOT start a second
// authorize request — doing so overwrites VERIFIER_KEY with a new PKCE verifier,
// so when the FIRST request's code comes back it's exchanged against the SECOND
// verifier and WorkOS rejects it with "Invalid code verifier". Collapsing repeat
// taps onto the same in-flight promise keeps one verifier paired with one code.
let signInInFlight: Promise<void> | null = null

async function claimAndExchange(code: string): Promise<boolean> {
  // Collapse concurrent calls in the same JS context to one in-flight exchange.
  if (claimInFlight) return claimInFlight
  claimInFlight = (async () => {
    const verifier = await SecureStore.getItemAsync(VERIFIER_KEY)
    if (!verifier) return false // another path already claimed + exchanged this login
    await SecureStore.deleteItemAsync(VERIFIER_KEY) // claim it before exchanging
    try {
      const tokenRes = await AuthSession.exchangeCodeAsync(
        { clientId: config.workosClientId, code, redirectUri, extraParams: { code_verifier: verifier } },
        discovery,
      )
      await saveTokens({
        accessToken: tokenRes.accessToken,
        refreshToken: tokenRes.refreshToken,
        expiresAt: tokenRes.expiresIn ? Date.now() + tokenRes.expiresIn * 1000 : undefined,
      })
      return true
    } catch (e) {
      console.error('[auth] token exchange failed:', e)
      return false
    } finally {
      claimInFlight = null
    }
  })()
  return claimInFlight
}

/**
 * Called by app/auth.tsx when the mcloud://auth?code=... deep link lands there.
 * Idempotent with the inline promptAsync path via the single-use verifier claim.
 */
export async function completeAuthFromCode(code: string): Promise<boolean> {
  const ok = await claimAndExchange(code)
  return ok
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Resolve the current user on boot/reload. The WorkOS access token is short-lived,
  // so a stale token is NORMAL after a reload — try it, and on failure refresh once
  // before giving up. Only a failed refresh (true expiry/revocation) signs the user
  // out, so reloads don't bounce you back to the login screen.
  const hydrate = React.useCallback(async () => {
    let tokens = await loadTokens()
    if (!tokens?.accessToken) {
      setUser(null)
      setLoading(false)
      return
    }

    // Proactively refresh if the access token is expired/near-expiry (60s skew),
    // so we don't waste a round-trip on a token we know is stale.
    if (tokens.expiresAt && tokens.expiresAt - Date.now() < 60_000) {
      const refreshed = await refreshTokens()
      if (refreshed) tokens = refreshed
    }

    let me = await fetchMe(tokens.accessToken)

    // Access token rejected → try a refresh, then re-check with the new token.
    if (me.kind === 'unauthorized') {
      const refreshed = await refreshTokens()
      if (refreshed) me = await fetchMe(refreshed.accessToken)
    }

    if (me.kind === 'ok') {
      await saveUser(me.user)
      setUser(me.user)
    } else if (me.kind === 'network') {
      // Server unreachable — keep the session and show the cached user so the app
      // stays usable; we re-verify on the next focus/request. NEVER log out here.
      const cached = await loadCachedUser()
      setUser((prev) => prev ?? cached)
    } else {
      // unauthorized AND refresh failed → token truly invalid → sign out.
      await clearTokens()
      setUser(null)
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    hydrate()
  }, [hydrate])

  const runSignIn = React.useCallback(async () => {
    if (!config.workosClientId) {
      throw new Error('Missing WorkOS client id (app.json extra.workosClientId).')
    }

    // If the user just signed out, force WorkOS to show the login screen instead
    // of silently re-using its browser session. Consume the flag either way.
    let forceLogin = false
    try {
      forceLogin = (await SecureStore.getItemAsync(FORCE_LOGIN_KEY)) === '1'
      if (forceLogin) await SecureStore.deleteItemAsync(FORCE_LOGIN_KEY)
    } catch {}

    const request = new AuthSession.AuthRequest({
      clientId: config.workosClientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      extraParams: forceLogin
        ? { provider: 'authkit', prompt: 'login' }
        : { provider: 'authkit' },
    })

    // Build the request to generate the PKCE verifier, then persist it so the
    // redirect landing route can complete the exchange regardless of how the
    // mcloud:// deep link is delivered in this build type. Clear any stale
    // verifier from a previously abandoned attempt first, so only THIS request's
    // verifier is on disk when its code returns.
    await SecureStore.deleteItemAsync(VERIFIER_KEY)
    await request.makeAuthUrlAsync(discovery)
    if (request.codeVerifier) {
      await SecureStore.setItemAsync(VERIFIER_KEY, request.codeVerifier)
    }

    // showInRecents:false keeps the auth Custom Tab bound to THIS app's task, so the
    // OS is far less likely to reclaim the backgrounded app and cold-relaunch it via
    // the mcloud://auth deep link. The inline promptAsync result is the primary path;
    // the deep-link landing (app/auth.tsx) remains a fallback.
    const result = await request.promptAsync(discovery, { showInRecents: false })

    // Happy path: promptAsync resolved with the code (dev client). Exchange via the
    // shared claim so we never double-exchange if the deep link also fired.
    if (result.type === 'success' && result.params.code) {
      const ok = await claimAndExchange(result.params.code)
      await hydrate()
      if (!ok) {
        const tokens = await loadTokens()
        if (!tokens?.accessToken) throw new Error('Could not complete sign-in. Please try again.')
      }
      return
    }

    // Otherwise the redirect was handled as a deep link by app/auth.tsx, which
    // completes the exchange and re-hydrates. Surface a true error only.
    if (result.type === 'error') {
      throw new Error(result.error?.message ?? result.params?.error_description ?? 'Authorization failed')
    }
    // dismiss/cancel: re-check whether the deep-link path already signed us in.
    await new Promise((r) => setTimeout(r, 400)) // give the deep-link path a beat
    await hydrate()
  }, [hydrate])

  // Re-entrancy guard: repeat taps on "Sign in" while one attempt is pending
  // share that attempt instead of starting a second authorize request (which
  // would clobber the PKCE verifier → "Invalid code verifier"). See signInInFlight.
  const signIn = React.useCallback(async () => {
    if (signInInFlight) return signInInFlight
    signInInFlight = runSignIn().finally(() => {
      signInInFlight = null
    })
    return signInInFlight
  }, [runSignIn])

  const refresh = React.useCallback(() => refreshTokens(), [])

  const signOut = React.useCallback(async () => {
    await clearTokens()
    // Force the WorkOS login screen on the next sign-in (the browser still holds
    // a WorkOS session; without this the next authorize re-auths silently).
    try { await SecureStore.setItemAsync(FORCE_LOGIN_KEY, '1') } catch {}
    setUser(null)
  }, [])

  const authedFetch = React.useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      let tokens = await loadTokens()
      const url = path.startsWith('http') ? path : `${config.apiBaseUrl}${path}`

      const withAuth = (accessToken: string): RequestInit => ({
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
          ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        },
      })

      let res = await fetch(url, withAuth(tokens?.accessToken ?? ''))
      if (res.status === 401) {
        const refreshed = await refresh()
        if (refreshed) {
          res = await fetch(url, withAuth(refreshed.accessToken))
        } else {
          await signOut()
        }
      }
      return res
    },
    [refresh, signOut],
  )

  const value = React.useMemo(
    () => ({ user, loading, signIn, signOut, authedFetch, refreshSession: hydrate }),
    [user, loading, signIn, signOut, authedFetch, hydrate],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
