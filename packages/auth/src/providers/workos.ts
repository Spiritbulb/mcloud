// lib/auth/providers/workos.ts
// WorkOS (AuthKit) implementation of AuthProviderAdapter. Activated by pointing
// lib/auth/index.ts here. Provider-specific entry routes live alongside:
//   app/callback/route.ts        — handleAuth (the WorkOS redirect target)
//   app/auth/logout/route.ts     — signOut
//   app/auth/post-login/page.tsx — dynamic post-login landing (org vs onboarding)
import {
    authkit,
    withAuth,
    getWorkOS,
    partitionAuthkitHeaders,
    applyResponseHeaders,
    saveSession,
} from '@workos-inc/authkit-nextjs'
import { NextResponse, type NextRequest } from 'next/server'
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
import type { AuthProviderAdapter, AuthSession, AuthUser, LoginEvent, NativeAuthTokens } from '../types'
import { formatDevice, formatRelativeTime } from '../format'

// ── Bearer-token verification (mobile) ────────────────────────────────────────
// WorkOS access tokens are JWTs signed by the AuthKit JWKS for this client. We
// verify the signature against the remote JWKS (cached by jose across calls) and
// read `sub` (the WorkOS user id), then load the full user so mapUser()'s
// externalId-based identity continuity applies exactly as for the cookie session.
const jwks = createRemoteJWKSet(
    new URL(`https://api.workos.com/sso/jwks/${process.env.WORKOS_CLIENT_ID}`),
)

// ── Mobile session cache ───────────────────────────────────────────────────────
// getUser() is a live WorkOS API call — caching by `sub` eliminates it for all
// repeat requests within a session. TTL matches a typical access token lifetime;
// entries are evicted on expiry rather than on every request.
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
type CachedSession = { session: AuthSession; expiresAt: number }
const sessionCache = new Map<string, CachedSession>()

// Structural shape of the WorkOS user fields we consume. Typed locally (rather than
// importing @workos-inc/node's User) because AuthKit bundles its own SDK version,
// and `name` only exists on newer versions — so we read it optionally.
type WorkOSUserish = {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
    name?: string | null
    profilePictureUrl?: string | null
    externalId?: string | null
}

/**
 * Map a WorkOS user onto our provider-agnostic AuthUser.
 *
 * IDENTITY CONTINUITY SEAM (Phase 2b — decided live): existing DB rows key on the
 * Auth0 `sub` (`auth0|...`). We prefer the WorkOS `externalId` as the canonical id
 * so that, once existing users are linked (their WorkOS externalId set to their
 * `auth0|...` id), `AuthUser.id` keeps matching all existing FKs. Brand-new users
 * have no externalId and are born with the WorkOS id as canonical.
 */
function mapUser(u: WorkOSUserish): AuthUser {
    const fullName = u.name ?? [u.firstName, u.lastName].filter(Boolean).join(' ')
    return {
        id: u.externalId ?? u.id,
        email: u.email,
        name: fullName || undefined,
        avatarUrl: u.profilePictureUrl ?? null,
    }
}

/**
 * Resolve our canonical AuthUser.id back to a WorkOS user id for Management API
 * calls. When the canonical id already is a WorkOS id (`user_...`) it's a no-op.
 * Legacy `auth0|...` ids can't be acted on until they're linked (Phase 2b); we
 * skip rather than error so account ops degrade gracefully.
 */
function toWorkOSId(id: string): string | null {
    return id.startsWith('user_') ? id : null
}

/**
 * Phase 2b auto-link: if a WorkOS user has no externalId, look up the original
 * Auth0 identity (`auth0|...` users row with the same email) and set the WorkOS
 * externalId to it, so all existing org/store memberships keyed on the Auth0 sub
 * resolve. Idempotent — once linked, externalId is non-null and this no-ops. Runs
 * lazily at session resolution (covers both web callback and mobile token auth).
 * Returns the user with externalId populated when a link was made.
 */
async function ensureLinked(u: WorkOSUserish): Promise<WorkOSUserish> {
    if (u.externalId) return u // already linked
    try {
        const { createClient } = await import('@mcloud/db/server')
        const supabase = await createClient()
        const { data: auth0Row } = await supabase
            .from('users')
            .select('id')
            .eq('email', u.email)
            .like('id', 'auth0|%')
            .maybeSingle()

        const auth0Id = auth0Row?.id
        if (!auth0Id) return u // brand-new user, nothing to link

        await getWorkOS().userManagement.updateUser({ userId: u.id, externalId: auth0Id })
        return { ...u, externalId: auth0Id }
    } catch {
        // Never block login on a linking failure — fall back to the WorkOS id.
        return u
    }
}

