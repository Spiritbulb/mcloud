// lib/auth/providers/auth0.ts
// Auth0 implementation of AuthProviderAdapter. This is the ONLY file (besides the
// client <AuthProvider>) allowed to import @auth0/*. To move to WorkOS, write a
// sibling providers/workos.ts with the same shape and flip lib/auth/index.ts.
import { Auth0Client } from '@auth0/nextjs-auth0/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { AuthProviderAdapter, AuthSession, AuthUser, LoginEvent } from '../types'
import { LOGIN_URL } from '../routes'
import { onAuthenticated } from '../callback'
import { formatDevice, formatRelativeTime } from '../format'

const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000'
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN ?? 'dev-fxs3vkboyiuzdntv.us.auth0.com'
const AUTH0_API = `https://${AUTH0_DOMAIN}`

function toURL(path: string): URL {
    try {
        return new URL(path)
    } catch {
        return new URL(path, BASE_URL)
    }
}

/** Map an Auth0 session user (sub/picture) onto our provider-agnostic AuthUser. */
function mapUser(u: { sub: string; email?: string; name?: string; picture?: string }): AuthUser {
    return {
        id: u.sub,
        email: u.email ?? '',
        name: u.name,
        avatarUrl: u.picture ?? null,
    }
}

const client = new Auth0Client({
    session: {
        cookie: {
            domain: process.env.NODE_ENV === 'production' ? 'menengai.cloud' : 'localhost',
        },
    },

    async onCallback(error, _context, session) {
        if (error) {
            return NextResponse.redirect(
                toURL(`${BASE_URL}${LOGIN_URL}?error=${encodeURIComponent(error.message)}`),
            )
        }

        if (session?.user) {
            const redirectTo = await onAuthenticated(mapUser(session.user as Parameters<typeof mapUser>[0]))
            return NextResponse.redirect(toURL(redirectTo))
        }

        return NextResponse.redirect(toURL('/'))
    },
})

// ─── Management API ──────────────────────────────────────────────────────────

async function getManagementToken(): Promise<string | null> {
    const res = await fetch(`${AUTH0_API}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            audience: `${AUTH0_API}/api/v2/`,
        }),
        next: { revalidate: 3500 },
    })
    const { access_token } = await res.json()
    return access_token ?? null
}

async function patchUser(id: string, body: Record<string, unknown>): Promise<void> {
    const token = await getManagementToken()
    if (!token) return
    await fetch(`${AUTH0_API}/api/v2/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

// ─── Login history helpers ─────────────────────────────────────────────────────

type Auth0LocationInfo = {
    city_name?: string
    country_code?: string
    country_name?: string
}

function formatLocation(loc?: Auth0LocationInfo, ip?: string): string {
    if (ip === '127.0.0.1' || ip === '::1') return 'Local'
    if (loc?.city_name && loc.country_code) return `${loc.city_name}, ${loc.country_code}`
    if (loc?.country_name) return loc.country_name
    if (loc?.country_code) return loc.country_code
    return ip ?? 'Unknown'
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export const auth0Provider: AuthProviderAdapter = {
    async getSession(req?: NextRequest): Promise<AuthSession | null> {
        const session = req ? await client.getSession(req) : await client.getSession()
        if (!session?.user) return null
        return { user: mapUser(session.user as Parameters<typeof mapUser>[0]) }
    },

    // Auth0 is the legacy provider; mobile bearer-token auth is WorkOS-only.
    async getSessionFromToken(): Promise<AuthSession | null> {
        return null
    },

    middleware(req: NextRequest) {
        return client.middleware(req)
    },

    async prepareMiddleware(req: NextRequest) {
        // Auth0 reads its session straight from the cookie — no header injection needed.
        const session = await client.getSession(req)
        return {
            session: session?.user
                ? { user: mapUser(session.user as Parameters<typeof mapUser>[0]) }
                : null,
            finalize: (res: NextResponse) => res,
        }
    },

    async updateUserProfile(id, data) {
        const body: Record<string, unknown> = {}
        if (data.name !== undefined) body.name = data.name
        if (data.avatarUrl !== undefined) body.picture = data.avatarUrl
        if (Object.keys(body).length === 0) return
        await patchUser(id, body)
    },

    async deleteUser(id) {
        const token = await getManagementToken()
        if (!token) return
        await fetch(`${AUTH0_API}/api/v2/users/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        })
    },

    async getLoginHistory(id): Promise<LoginEvent[]> {
        const token = await getManagementToken()
        if (!token) return []

        const res = await fetch(
            `${AUTH0_API}/api/v2/users/${encodeURIComponent(id)}/logs?per_page=20&sort=date%3A-1`,
            { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } },
        )
        if (!res.ok) return []

        const logs: Array<{
            log_id: string
            type: string
            user_agent?: string
            location_info?: Auth0LocationInfo
            ip?: string
            date?: string
        }> = await res.json()

        const loginEvents = logs.filter((l) => l.type === 's' || l.type === 'slo')

        const seen = new Set<string>()
        const unique = loginEvents.filter((l) => {
            const key = l.user_agent ?? 'unknown'
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        return unique.map((l, i) => ({
            id: l.log_id,
            device: formatDevice(l.user_agent ?? ''),
            // Auth0 geolocates the login IP in location_info, so no external IP lookup.
            location: formatLocation(l.location_info, l.ip),
            lastActive: formatRelativeTime(l.date),
            current: i === 0,
        }))
    },

    // Native magic-code auth is a WorkOS-only flow (the mobile migration). Auth0 is
    // the dormant provider; it never serves the mobile app, so these are not
    // implemented. Throwing keeps the adapter contract honest if ever reactivated.
    async sendMagicCode() {
        throw new Error('Magic-code auth is not supported by the Auth0 provider.')
    },
    async verifyMagicCode() {
        throw new Error('Magic-code auth is not supported by the Auth0 provider.')
    },
}

// Real per-device session revocation requires Auth0's Sessions API (paywalled —
// returns 403 feature_not_enabled on free). getLoginHistory is read-only history.
// Real revoke lands with the WorkOS migration (Phase 2).
