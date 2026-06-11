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

/** Fetch /api/mobile/me with a token; returns the user or null (no side effects). */
async function fetchMe(accessToken: string): Promise<SessionUser | null> {
  try {
    const res = await fetch(`${config.apiBaseUrl}/api/mobile/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { user: SessionUser }
    return data.user
  } catch {
    return null
  }
}

const redirectUri = AuthSession.makeRedirectUri({ scheme: 'mcloud', path: 'auth' })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Resolve the current user on boot/reload. The WorkOS access token is short-lived,
  // so a stale token is NORMAL after a reload — try it, and on failure refresh once
  // before giving up. Only a failed refresh (true expiry/revocation) signs the user
  // out, so reloads don't bounce you back to the login screen.
  const hydrate = React.useCallback(async () => {
    const tokens = await loadTokens()
    if (!tokens?.accessToken) {
      setUser(null)
      setLoading(false)
      return
    }

    let me = await fetchMe(tokens.accessToken)
    if (!me) {
      const refreshed = await refreshTokens()
      if (refreshed) me = await fetchMe(refreshed.accessToken)
    }

    if (me) {
      setUser(me)
    } else {
      await clearTokens()
      setUser(null)
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    hydrate()
  }, [hydrate])

  const signIn = React.useCallback(async () => {
    if (!config.workosClientId) {
      throw new Error('Missing WorkOS client id (app.json extra.workosClientId).')
    }

    const request = new AuthSession.AuthRequest({
      clientId: config.workosClientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      extraParams: { provider: 'authkit' },
    })

    // showInRecents helps the system browser hand the redirect back to this
    // pending session (rather than cold-launching the app via the deep link).
    const result = await request.promptAsync(discovery, { showInRecents: true })
    if (result.type !== 'success' || !result.params.code) {
      if (result.type === 'error') {
        throw new Error(result.error?.message ?? result.params?.error_description ?? 'Authorization failed')
      }
      return
    }

    // Exchange the authorization code for tokens (PKCE verifier included).
    try {
      const tokenRes = await AuthSession.exchangeCodeAsync(
        {
          clientId: config.workosClientId,
          code: result.params.code,
          redirectUri,
          extraParams: request.codeVerifier
            ? { code_verifier: request.codeVerifier }
            : undefined,
        },
        discovery,
      )

      const tokens: Tokens = {
        accessToken: tokenRes.accessToken,
        refreshToken: tokenRes.refreshToken,
        expiresAt: tokenRes.expiresIn
          ? Date.now() + tokenRes.expiresIn * 1000
          : undefined,
      }
      await saveTokens(tokens)
      await hydrate()
    } catch (e) {
      // Surface token-exchange failures (e.g. WorkOS rejecting the request shape)
      // instead of silently swallowing them — the home screen shows this.
      console.error('[auth] token exchange failed:', e)
      throw e instanceof Error ? e : new Error('Token exchange failed')
    }
  }, [hydrate])

  const refresh = React.useCallback(() => refreshTokens(), [])

  const signOut = React.useCallback(async () => {
    await clearTokens()
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
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
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
    () => ({ user, loading, signIn, signOut, authedFetch }),
    [user, loading, signIn, signOut, authedFetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