export const workosProvider: AuthProviderAdapter = {
    async getSession(): Promise<AuthSession | null> {
        // Reads the session from the request headers that prepareMiddleware injected
        // (works in server components, actions, and API routes — all run after the
        // middleware). Never called from inside the middleware itself.
        const { user } = await withAuth()
        if (!user) return null
        // Phase 2b auto-link. withAuth()'s user already carries externalId once set,
        // so ensureLinked no-ops after the first link (no per-request write).
        const linked = await ensureLinked(user as WorkOSUserish)
        return { user: mapUser(linked) }
    },

    async getSessionFromToken(accessToken: string): Promise<AuthSession | null> {
        try {
            const { payload } = await jwtVerify(accessToken, jwks)
            const sub = typeof payload.sub === 'string' ? payload.sub : null
            if (!sub) return null

            const cached = sessionCache.get(sub)
            if (cached && cached.expiresAt > Date.now()) return cached.session

            // Load the full user so externalId (identity continuity) is available.
            let user = (await getWorkOS().userManagement.getUser(sub)) as WorkOSUserish
            if (!user) return null
            user = await ensureLinked(user) // Phase 2b auto-link (idempotent)
            const session: AuthSession = { user: mapUser(user) }
            sessionCache.set(sub, { session, expiresAt: Date.now() + SESSION_CACHE_TTL_MS })
            return session
        } catch {
            // Invalid signature, expired, wrong issuer, or user lookup failed.
            return null
        }
    },

    async prepareMiddleware(req: NextRequest) {
        // One authkit() pass per request: refreshes the session and yields the
        // headers AuthKit needs. Request headers are forwarded downstream so
        // withAuth() works; response headers carry any refreshed-session cookie.
        const { session, headers } = await authkit(req)
        const { requestHeaders, responseHeaders } = partitionAuthkitHeaders(req, headers)
        return {
            session: session.user ? { user: mapUser(session.user) } : null,
            requestHeaders,
            finalize: (res: NextResponse) => applyResponseHeaders(res, responseHeaders),
        }
    },

    async middleware(_req: NextRequest) {
        // Magic-code login renders in-app (apps/web /auth/login, /auth/sign-up post to
        // /api/auth/*). There's no longer an OAuth redirect for these routes; let them
        // render. /auth/logout, /callback, /auth/post-login also fall through.
        return NextResponse.next()
    },

    async updateUserProfile(id, data) {
        const workosId = toWorkOSId(id)
        if (!workosId) return
        // profilePictureUrl is not settable via the WorkOS API — the avatar lives
        // in our DB/storage and is displayed from there. Only sync the name, split
        // into first/last (the field shape AuthKit's bundled SDK accepts).
        if (data.name === undefined) return
        const [firstName, ...rest] = data.name.trim().split(/\s+/)
        await getWorkOS().userManagement.updateUser({
            userId: workosId,
            firstName,
            lastName: rest.join(' ') || undefined,
        })
    },

    async deleteUser(id) {
        const workosId = toWorkOSId(id)
        if (!workosId) return
        await getWorkOS().userManagement.deleteUser(workosId)
    },

    async getLoginHistory(id): Promise<LoginEvent[]> {
        const workosId = toWorkOSId(id)
        if (!workosId) return []

        const { data: sessions } = await getWorkOS().userManagement.listSessions(workosId, {
            limit: 20,
        })

        return sessions.map((s, i) => ({
            id: s.id,
            device: formatDevice(s.userAgent ?? ''),
            // WorkOS sessions carry the IP but no resolved geo; show the IP.
            location: s.ipAddress ?? 'Unknown',
            lastActive: formatRelativeTime(s.createdAt),
            current: i === 0,
        }))
    },

    // ── Native magic-code auth (mobile) ──────────────────────────────────────────
    // WorkOS Magic Auth: createMagicAuth emails a one-time code; the same flow
    // creates the user on first use, so it covers sign-in AND sign-up. No browser,
    // no OAuth redirect — the mobile app POSTs to our /api/mobile/auth/* routes,
    // which call these server-side with the WORKOS_API_KEY.

    async sendMagicCode(email: string): Promise<void> {
        // Idempotent per email from WorkOS's side; emails the 6-digit code.
        await getWorkOS().userManagement.createMagicAuth({ email })
    },

    async verifyMagicCodeWeb(email: string, code: string, req: NextRequest): Promise<AuthUser | null> {
        try {
            const res = await getWorkOS().userManagement.authenticateWithMagicAuth({
                clientId: process.env.WORKOS_CLIENT_ID,
                email,
                code,
            })
            const user = await ensureLinked(res.user as WorkOSUserish)
            // Seal the WorkOS session into the authkit cookie. saveSession accepts the
            // Session shape ({ accessToken, refreshToken, user }); pass the RAW WorkOS
            // user (res.user) so the cookie's encoded user matches what withAuth()
            // expects, while we return the MAPPED user to the app.
            await saveSession(
                { accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user },
                req,
            )
            return mapUser(user)
        } catch {
            return null
        }
    },

    async verifyMagicCode(email: string, code: string): Promise<NativeAuthTokens | null> {
        try {
            const res = await getWorkOS().userManagement.authenticateWithMagicAuth({
                clientId: process.env.WORKOS_CLIENT_ID,
                email,
                code,
            })
            // Phase 2b auto-link (idempotent) so externalId-based identity continuity
            // applies exactly as in the cookie/bearer paths.
            const user = await ensureLinked(res.user as WorkOSUserish)
            // The access token is a JWT; derive its lifetime from `exp` so the app's
            // proactive-refresh keeps working without a separate expiresIn field
            // (authenticateWithMagicAuth doesn't return one).
            const exp = decodeJwt(res.accessToken).exp
            const expiresIn = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 0
            return {
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
                expiresIn,
                user: mapUser(user),
            }
        } catch {
            // Invalid/expired code, or WorkOS rejected the request.
            return null
        }
    },
}

// Real per-device session revocation is now possible via
// getWorkOS().userManagement.revokeSession({ sessionId }) — wire into the account
// UI when re-enabling the Remove button (was removed under Auth0's paywall).
