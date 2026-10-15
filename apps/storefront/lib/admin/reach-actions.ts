'use server'
/* eslint-disable @typescript-eslint/no-explicit-any -- the reach_* tables are not in the generated database types */
// Reach marketplace controls for the store dashboard: list the store, and issue / revoke the store
// keys people use to get into the Reach mobile app as this store's vendor. Every action
// authorizes the caller against the store (see ./access) and scopes each query by that store's
// vendor row, so a manager of one store can never read or revoke another store's keys.
import { createClient } from '@mcloud/db/server'
import {
    MAX_ACTIVE_STORE_KEYS,
    canListOnReach,
    generateStoreKey,
    normalizeKenyanMobile,
    validateKeyLabel,
} from '@mcloud/merchant/reach'
import { MAX_VENDOR_AREAS, type Area } from '@mcloud/merchant/reach-areas'
import { ownerRequestListing, type ApprovalStatus } from '@mcloud/merchant/reach-approval'
import { sendPushToUsers } from '@/lib/merchant/send-push'
import { requireManagedStore, type ActionResult } from './access'

type Db = any

export interface ReachKey {
    id: string
    key: string
    label: string
    active: boolean
    created_at: string
    revoked_at: string | null
    /** People who joined the app with this key. */
    members: { name: string | null; email: string | null; joined_at: string }[]
}

export interface ReachStatus {
    /** null when the store may be listed, otherwise why not. */
    blocked: string | null
    listed: boolean
    /** Reach's decision. Buyers only see the store once this is 'approved' (and `listed`). */
    approvalStatus: ApprovalStatus
    reviewNote: string | null
    areaId: string | null
    /** Other areas it delivers to (the home area is not repeated here). */
    extraAreaIds: string[]
    payoutPhone: string | null
    /** Every active area, for the pickers. */
    areas: Area[]
    keys: ReachKey[]
    activeKeyCount: number
    maxKeys: number
    productCount: number
}

async function loadStore(db: Db, storeId: string) {
    const { data } = await db.from('stores').select('id, name, type, is_active').eq('id', storeId).maybeSingle()
    return data as { id: string; name: string; type: string | null; is_active: boolean | null } | null
}

interface VendorRow {
    id: string
    listed: boolean
    approval_status: ApprovalStatus
    review_note: string | null
    area_id: string | null
    payout_phone: string | null
}

async function vendorOfStore(db: Db, storeId: string): Promise<VendorRow | null> {
    const { data } = await db
        .from('reach_vendors')
        .select('id, listed, approval_status, review_note, area_id, payout_phone')
        .eq('store_id', storeId)
        .maybeSingle()
    return data ?? null
}

/** The store's vendor row, created on first use (a store is a vendor once it does anything on Reach). */
async function ensureVendor(db: Db, store: { id: string; name: string }): Promise<VendorRow | null> {
    const existing = await vendorOfStore(db, store.id)
    if (existing) return existing
    const { error } = await db.from('reach_vendors').insert({ name: store.name, store_id: store.id })
    // A concurrent call may have created it (unique on store_id), so read back either way.
    if (error && error.code !== '23505') return null
    return vendorOfStore(db, store.id)
}

