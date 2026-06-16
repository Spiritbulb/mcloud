// lib/auth/callback.ts
// Provider-agnostic post-authentication logic: mirror the identity into our
// `users` table and decide where the freshly-authenticated user lands. Called by
// the active provider adapter's callback hook (was lib/auth0.ts#onCallback).
import { createClient } from '@mcloud/db/server'
import type { AuthUser } from './types'

/**
 * Mirror the authenticated identity into our `users` table. Idempotent.
 *
 * This MUST run before any write that FKs to `users.id` (org/store creation).
 * The web callback runs it via onAuthenticated(); the mobile flow has no callback
 * — it authenticates by bearer token — so the mobile API layer calls this directly
 * on each request. Without it, a brand-new user who signs up on mobile has no
 * `users` row, and their first createOrg() fails the owner_id/user_id FK.
 */
export async function ensureUserRow(user: AuthUser): Promise<void> {
    const supabase = await createClient()
    await supabase.from('users').upsert(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatarUrl,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
    )
}

/**
 * Upsert the user row and return the path to redirect to after login:
 * their first org if they belong to one, otherwise onboarding.
 */
export async function onAuthenticated(user: AuthUser): Promise<string> {
    const supabase = await createClient()

    await ensureUserRow(user)

    const { data: firstOrg } = await supabase
        .from('org_members')
        .select('org:orgs(slug)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    const orgSlug = firstOrg ? (firstOrg.org as { slug?: string } | null)?.slug : null
    return orgSlug ? `/org/${orgSlug}` : '/onboarding'
}
