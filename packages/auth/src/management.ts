// lib/auth/management.ts
// Provider-agnostic account operations against the identity provider. The app's
// own DB writes (Supabase) stay in the calling server actions; these only sync
// the change to / read it from the identity provider.
import { provider } from './index'
import type { AuthUser, LoginEvent, NativeAuthTokens } from './types'
import type { NextRequest } from 'next/server'

/** Sync display name and/or avatar to the identity provider. */
export function updateUserProfile(id: string, data: { name?: string; avatarUrl?: string }): Promise<void> {
    return provider.updateUserProfile(id, data)
}

/** Delete the user at the identity provider (call after local cleanup). */
export function deleteUser(id: string): Promise<void> {
    return provider.deleteUser(id)
}

/** Recent login history for the account "Recent login activity" list. */
export function getLoginHistory(id: string): Promise<LoginEvent[]> {
    return provider.getLoginHistory(id)
}

// ── Native magic-code auth (mobile) ──────────────────────────────────────────────

/** Email a one-time sign-in code to `email` (creates the user on first use). */
export function sendMagicCode(email: string): Promise<void> {
    return provider.sendMagicCode(email)
}

/** Exchange an emailed code for tokens; null if the code is invalid/expired. */
export function verifyMagicCode(email: string, code: string): Promise<NativeAuthTokens | null> {
    return provider.verifyMagicCode(email, code)
}

/**
 * Web variant: verify an emailed code and set the auth cookie (no OAuth redirect).
 * Returns the user, or null if the code is invalid/expired.
 */
export function verifyMagicCodeWeb(email: string, code: string, req: NextRequest): Promise<AuthUser | null> {
    return provider.verifyMagicCodeWeb(email, code, req)
}