export async function getReachStatus(storeId: string): Promise<({ ok: true } & ReachStatus) | { ok: false; error: string }> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const db: Db = await createClient()

    const store = await loadStore(db, gate.storeId)
    if (!store) return { ok: false, error: 'Store not found' }
    const check = canListOnReach(store)

    const { count: productCount } = await db
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', gate.storeId)
        .eq('is_active', true)

    const vendor = await vendorOfStore(db, gate.storeId)
    const { data: areaRows } = await db
        .from('reach_areas')
        .select('id, parent_id, name, slug, lat, lng, active')
        .eq('active', true)
        .order('sort')
        .order('name')
    let extraAreaIds: string[] = []
    if (vendor) {
        const { data: extra } = await db.from('reach_vendor_areas').select('area_id').eq('vendor_id', vendor.id)
        extraAreaIds = (extra ?? []).map((r: { area_id: string }) => r.area_id)
    }
    let keys: ReachKey[] = []
    if (vendor) {
        const { data, error } = await db
            .from('reach_courier_keys')
            .select('id, key, label, active, created_at, revoked_at, reach_vendor_members(created_at, users(name, email))')
            .eq('vendor_id', vendor.id)
            .order('created_at', { ascending: false })
            .limit(100)
        if (error) return { ok: false, error: 'Could not load store keys' }
        keys = (data ?? []).map((k: any) => ({
            id: k.id,
            key: k.key,
            label: k.label,
            active: k.active,
            created_at: k.created_at,
            revoked_at: k.revoked_at,
            members: (k.reach_vendor_members ?? []).map((m: any) => ({
                name: m.users?.name ?? null,
                email: m.users?.email ?? null,
                joined_at: m.created_at,
            })),
        }))
    }

    return {
        ok: true,
        blocked: check.ok ? null : check.error,
        listed: !!vendor?.listed,
        approvalStatus: vendor?.approval_status ?? 'draft',
        reviewNote: vendor?.review_note ?? null,
        areaId: vendor?.area_id ?? null,
        extraAreaIds,
        payoutPhone: vendor?.payout_phone ?? null,
        areas: areaRows ?? [],
        keys,
        activeKeyCount: keys.filter((k) => k.active).length,
        maxKeys: MAX_ACTIVE_STORE_KEYS,
        productCount: productCount ?? 0,
    }
}

/**
 * Where the store delivers from and to, and where Reach sends its money. Changing the home area of a
 * store that is already approved sends it back for review: approval was for that place.
 */
export async function saveReachLocation(
    storeId: string,
    input: { areaId: unknown; extraAreaIds: unknown; payoutPhone: unknown },
): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const db: Db = await createClient()

    const store = await loadStore(db, gate.storeId)
    if (!store) return { ok: false, error: 'Store not found' }
    const check = canListOnReach(store)
    if (!check.ok) return check

    const areaId = typeof input.areaId === 'string' ? input.areaId : ''
    const extra = Array.isArray(input.extraAreaIds) ? [...new Set(input.extraAreaIds.filter((x): x is string => typeof x === 'string'))] : []
    if (!areaId) return { ok: false, error: 'Choose the area your store delivers from.' }
    if (extra.length > MAX_VENDOR_AREAS) return { ok: false, error: `Pick at most ${MAX_VENDOR_AREAS} other areas.` }
    const phone = input.payoutPhone === '' || input.payoutPhone == null ? null : normalizeKenyanMobile(input.payoutPhone)
    if (input.payoutPhone && !phone) return { ok: false, error: 'Enter a valid M-Pesa number, like 0712 345 678.' }

    const wanted = [areaId, ...extra.filter((id) => id !== areaId)]
    const { data: found } = await db.from('reach_areas').select('id').in('id', wanted).eq('active', true)
    if ((found ?? []).length !== wanted.length) return { ok: false, error: 'One of those areas is not available.' }

    const vendor = await ensureVendor(db, store)
    if (!vendor) return { ok: false, error: 'Could not save. Try again.' }

    const movedHome = vendor.area_id !== areaId
    const patch: Record<string, unknown> = { area_id: areaId, payout_phone: phone, name: store.name }
    if (movedHome && vendor.approval_status === 'approved') {
        patch.approval_status = 'pending'
        patch.requested_at = new Date().toISOString()
        patch.review_note = null
    }
    const { error } = await db.from('reach_vendors').update(patch).eq('id', vendor.id)
    if (error) return { ok: false, error: 'Could not save. Try again.' }

    // Replace the delivery list (small: capped above).
    await db.from('reach_vendor_areas').delete().eq('vendor_id', vendor.id)
    if (extra.length) {
        const rows = extra.filter((id) => id !== areaId).map((area_id) => ({ vendor_id: vendor.id, area_id }))
        if (rows.length) await db.from('reach_vendor_areas').insert(rows)
    }
    return { ok: true }
}

