// lib/auth/types.ts
// Provider-agnostic auth shapes. Nothing here knows about Auth0 or WorkOS — the
// active provider adapter (lib/auth/providers/*) maps its native session into these.
import type { NextRequest, NextResponse } from 'next/server'

export interface AuthUser {
    /** Canonical user id — the primary key used across the DB (users.id and all FKs). */
    id: string
    email: string
    name?: string
    avatarUrl?: string | null
}

export interface AuthSession {
    user: AuthUser
}

/**
 * Result of resolving auth state inside the app's middleware. Some providers
 * (WorkOS) must run once per request to refresh the session and inject headers
 * that downstream server code reads; others (Auth0) just read the cookie.
 */
export interface MiddlewarePrep {
    /** Session resolved for in-middleware gating (e.g. /admin guards). */
    session: AuthSession | null
    /** Headers to forward on the downstream request so server reads see the session. */
    requestHeaders?: Headers
    /** Apply provider response headers (e.g. refreshed-session Set-Cookie) before returning. */
    finalize: (res: NextResponse) => NextResponse
}

/** A past login, surfaced in the account "Recent login activity" list. */
export interface LoginEvent {
    id: string
    device: string
    location: string
    lastActive: string
    current: boolean
}

/**
 * The contract every auth provider adapter implements. Swapping providers
 * (Auth0 → WorkOS) means writing one of these and flipping lib/auth/index.ts.
 */
export interface AuthProviderAdapter {
    /** Resolve the current session. `req` is passed in API routes. */
    getSession(req?: NextRequest): Promise<AuthSession | null>
    /**
     * Resolve a session from a raw provider access token (bearer), for non-cookie
     * clients like the mobile app. Returns null if the token is invalid/expired or
     * the provider doesn't support token auth.
     */
    getSessionFromToken(accessToken: string): Promise<AuthSession | null>
    /** Resolve session + middleware headers once per request (called by the app middleware). */
    prepareMiddleware(req: NextRequest): Promise<MiddlewarePrep>
    /** Handles the provider's auth routes (/auth/login, /auth/sign-up, etc). */
    middleware(req: NextRequest): Promise<NextResponse>
    /** Push profile changes to the identity provider (DB writes stay in the app). */
    updateUserProfile(id: string, data: { name?: string; avatarUrl?: string }): Promise<void>
    /** Delete the user at the identity provider. */
    deleteUser(id: string): Promise<void>
    /** Recent login history for the account activity list. */
    getLoginHistory(id: string): Promise<LoginEvent[]>
}
