// Data loaders for the Logistics settings tab (delivery options + zones) and
// the Tracking tab (orders that carry a tracking number). Mirrors the
// membership → store_id resolution used by getStoreSettingsData /
// getStoreOverview, since these run inside the same settings shell.

import { createClient } from '@mcloud/db/server'
import type { StoreSettingsResult } from './store-data'

async function resolveStoreId(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    slug: string,
    orgSlug: string
): Promise<{ storeId: string } | { error: 'forbidden' | 'not_found' | 'wrong_org'; correctOrgSlug?: string }> {
    const { data: memberships } = await supabase
        .from('store_members')
        .select('store_id, store:stores(slug, org:orgs(slug))')
        .eq('user_id', userId)

    if (!memberships?.length) return { error: 'forbidden' }

    const bySlug = memberships.find((m) => {
        const s = Array.isArray(m.store) ? m.store[0] : m.store
        return s?.slug === slug
    })
    if (!bySlug?.store_id) return { error: 'not_found' }

    const matchedStore = Array.isArray(bySlug.store) ? bySlug.store[0] : bySlug.store
    const matchedOrg = Array.isArray(matchedStore?.org) ? matchedStore.org[0] : matchedStore?.org
    if (matchedOrg?.slug && matchedOrg.slug !== orgSlug) {
        return { error: 'wrong_org', correctOrgSlug: matchedOrg.slug }
    }

    return { storeId: bySlug.store_id }
}

// ── Logistics settings (delivery options + zones config) ───────────────────

export type DeliveryOption = {
    id: string
    courier_name: string
    is_active: boolean
    notes: string | null
    tracking_url_template: string | null
}

export type DeliveryZone = {
    id: string
    location_name: string
    rate: number | null
    available: boolean
}

export async function getDeliverySettings(
    userId: string,
    slug: string,
    orgSlug: string
): Promise<StoreSettingsResult> {
    const supabase = await createClient()
    const resolved = await resolveStoreId(supabase, userId, slug, orgSlug)
    if ('error' in resolved) {
        if (resolved.error === 'wrong_org') {
            return { error: 'wrong_org', data: null, correctOrgSlug: resolved.correctOrgSlug! }
        }
        return { error: resolved.error, data: null }
    }

    const [{ data: options }, { data: zones }] = await Promise.all([
        supabase
            .from('delivery_options')
            .select('id, courier_name, is_active, notes, tracking_url_template')
            .eq('store_id', resolved.storeId)
            .order('created_at', { ascending: true }),
        supabase
            .from('delivery_zones')
            .select('id, location_name, rate, available')
            .eq('store_id', resolved.storeId)
            .order('created_at', { ascending: true }),
    ])

    return {
        error: null,
        data: {
            store_id: resolved.storeId,
            options: options ?? [],
            zones: zones ?? [],
        },
    }
}

export async function upsertDeliveryOption(
    storeId: string,
    option: Partial<Omit<DeliveryOption, 'courier_name'>> & { id?: string; courier_name: string }
) {
    const supabase = await createClient()
    const { id, ...rest } = option
    const { data, error } = await supabase
        .from('delivery_options')
        .upsert(id ? { id, store_id: storeId, ...rest } : { store_id: storeId, ...rest })
        .select()
        .single()
    return { data, error }
}

export async function deleteDeliveryOption(storeId: string, id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('delivery_options')
        .delete()
        .eq('id', id)
        .eq('store_id', storeId)
    return { error }
}

export async function upsertDeliveryZone(
    storeId: string,
    zone: Partial<Omit<DeliveryZone, 'location_name'>> & { id?: string; location_name: string }
) {
    const supabase = await createClient()
    const { id, ...rest } = zone
    const { data, error } = await supabase
        .from('delivery_zones')
        .upsert(id ? { id, store_id: storeId, ...rest } : { store_id: storeId, ...rest })
        .select()
        .single()
    return { data, error }
}

export async function deleteDeliveryZone(storeId: string, id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id)
        .eq('store_id', storeId)
    return { error }
}

// ── Tracking (orders with a tracking number / delivery info) ────────────────

export type TrackedOrder = {
    id: string
    order_number: string | number
    customer_name: string
    status: string
    tracking_number: string | null
    created_at: string
    delivery_option: { id: string; courier_name: string; tracking_url_template: string | null } | null
    delivery_zone: { id: string; location_name: string } | null
}

export async function getTrackingOrders(
    userId: string,
    slug: string,
    orgSlug: string
): Promise<StoreSettingsResult> {
    const supabase = await createClient()
    const resolved = await resolveStoreId(supabase, userId, slug, orgSlug)
    if ('error' in resolved) {
        if (resolved.error === 'wrong_org') {
            return { error: 'wrong_org', data: null, correctOrgSlug: resolved.correctOrgSlug! }
        }
        return { error: resolved.error, data: null }
    }

    // Orders relevant to delivery: has a delivery option/zone attached, or
    // already carries a tracking number. Not every order needs shipping
    // (e.g. digital/services), so we don't just list all orders here.
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id, order_number, customer_email, customer_phone, status, tracking_number, created_at,
            delivery_option:delivery_options ( id, courier_name, tracking_url_template ),
            delivery_zone:delivery_zones ( id, location_name )
        `)
        .eq('store_id', resolved.storeId)
        .or('delivery_option_id.not.is.null,delivery_zone_id.not.is.null,tracking_number.not.is.null')
        .order('created_at', { ascending: false })

    if (error) console.error('[tracking fetch]', error.code, error.message)

    const mapped: TrackedOrder[] = (orders ?? []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_email ?? o.customer_phone ?? `Order ${o.order_number}`,
        status: o.status,
        tracking_number: o.tracking_number,
        created_at: o.created_at,
        delivery_option: Array.isArray(o.delivery_option) ? o.delivery_option[0] ?? null : o.delivery_option,
        delivery_zone: Array.isArray(o.delivery_zone) ? o.delivery_zone[0] ?? null : o.delivery_zone,
    }))

    return { error: null, data: { store_id: resolved.storeId, orders: mapped } }
}

export async function updateOrderTracking(
    storeId: string,
    orderId: string,
    fields: { tracking_number?: string | null; delivery_option_id?: string | null; delivery_zone_id?: string | null; status?: string }
) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('orders')
        .update(fields)
        .eq('id', orderId)
        .eq('store_id', storeId)
        .select()
        .single()
    return { data, error }
}