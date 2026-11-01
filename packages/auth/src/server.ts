// lib/auth/server.ts
// The public auth API the app calls. Apps call these, never the provider SDK directly.
import type { NextRequest } from 'next/server'
import { createAuthApi } from './api'
import { provider } from './index'
import type { AuthUser } from './types'

const api = createAuthApi(provider)

/** Resolve the current session. Pass `req` from API routes / middleware. */
export const getSession = api.getSession

/** Resolve a session from a raw provider access token (bearer / handoff verify). */
export const getSessionFromToken = api.getSessionFromToken

/** Establish a cookie session from an existing WorkOS token pair (SSO handoff). */
export function createSessionFromTokens(
    tokens: { accessToken: string; refreshToken: string },
    req: NextRequest,
): Promise<AuthUser | null> {
    return provider.createSessionFromTokens(tokens, req)
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
export const getMobileSession = api.getMobileSession

/** Handles the provider's auth routes — mounted by the catch-all route + proxy. */
export function authMiddleware(req: NextRequest) {
    return provider.middleware(req)
}

/** Resolve session + middleware headers once per request, for the app middleware. */
export const prepareMiddleware = api.prepareMiddleware
