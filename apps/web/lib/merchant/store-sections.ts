// Orders, branding, manual M-Pesa, analytics, and store deletion for the mobile
// API. All gated through requireStoreAccess; writes require owner/admin.
import { createClient } from '@mcloud/db/server'
import { canManage, requireStoreAccess, type Role } from './stores'

type Guarded<T> =
    | { error: 'not_found' | 'forbidden'; status: number; data: null }
    | { error: null; status: number; data: T }

function accessFail(err: 'not_found' | 'forbidden') {
    return { error: err, status: err === 'not_found' ? 404 : 403, data: null } as const
}

// ── Orders ──────────────────────────────────────────────────────────────────────

export interface MobileOrder {
    id: string
    order_number: string
    status: string
    fulfillment_status: string | null
    total: number
    currency: string
    customer_phone: string | null
    created_at: string | null
}

const ORDER_COLS =
    'id, order_number, status, fulfillment_status, total, currency, customer_phone, created_at'

export async function listOrders(slug: string, userId: string): Promise<Guarded<MobileOrder[]>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return accessFail(access.error)

    const supabase = await createClient()
    const { data } = await supabase
        .from('orders')
        .select(ORDER_COLS)
        .eq('store_id', access.storeId)
        .order('created_at', { ascending: false })
        .limit(100)

    return { error: null, status: 200, data: (data ?? []) as MobileOrder[] }
}

const FULFILLMENT = ['unfulfilled', 'fulfilled', 'partial', 'cancelled'] as const

export async function updateOrderStatus(
    slug: string,
    userId: string,
    orderId: string,
    fulfillment_status: string,
): Promise<Guarded<MobileOrder>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return accessFail(access.error)
    if (!canManage(access.role)) return { error: 'forbidden', status: 403, data: null }
    if (!FULFILLMENT.includes(fulfillment_status as (typeof FULFILLMENT)[number])) {
        return { error: 'forbidden', status: 400, data: null } // invalid value
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('orders')
        .update({ fulfillment_status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('store_id', access.storeId)
        .select(ORDER_COLS)
        .single()

    if (error || !data) return { error: 'not_found', status: 404, data: null }
    return { error: null, status: 200, data: data as MobileOrder }
}

// ── Branding ────────────────────────────────────────────────────────────────────

export interface Branding {
    name: string
    logo_url: string | null
    description: string | null
    currency: string
    role: Role
    canManage: boolean
}

export async function getBranding(slug: string, userId: string): Promise<Guarded<Branding>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return accessFail(access.error)

    const supabase = await createClient()
    const { data } = await supabase
        .from('stores')
        .select('name, logo_url, description, currency')
        .eq('id', access.storeId)
        .single()

    if (!data) return accessFail('not_found')
    return {
        error: null,
        status: 200,
        data: { ...data, role: access.role, canManage: canManage(access.role) } as Branding,
    }
}

export async function updateBranding(
    slug: string,
    userId: string,
    patch: { name?: string; logo_url?: string | null; description?: string | null },
): Promise<Guarded<Branding>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return accessFail(access.error)
    if (!canManage(access.role)) return { error: 'forbidden', status: 403, data: null }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.name !== undefined) {
        const n = patch.name.trim()
        if (n.length < 2) return { error: 'forbidden', status: 400, data: null }
        update.name = n
    }
    if (patch.logo_url !== undefined) update.logo_url = patch.logo_url
    if (patch.description !== undefined) update.description = patch.description

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('stores').update(update as any).eq('id', access.storeId)
    if (error) return { error: 'not_found', status: 500, data: null }
    return getBranding(slug, userId)
}

// ── Manual M-Pesa (store_integrations provider='mpesa', config JSON) ─────────────
// Only the MANUAL fields are exposed on mobile; auto/Daraja stays on the web.

export interface ManualMpesa {
    enabled: boolean
    mpesa_type: 'till' | 'paybill'
    mpesa_till: string
    mpesa_paybill: string
    mpesa_account: string
    canManage: boolean
}

function readMpesa(config: Record<string, unknown> | null, is_active: boolean | null): ManualMpesa {
    const c = config ?? {}
    return {
        enabled: !!is_active,
        mpesa_type: (c.mpesa_type as 'till' | 'paybill') ?? 'till',
        mpesa_till: (c.mpesa_till as string) ?? '',
        mpesa_paybill: (c.mpesa_paybill as string) ?? '',
        mpesa_account: (c.mpesa_account as string) ?? '',
        canManage: false,
    }
}