/** "List my store" is a request. Reach approves it before shoppers see anything. */
export async function setReachListed(storeId: string, listed: boolean): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    if (typeof listed !== 'boolean') return { ok: false, error: 'Invalid request' }
    const db: Db = await createClient()

    const store = await loadStore(db, gate.storeId)
    if (!store) return { ok: false, error: 'Store not found' }

    if (listed) {
        const check = canListOnReach(store)
        if (!check.ok) return check
        const vendor = await ensureVendor(db, store)
        if (!vendor) return { ok: false, error: 'Could not send your request. Try again.' }

        const next = ownerRequestListing(vendor)
        if (!next.ok) return next
        const asking = next.status === 'pending' && vendor.approval_status !== 'pending'
        const { error } = await db
            .from('reach_vendors')
            .update({
                listed: true,
                listed_at: new Date().toISOString(),
                name: store.name,
                approval_status: next.status,
                ...(asking ? { requested_at: new Date().toISOString(), review_note: null } : {}),
            })
            .eq('id', vendor.id)
        if (error) return { ok: false, error: 'Could not send your request. Try again.' }

        if (asking) {
            // Tell the Reach admins there is something to review. Best effort.
            try {
                const { data: admins } = await db.from('users').select('id').eq('role', 'admin')
                await sendPushToUsers((admins ?? []).map((u: { id: string }) => u.id), {
                    title: 'New store to review',
                    body: `${store.name} asked to be listed on Reach.`,
                    data: { type: 'review' },
                })
            } catch {
                // never fail the owner's request over a notification
            }
        }
        return { ok: true }
    }

    // Unlisting never needs a vendor row to exist, and keys keep working: staff can still see and
    // deliver orders already placed. Only the products leave the marketplace. Approval is kept, so
    // listing again does not need a second review.
    const vendor = await vendorOfStore(db, gate.storeId)
    if (!vendor) return { ok: true }
    const { error } = await db.from('reach_vendors').update({ listed: false }).eq('id', vendor.id)
    if (error) return { ok: false, error: 'Could not remove your store from Reach. Try again.' }
    return { ok: true }
}

export async function createStoreKey(storeId: string, label: unknown): Promise<ActionResult<{ key: string }>> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    const parsed = validateKeyLabel(label)
    if (!parsed.ok) return parsed
    const db: Db = await createClient()

    const store = await loadStore(db, gate.storeId)
    if (!store) return { ok: false, error: 'Store not found' }
    const check = canListOnReach(store)
    if (!check.ok) return check

    const vendor = await ensureVendor(db, store)
    if (!vendor) return { ok: false, error: 'Could not create a key. Try again.' }

    const { count } = await db
        .from('reach_courier_keys')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .eq('active', true)
    if ((count ?? 0) >= MAX_ACTIVE_STORE_KEYS) {
        return { ok: false, error: `You can have ${MAX_ACTIVE_STORE_KEYS} active keys. Revoke one you no longer use first.` }
    }

    // The key column is unique, so a (very unlikely) collision is retried rather than reported.
    for (let attempt = 0; attempt < 3; attempt++) {
        const key = generateStoreKey()
        const { error } = await db
            .from('reach_courier_keys')
            .insert({ key, label: parsed.label, vendor_id: vendor.id, created_by: gate.userId })
        if (!error) return { ok: true, key }
        if (error.code !== '23505') break
    }
    return { ok: false, error: 'Could not create a key. Try again.' }
}

export async function revokeStoreKey(storeId: string, keyId: unknown): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    if (typeof keyId !== 'string' || !keyId) return { ok: false, error: 'Missing key' }
    const db: Db = await createClient()

    const vendor = await vendorOfStore(db, gate.storeId)
    if (!vendor) return { ok: false, error: 'Key not found' }

    // Scoped by vendor_id: a key id from another store matches nothing.
    const { data, error } = await db
        .from('reach_courier_keys')
        .update({ active: false, revoked_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('vendor_id', vendor.id)
        .eq('active', true)
        .select('id')
    if (error) return { ok: false, error: 'Could not revoke the key. Try again.' }
    if (!data?.length) return { ok: false, error: 'Key not found or already revoked' }
    return { ok: true }
}
