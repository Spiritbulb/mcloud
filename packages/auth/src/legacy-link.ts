// Legacy Auth0 account linking. Imported only by ./index (web, storefront): it
// reaches @mcloud/db, which standalone apps must never bundle.
import { getWorkOS } from '@workos-inc/authkit-nextjs'
import type { Linker } from './providers/workos-logic'

// Users with no legacy Auth0 row (everyone created after the WorkOS move) have no
// externalId, so without this the lookup below re-ran on EVERY session read: a DB
// round trip per layout/page/API call. Remember "nothing to link" per instance.
const NO_LEGACY_ROW_TTL_MS = 60 * 60 * 1000
const noLegacyRow = new Map<string, number>()

/**
 * Phase 2b auto-link: if a WorkOS user has no externalId, look up the original
 * Auth0 identity (`auth0|...` users row with the same email) and set the WorkOS
 * externalId to it, so all existing org/store memberships keyed on the Auth0 sub
 * resolve. Idempotent — once linked, externalId is non-null and this no-ops. Runs
 * lazily at session resolution (covers both web callback and mobile token auth).
 * Returns the user with externalId populated when a link was made.
 */
export const ensureLinked: Linker = async (u) => {
    if (u.externalId) return u // already linked
    const checkedUntil = noLegacyRow.get(u.id)
    if (checkedUntil && checkedUntil > Date.now()) return u
    try {
        const { createClient } = await import('@mcloud/db/server')
        const supabase = await createClient()
        // Oldest legacy row wins; limit(1) rather than maybeSingle() so an email that somehow
        // has two auth0| rows links to one of them instead of erroring. Both spellings are
        // tried because the legacy rows were written by Auth0, not by us.
        const emails = [...new Set([u.email, u.email.toLowerCase()])]
        const { data: rows, error } = await supabase
            .from('users')
            .select('id')
            .in('email', emails)
            .like('id', 'auth0|%')
            .order('created_at', { ascending: true })
            .limit(1)
        if (error) throw error

        const auth0Id = rows?.[0]?.id
        if (!auth0Id) {
            noLegacyRow.set(u.id, Date.now() + NO_LEGACY_ROW_TTL_MS)
            return u // brand-new user, nothing to link
        }

        await getWorkOS().userManagement.updateUser({ userId: u.id, externalId: auth0Id })
        return { ...u, externalId: auth0Id }
    } catch (err) {
        // Never block login on a linking failure. But do not pretend the user is fine: flag it
        // so ensureUserRow does not mirror the raw WorkOS id into `users` (that is what created
        // the duplicate 'customer' rows next to the real auth0| row), and say so in the logs.
        console.error('[auth] ensureLinked failed; session continues unlinked', err)
        return { ...u, linkFailed: true }
    }
}
