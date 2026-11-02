// The session half of the public auth API, bound to one provider instance. Shared by
// ./server (linked provider) and ./standalone (no linking) so both expose the same
// signatures without either importing the other's provider.
import type { NextRequest } from 'next/server'
import type { AuthProviderAdapter, AuthSession, MiddlewarePrep } from './types'

export function createAuthApi(p: AuthProviderAdapter) {
    /** Resolve the current session. Pass `req` from API routes / middleware. */
    function getSession(req?: NextRequest): Promise<AuthSession | null> {
        return p.getSession(req)
    }

    /** Resolve a session from a raw provider access token (bearer / handoff verify). */
    function getSessionFromToken(accessToken: string): Promise<AuthSession | null> {
        return p.getSessionFromToken(accessToken)
    }

    /**
     * Resolve a session for non-cookie clients (the mobile app) from the
     * `Authorization: Bearer <token>` header. Returns null when the header is
     * missing or the token is invalid. Used by /api/mobile/* route handlers.
     */
    async function getMobileSession(req: NextRequest): Promise<AuthSession | null> {
        const header = req.headers.get('authorization')
        const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
        if (!token) return null
        return p.getSessionFromToken(token)
    }

    /** Resolve session + middleware headers once per request, for the app middleware. */
    function prepareMiddleware(req: NextRequest): Promise<MiddlewarePrep> {
        return p.prepareMiddleware(req)
    }

    return { getSession, getSessionFromToken, getMobileSession, prepareMiddleware }
}
