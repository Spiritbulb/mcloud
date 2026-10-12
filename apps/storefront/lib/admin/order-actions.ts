'use server'
// Orders for the settings screens. Read and manual status changes only: orders are created by
// the checkout routes and settled by the payment callbacks, never from here.
import { createClient } from '@mcloud/db/server'
import { requireManagedStore, type ActionResult } from './access'

// The statuses the settings UI offers (plus 'cancelled', used by the filter tabs).
export const ORDER_STATUSES = ['pending', 'paid', 'partially_paid', 'refunded', 'voided', 'cancelled'] as const
export const FULFILLMENT_STATUSES = ['unfulfilled', 'partially_fulfilled', 'fulfilled'] as const

const ORDER_COLUMNS =
    'id, order_number, status, fulfillment_status, total, currency, customer_email, customer_phone, subtotal, tax, shipping, discount, notes, created_at'

export async function listOrders(storeId: string) {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return { ok: false as const, error: gate.error }
    const supabase = await createClient()

    const { data: orders, error } = await supabase
        .from('orders')
        .select(ORDER_COLUMNS)
        .eq('store_id', gate.storeId)
        .order('created_at', { ascending: false })
        .limit(100)
    if (error) return { ok: false as const, error: 'Could not load orders' }

    const ids = (orders ?? []).map((o) => o.id)
    // One batched fetch for preview thumbnails and counts (no N+1 per row).
    const { data: itemRows } = ids.length
        ? await supabase.from('order_items').select('order_id, title, image_url').in('order_id', ids)
        : { data: [] as { order_id: string; title: string; image_url: string | null }[] }

    return { ok: true as const, orders: orders ?? [], itemRows: itemRows ?? [] }
}

export async function listOrderItems(storeId: string, orderId: string) {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return { ok: false as const, error: gate.error }
    const supabase = await createClient()
    // Prove the order is this store's before returning its lines.
    const { data: order } = await supabase
        .from('orders').select('id').eq('id', orderId).eq('store_id', gate.storeId).maybeSingle()
    if (!order) return { ok: false as const, error: 'Order not found' }
    const { data } = await supabase
        .from('order_items')
        .select('id, title, variant_title, quantity, price, total, image_url')
        .eq('order_id', orderId)
    return { ok: true as const, items: data ?? [] }
}

export async function setOrderStatus(
    storeId: string,
    orderId: string,
    field: 'status' | 'fulfillment_status',
    value: string,
): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate

    const allowed: readonly string[] = field === 'status' ? ORDER_STATUSES : field === 'fulfillment_status' ? FULFILLMENT_STATUSES : []
    if (!allowed.includes(value)) return { ok: false, error: 'Invalid status' }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('orders')
        .update(
            field === 'status'
                ? { status: value, updated_at: new Date().toISOString() }
                : { fulfillment_status: value, updated_at: new Date().toISOString() },
        )
        .eq('id', orderId)
        .eq('store_id', gate.storeId)
        .select('id')
        .maybeSingle()
    return error || !data ? { ok: false, error: 'Could not update the order.' } : { ok: true }
}
