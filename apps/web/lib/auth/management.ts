// lib/auth/management.ts
// Provider-agnostic account operations against the identity provider. The app's
// own DB writes (Supabase) stay in the calling server actions; these only sync
// the change to / read it from the identity provider.
import { provider } from './index'
import type { LoginEvent } from './types'

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
