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
