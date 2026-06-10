// lib/auth/providers/workos.ts
// WorkOS (AuthKit) implementation of AuthProviderAdapter. Activated by pointing
// lib/auth/index.ts here. Provider-specific entry routes live alongside:
//   app/callback/route.ts        — handleAuth (the WorkOS redirect target)
//   app/auth/logout/route.ts     — signOut
//   app/auth/post-login/page.tsx — dynamic post-login landing (org vs onboarding)
import {
    authkit,
    withAuth,
    getSignInUrl,
    getSignUpUrl,
    getWorkOS,
    partitionAuthkitHeaders,
    applyResponseHeaders,
} from '@workos-inc/authkit-nextjs'
import { NextResponse, type NextRequest } from 'next/server'
import type { AuthProviderAdapter, AuthSession, AuthUser, LoginEvent } from '../types'
import { LOGIN_URL, SIGNUP_URL } from '../routes'
import { formatDevice, formatRelativeTime } from '../format'

const POST_LOGIN_PATH = '/auth/post-login'

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

export const workosProvider: AuthProviderAdapter = {
    async getSession(): Promise<AuthSession | null> {
        // Reads the session from the request headers that prepareMiddleware injected
        // (works in server components, actions, and API routes — all run after the
        // middleware). Never called from inside the middleware itself.
        const { user } = await withAuth()
        return user ? { user: mapUser(user) } : null
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

    async middleware(req: NextRequest) {
        const { pathname, searchParams } = req.nextUrl
        const returnTo = searchParams.get('returnTo') ?? POST_LOGIN_PATH

        if (pathname === LOGIN_URL) {
            return NextResponse.redirect(await getSignInUrl({ returnTo }))
        }
        if (pathname === SIGNUP_URL) {
            return NextResponse.redirect(await getSignUpUrl({ returnTo }))
        }
        // /auth/logout (route handler), CALLBACK_PATH, /auth/post-login: fall through.
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
}

// Real per-device session revocation is now possible via
// getWorkOS().userManagement.revokeSession({ sessionId }) — wire into the account
// UI when re-enabling the Remove button (was removed under Auth0's paywall).