export async function getMpesa(slug: string, userId: string): Promise<Guarded<ManualMpesa>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return accessFail(access.error)

    const supabase = await createClient()
    const { data } = await supabase
        .from('store_integrations')
        .select('config, is_active')
        .eq('store_id', access.storeId)
        .eq('provider', 'mpesa')
        .maybeSingle()

    const result = readMpesa((data?.config as Record<string, unknown>) ?? null, data?.is_active ?? false)
    result.canManage = canManage(access.role)
    return { error: null, status: 200, data: result }
}

export async function updateMpesa(
    slug: string,
    userId: string,
    patch: { enabled?: boolean; mpesa_type?: 'till' | 'paybill'; mpesa_till?: string; mpesa_paybill?: string; mpesa_account?: string },
): Promise<Guarded<ManualMpesa>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return accessFail(access.error)
    if (!canManage(access.role)) return { error: 'forbidden', status: 403, data: null }

    const supabase = await createClient()
    // Merge into existing config so we never clobber the auto/Daraja fields.
    const { data: existing } = await supabase
        .from('store_integrations')
        .select('id, config')
        .eq('store_id', access.storeId)
        .eq('provider', 'mpesa')
        .maybeSingle()

    const config = { ...((existing?.config as Record<string, unknown>) ?? {}) }
    if (patch.mpesa_type !== undefined) config.mpesa_type = patch.mpesa_type
    if (patch.mpesa_till !== undefined) config.mpesa_till = patch.mpesa_till
    if (patch.mpesa_paybill !== undefined) config.mpesa_paybill = patch.mpesa_paybill
    if (patch.mpesa_account !== undefined) config.mpesa_account = patch.mpesa_account

    const row = {
        store_id: access.storeId,
        provider: 'mpesa',
        config,
        is_active: patch.enabled ?? undefined,
        updated_at: new Date().toISOString(),
    }

    const { error } = existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? await supabase.from('store_integrations').update(row as any).eq('id', existing.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : await supabase.from('store_integrations').insert({ ...row, is_active: patch.enabled ?? true } as any)

    if (error) return { error: 'not_found', status: 500, data: null }
    return getMpesa(slug, userId)
}

// ── Analytics (RPC: get_store_analytics) ─────────────────────────────────────────

export async function getAnalytics(
    slug: string,
    userId: string,
    days = 30,
): Promise<Guarded<unknown>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return accessFail(access.error)

    const end = new Date()
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_store_analytics', {
        p_store_id: access.storeId,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
    })

    if (error) return { error: 'not_found', status: 500, data: null }
    return { error: null, status: 200, data }
}

// ── Today (combined unfulfilled orders + analytics) ──────────────────────────────

export interface TodayData {
    unfulfilledOrders: MobileOrder[]
    analytics: unknown
}

export async function getTodayData(
    slug: string,
    userId: string,
): Promise<Guarded<TodayData>> {
    const access = await requireStoreAccess(slug, userId)
    if (access.error) return accessFail(access.error)

    const supabase = await createClient()
    const end = new Date()
    const start = new Date(end.getTime() - 1 * 24 * 60 * 60 * 1000)

    const [ordersRes, analyticsRes] = await Promise.all([
        supabase
            .from('orders')
            .select(ORDER_COLS)
            .eq('store_id', access.storeId)
            .in('fulfillment_status', ['unfulfilled', null])
            .order('created_at', { ascending: false })
            .limit(50),
        supabase.rpc('get_store_analytics', {
            p_store_id: access.storeId,
            p_start: start.toISOString(),
            p_end: end.toISOString(),
        }),
    ])

    return {
        error: null,
        status: 200,
        data: {
            unfulfilledOrders: (ordersRes.data ?? []) as MobileOrder[],
            analytics: analyticsRes.data ?? null,
        },
    }
}

// ── Delete store (owner only — destructive) ──────────────────────────────────────

export async function deleteStore(
    slug: string,
    userId: string,
): Promise<{ error: string | null; status: number }> {
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('id, owner_id')
        .eq('slug', slug)
        .single()

    if (!store) return { error: 'Store not found', status: 404 }
    // Stricter than canManage: only the OWNER may delete (matches web deleteStore).
    if (store.owner_id !== userId) return { error: 'Only the store owner can delete it', status: 403 }

    await supabase.from('store_members').delete().eq('store_id', store.id)
    const { error } = await supabase.from('stores').delete().eq('id', store.id)
    if (error) {
        return { error: 'Could not delete store. It may still have orders or products attached.', status: 409 }
    }
    return { error: null, status: 200 }
}
