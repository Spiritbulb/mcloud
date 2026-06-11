// lib/auth/server.ts
// The public auth API the app calls. Replaces direct `auth0.getSession()` usage.
import type { NextRequest } from 'next/server'
import { provider } from './index'
import type { AuthSession, AuthUser, MiddlewarePrep } from './types'

/** Resolve the current session. Pass `req` from API routes / middleware. */
export function getSession(req?: NextRequest): Promise<AuthSession | null> {
    return provider.getSession(req)
}

/** Current user, or null. Convenience over getSession(). */
export async function getCurrentUser(req?: NextRequest): Promise<AuthUser | null> {
    const session = await provider.getSession(req)
    return session?.user ?? null
}

/**
 * Resolve a session for non-cookie clients (the mobile app) from the
 * `Authorization: Bearer <token>` header. Returns null when the header is
 * missing or the token is invalid. Used by /api/mobile/* route handlers.
 */
export async function getMobileSession(req: NextRequest): Promise<AuthSession | null> {
    const header = req.headers.get('authorization')
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
    if (!token) return null
    return provider.getSessionFromToken(token)
}

/** Handles the provider's auth routes — mounted by the catch-all route + proxy. */
export function authMiddleware(req: NextRequest) {
    return provider.middleware(req)
}

/** Resolve session + middleware headers once per request, for the app middleware. */
export function prepareMiddleware(req: NextRequest): Promise<MiddlewarePrep> {
    return provider.prepareMiddleware(req)
}
