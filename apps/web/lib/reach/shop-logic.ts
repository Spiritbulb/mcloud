// Pure rules for Reach shoppers (Supabase customers). The routes in app/api/mobile/reach/shop/*
// and lib/reach/shopper.ts do the I/O; the decisions live here so they can be tested.
import { normalizeKenyanMobile } from '@mcloud/merchant/reach'

export interface LegacyCandidate {
    /** users.id of the WorkOS account with the same email. */
    userId: string
    platformRole: string | null
    reachRole: string | null
    /** Another shopper already claimed this account. */
    alreadyLinked: boolean
}

/**
 * Which old WorkOS buyer a new Supabase shopper takes over, or null. Only with a confirmed email
 * (an unconfirmed sign-up proves nothing about owning the address), and only a plain buyer: a
 * vendor or a platform admin is never turned into a shopper.
 */
export function decideLegacyLink(input: { emailConfirmed: boolean; candidate: LegacyCandidate | null }): string | null {
    const c = input.candidate
    if (!input.emailConfirmed || !c) return null
    if (c.alreadyLinked || c.reachRole !== 'buyer' || c.platformRole === 'admin') return null
    return c.userId
}

export type ShopperProfileInput =
    | { ok: true; name?: string; mpesaPhone?: string }
    | { ok: false; error: string }

/** PATCH shop/me body. Fields left out are left alone. */
export function validateShopperProfile(body: unknown): ShopperProfileInput {
    if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid JSON body' }
    const b = body as { name?: unknown; mpesaPhone?: unknown }
    const out: { ok: true; name?: string; mpesaPhone?: string } = { ok: true }
    if (b.name !== undefined) {
        const name = typeof b.name === 'string' ? b.name.trim() : ''
        if (name.length < 2 || name.length > 80) return { ok: false, error: 'Enter your name' }
        out.name = name
    }
    if (b.mpesaPhone !== undefined) {
        const phone = normalizeKenyanMobile(b.mpesaPhone)
        if (!phone) return { ok: false, error: 'Enter a valid M-Pesa number' }
        out.mpesaPhone = phone
    }
    return out
}

/** A shopper's orders from both sources (their customer rows and their legacy account), newest first. */
export function mergeOrderHistory<T extends { id: string; created_at: string }>(a: T[], b: T[]): T[] {
    const byId = new Map<string, T>()
    for (const o of [...a, ...b]) if (!byId.has(o.id)) byId.set(o.id, o)
    return [...byId.values()].sort((x, y) => y.created_at.localeCompare(x.created_at))
}

/**
 * Whether a Reach-store order belongs to this shopper: through their customer row in the Reach
 * store, or through the WorkOS account they were linked from (reach_payments.user_id). A null id
 * never matches anything.
 */
export function orderVisibleTo(
    order: { customer_id: string | null; legacy_user_id: string | null },
    viewer: { customerId: string | null; legacyUserId: string | null },
): boolean {
    if (viewer.customerId && order.customer_id === viewer.customerId) return true
    if (viewer.legacyUserId && order.legacy_user_id === viewer.legacyUserId) return true
    return false
}

// ---- vendors ----

/**
 * Whether a reach_vendor_members row still grants access. A key member keeps access while the key
 * is active (revoking it cuts them off). An owner-member has no key and keeps access while they
 * can still manage the store (removing them from the org cuts them off).
 */
export function membershipActive(m: { keyId: string | null; keyActive: boolean | null; hasStoreAccess: boolean }): boolean {
    return m.keyId ? m.keyActive === true : m.hasStoreAccess
}

export type SetupStep = 'create_org' | 'create_store' | 'list' | 'join'

/**
 * The steps of "create a store" in the Reach app, skipping what already exists. Each step is
 * idempotent, and so is the plan: a retry after a partial failure finishes the job instead of
 * making a second org or store.
 */
export function planOneStepSetup(s: { manageableOrg: { id: string } | null; existingStoreSlug: string | null }): SetupStep[] {
    if (!s.manageableOrg) return ['create_org', 'create_store', 'list', 'join']
    if (!s.existingStoreSlug) return ['create_store', 'list', 'join']
    return ['list', 'join']
}
