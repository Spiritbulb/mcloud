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
    validateKeyLabel,
} from '@mcloud/merchant/reach'
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
    keys: ReachKey[]
    activeKeyCount: number
    maxKeys: number
    productCount: number
}

async function loadStore(db: Db, storeId: string) {
    const { data } = await db.from('stores').select('id, name, type, is_active').eq('id', storeId).maybeSingle()
    return data as { id: string; name: string; type: string | null; is_active: boolean | null } | null
}

async function vendorOfStore(db: Db, storeId: string): Promise<{ id: string; listed: boolean } | null> {
    const { data } = await db.from('reach_vendors').select('id, listed').eq('store_id', storeId).maybeSingle()
    return data ?? null
}

/** The store's vendor row, created on first use (a store is a vendor once it does anything on Reach). */
async function ensureVendor(db: Db, store: { id: string; name: string }): Promise<{ id: string; listed: boolean } | null> {
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
        keys,
        activeKeyCount: keys.filter((k) => k.active).length,
        maxKeys: MAX_ACTIVE_STORE_KEYS,
        productCount: productCount ?? 0,
    }
}

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
        if (!vendor) return { ok: false, error: 'Could not list your store. Try again.' }
        const { error } = await db
            .from('reach_vendors')
            .update({ listed: true, listed_at: new Date().toISOString(), name: store.name })
            .eq('id', vendor.id)
        if (error) return { ok: false, error: 'Could not list your store. Try again.' }
        return { ok: true }
    }

    // Unlisting never needs a vendor row to exist, and keys keep working: staff can still see and
    // deliver orders already placed. Only the products leave the marketplace.
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
