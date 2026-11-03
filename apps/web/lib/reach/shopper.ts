/* eslint-disable @typescript-eslint/no-explicit-any -- the reach_* tables are not in the generated database types */
// The Reach shopper behind a verified Supabase token. Shoppers are not in `users` (that is WorkOS);
// they live in reach_shoppers. See migrations/20261103_reach_shoppers.sql.
import type { VerifiedCustomer } from '@mcloud/db/customer-token'
import { reachDb } from './db'
import { decideLegacyLink } from './shop-logic'

export interface Shopper {
    id: string
    authUserId: string
    email: string
    name: string | null
    mpesaNumber: string | null
    /** The WorkOS buyer this shopper took over, whose old orders are theirs too. */
    legacyUserId: string | null
}

const COLUMNS = 'id, auth_user_id, email, name, mpesa_number, legacy_user_id'

function toShopper(row: any): Shopper {
    return {
        id: row.id,
        authUserId: row.auth_user_id,
        email: row.email,
        name: row.name ?? null,
        mpesaNumber: row.mpesa_number ?? null,
        legacyUserId: row.legacy_user_id ?? null,
    }
}

/**
 * The shopper row for this Supabase user, created on first sight. On creation an old WorkOS buyer
 * with the same (confirmed) email is linked, carrying over name and M-Pesa number. A failed link
 * never blocks sign-in: the shopper just starts fresh. Returns null only if the row can't be made.
 */
export async function ensureShopper(user: VerifiedCustomer): Promise<Shopper | null> {
    const db = await reachDb()
    const { data: existing } = await db.from('reach_shoppers').select(COLUMNS).eq('auth_user_id', user.id).maybeSingle()
    if (existing) {
        // Keep the email in step with Supabase (it can be changed there).
        if (existing.email !== user.email) {
            await db.from('reach_shoppers').update({ email: user.email, updated_at: new Date().toISOString() }).eq('id', existing.id)
            existing.email = user.email
        }
        return toShopper(existing)
    }

    const legacy = await findLegacyBuyer(db, user).catch(() => null)
    const legacyUserId = decideLegacyLink({ emailConfirmed: user.emailConfirmed, candidate: legacy?.candidate ?? null })

    const row = {
        auth_user_id: user.id,
        email: user.email,
        name: legacyUserId ? legacy?.name ?? null : null,
        mpesa_number: legacyUserId ? legacy?.mpesaNumber ?? null : null,
        legacy_user_id: legacyUserId,
    }
    // ignoreDuplicates: two first requests racing both land here; the second reads the first's row.
    let { error } = await db.from('reach_shoppers').upsert(row, { onConflict: 'auth_user_id', ignoreDuplicates: true })
    if (error && legacyUserId) {
        // legacy_user_id is unique: someone linked it in the meantime. Start fresh instead.
        ;({ error } = await db
            .from('reach_shoppers')
            .upsert({ ...row, name: null, mpesa_number: null, legacy_user_id: null }, { onConflict: 'auth_user_id', ignoreDuplicates: true }))
    }
    if (error) return null
    const { data: created } = await db.from('reach_shoppers').select(COLUMNS).eq('auth_user_id', user.id).maybeSingle()
    return created ? toShopper(created) : null
}

async function findLegacyBuyer(db: any, user: VerifiedCustomer) {
    // Case-insensitive exact match: escape ilike's wildcards, or "a_b@x.com" would match "aXb@x.com".
    const exact = user.email.replace(/[\\%_]/g, (c) => `\\${c}`)
    const { data: users } = await db.from('users').select('id, role').ilike('email', exact).limit(2)
    // Two platform accounts with one email: ambiguous, link neither.
    if (!users || users.length !== 1) return null
    const u = users[0]
    const [{ data: reach }, { data: claimed }] = await Promise.all([
        db.from('reach_users').select('role, name, mpesa_number').eq('user_id', u.id).maybeSingle(),
        db.from('reach_shoppers').select('id').eq('legacy_user_id', u.id).maybeSingle(),
    ])
    return {
        candidate: { userId: u.id, platformRole: u.role ?? null, reachRole: reach?.role ?? null, alreadyLinked: !!claimed },
        name: reach?.name ?? null,
        mpesaNumber: reach?.mpesa_number ?? null,
    }
}
