/* eslint-disable @typescript-eslint/no-explicit-any -- the reach_* tables are not in the generated database types */
// A shopper's Reach orders: those placed as a shopper (their customer row in the Reach store) and
// those placed from the WorkOS account they were linked from (reach_payments.user_id).
import { reconcilePayment } from './payments'
import { mergeOrderHistory, orderVisibleTo } from './shop-logic'
import type { Shopper } from './shopper'
import { REACH_STORE_ID } from './store-config'

const ORDER_COLS =
    'id, order_number, status, fulfillment_status, total, created_at, customer_id, shipping_address, order_items(title, quantity, price, image_url)'

export interface ShopOrder {
    id: string
    orderNumber: string
    status: string
    fulfillmentStatus: string
    total: number
    createdAt: string
    deliverTo: { area: string | null; address: string | null } | null
    items: { title: string; quantity: number; price: number; imageUrl: string | null }[]
}

function shape(o: any): ShopOrder {
    const ship = o.shipping_address ?? null
    return {
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        fulfillmentStatus: o.fulfillment_status,
        total: Number(o.total),
        createdAt: o.created_at,
        deliverTo: ship ? { area: ship.area ?? null, address: ship.address ?? null } : null,
        items: (o.order_items ?? []).map((i: any) => ({
            title: i.title,
            quantity: i.quantity,
            price: Number(i.price),
            imageUrl: i.image_url ?? null,
        })),
    }
}

async function reachCustomerId(db: any, email: string): Promise<string | null> {
    const { data } = await db.from('customers').select('id').eq('store_id', REACH_STORE_ID).eq('email', email).maybeSingle()
    return data?.id ?? null
}

async function legacyOrderIds(db: any, legacyUserId: string | null): Promise<string[]> {
    if (!legacyUserId) return []
    const { data } = await db.from('reach_payments').select('order_id').eq('user_id', legacyUserId)
    return [...new Set<string>((data ?? []).map((p: any) => p.order_id))]
}

export async function listShopperOrders(db: any, shopper: Shopper): Promise<ShopOrder[]> {
    const [customerId, legacyIds] = await Promise.all([reachCustomerId(db, shopper.email), legacyOrderIds(db, shopper.legacyUserId)])
    const [mine, legacy] = await Promise.all([
        customerId
            ? db.from('orders').select(ORDER_COLS).eq('store_id', REACH_STORE_ID).eq('customer_id', customerId).order('created_at', { ascending: false }).limit(100)
            : { data: [] },
        legacyIds.length
            ? db.from('orders').select(ORDER_COLS).eq('store_id', REACH_STORE_ID).in('id', legacyIds.slice(0, 200))
            : { data: [] },
    ])
    return mergeOrderHistory<any>(mine.data ?? [], legacy.data ?? []).map(shape)
}

/**
 * One order by its number, with its payment status, or null when it isn't this shopper's. Order
 * numbers come from the client, so the lookup is scoped to the Reach store and then checked
 * against the shopper. A pending payment quiet for 15s is reconciled with PalPluss, as
 * /reach/orders/[orderId] does.
 */
export async function getShopperOrder(
    db: any,
    shopper: Shopper,
    orderNumber: string,
): Promise<{ order: ShopOrder; paymentStatus: string | null } | null> {
    const { data: o } = await db.from('orders').select(ORDER_COLS).eq('store_id', REACH_STORE_ID).eq('order_number', orderNumber).maybeSingle()
    if (!o) return null

    const { data: pay } = await db
        .from('reach_payments')
        .select('id, status, created_at, user_id, shopper_id')
        .eq('order_id', o.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    const customerId = await reachCustomerId(db, shopper.email)
    const visible =
        pay?.shopper_id === shopper.id ||
        orderVisibleTo({ customer_id: o.customer_id ?? null, legacy_user_id: pay?.user_id ?? null }, { customerId, legacyUserId: shopper.legacyUserId })
    if (!visible) return null

    let paymentStatus: string | null = pay?.status ?? null
    if (pay && paymentStatus === 'pending' && Date.now() - new Date(pay.created_at).getTime() > 15_000) {
        try {
            paymentStatus = await reconcilePayment(pay.id)
        } catch {
            // PalPluss hiccup, the next poll will retry
        }
    }
    return { order: shape(o), paymentStatus }
}
