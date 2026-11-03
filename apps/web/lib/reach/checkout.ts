/* eslint-disable @typescript-eslint/no-explicit-any -- the reach_* tables are not in the generated database types */
// Reach marketplace checkout: create a pending order in the Reach store and fire the STK push.
// The order only becomes 'paid' when PalPluss confirms (see /api/webhooks/palpluss/reach).
// Prices always come from the database, never from the app. Shared by the WorkOS buyer route
// (/reach/orders, old app builds) and the shopper route (/reach/shop/orders).
import { initiateStkPush } from '@/lib/palpluss'
import { areaLabel } from '@mcloud/merchant/reach-areas'
import { loadAreas, loadVendorIndex } from './catalog'
import { vendorForProduct, type VendorIndex } from './catalog-logic'
import { reachDb } from './db'
import { REACH_STORE_ID, priceForBuyer, settingsFor } from './store-config'

const PHONE_RE = /^(?:\+254|254|0)\d{9}$/

/** Who is paying. A WorkOS buyer (old builds) has userId; a shopper has shopperId and email. */
export interface Payer {
    userId?: string
    shopperId?: string
    email?: string
}

export type CheckoutResult =
    | { ok: true; orderId: string; orderNumber: string; total: number }
    | { ok: false; status: number; error: string }

const failed = (status: number, error: string): CheckoutResult => ({ ok: false, status, error })

export async function createReachOrder(payer: Payer, input: unknown): Promise<CheckoutResult> {
    const appUrl = process.env.NEXT_PUBLIC_ADMIN_ORIGIN
    if (!appUrl) return failed(500, 'Server misconfigured: NEXT_PUBLIC_ADMIN_ORIGIN not set')

    const body = input as {
        phone?: string
        areaId?: string
        address?: string
        lines?: { product_id?: string; quantity?: number }[]
    } | null

    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    if (!PHONE_RE.test(phone)) return failed(400, 'Enter a valid Kenyan phone number')
    if (!body?.lines?.length) return failed(400, 'lines is required')

    // Where to deliver. The vendor needs this to bring the order, so it is not optional.
    const areaId = typeof body.areaId === 'string' ? body.areaId : ''
    const address = typeof body.address === 'string' ? body.address.trim().replace(/\s+/g, ' ') : ''
    if (!areaId) return failed(400, 'Choose where we are delivering to')
    if (address.length < 4 || address.length > 200) return failed(400, 'Add a street, building or landmark so the seller can find you')

    // Merge duplicate lines and validate quantities
    const wanted = new Map<string, number>()
    for (const l of body.lines) {
        const qty = Number(l.quantity)
        if (typeof l.product_id !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > 50) {
            return failed(400, 'Invalid item in cart')
        }
        wanted.set(l.product_id, (wanted.get(l.product_id) ?? 0) + qty)
    }
    const ids = [...wanted.keys()]

    const db = await reachDb()

    // Products may belong to any listed store; the vendor is whoever sells that product.
    const { data: products, error: pErr } = await db
        .from('products')
        .select('id, store_id, name, price, images, inventory_quantity, track_inventory')
        .in('id', ids)
        .eq('is_active', true)
    if (pErr) return failed(500, pErr.message)
    if ((products ?? []).length !== ids.length) return failed(400, 'Some items are no longer available')

    // Only vendors that deliver to the buyer's area can sell to them, so a cart built in one area
    // cannot be paid for into another.
    let index
    let areas
    try {
        areas = await loadAreas(db)
        if (!areas.some((a) => a.id === areaId)) return failed(400, 'That delivery area is not available')
        index = await loadVendorIndex(db, areaId)
    } catch (e) {
        return failed(500, e instanceof Error ? e.message : 'Could not load vendors')
    }

    let subtotal = 0
    const items: any[] = []
    const owed = new Map<string, number>() // vendor -> what they get (their base price, no markup)

    for (const p of products as any[]) {
        const qty = wanted.get(p.id)!
        const vendorId = vendorForProduct(p, index)?.id
        if (!vendorId) return failed(400, `${p.name} is not available in your area`)
        const tracked = p.track_inventory ?? true
        const left = p.inventory_quantity ?? 0
        if (tracked && left < qty) return failed(409, `Only ${left} left of ${p.name}`)

        const unit = priceForBuyer(Number(p.price), REACH_STORE_ID)
        subtotal += unit * qty
        items.push({
            product_id: p.id,
            title: p.name,
            quantity: qty,
            price: unit,
            total: unit * qty,
            image_url: p.images?.[0] ?? null,
        })
        owed.set(vendorId, (owed.get(vendorId) ?? 0) + Math.round(Number(p.price) * qty))
    }

    const settings = settingsFor(REACH_STORE_ID)
    const fee = settings.paymentModel === 'escrow' ? settings.serviceFeeKes : 0
    const total = subtotal + fee

    const orderNumber = `RCH-${Date.now().toString(36).toUpperCase()}`
    const { data: order, error: oErr } = await db
        .from('orders')
        .insert({
            store_id: REACH_STORE_ID,
            order_number: orderNumber,
            status: 'pending',
            fulfillment_status: 'unfulfilled',
            subtotal,
            total,
            currency: 'KES',
            customer_phone: phone,
            shipping_address: { area_id: areaId, area: areaLabel(areas, areaId), address, phone },
            metadata: { reach: { area_id: areaId } },
            source: 'reach',
        })
        .select('id, order_number')
        .single()
    if (oErr || !order) return failed(500, oErr?.message ?? 'Could not create order')

    const cleanup = async () => {
        await db.from('order_items').delete().eq('order_id', order.id)
        await db.from('orders').delete().eq('id', order.id) // payouts + payments cascade
    }

    const { error: iErr } = await db.from('order_items').insert(items.map((i) => ({ ...i, order_id: order.id })))
    if (iErr) {
        await cleanup()
        return failed(500, iErr.message)
    }

    if (payer.email) {
        // The shopper becomes a customer of the Reach store (their order history) and of every
        // store they bought from, so merchants see who bought. Best effort: it never fails checkout.
        const customerId = await linkCustomers(db, payer.email, [REACH_STORE_ID, ...vendorStoreIds(index, owed)])
        if (customerId) await db.from('orders').update({ customer_id: customerId }).eq('id', order.id)
    }

    const { error: poErr } = await db
        .from('reach_vendor_payouts')
        .insert([...owed].map(([vendor_id, amount_kes]) => ({ order_id: order.id, vendor_id, amount_kes })))
    if (poErr) {
        await cleanup()
        return failed(500, poErr.message)
    }

    const { data: payment, error: payErr } = await db
        .from('reach_payments')
        .insert({ order_id: order.id, user_id: payer.userId ?? null, shopper_id: payer.shopperId ?? null, phone, amount_kes: total })
        .select('id')
        .single()
    if (payErr || !payment) {
        await cleanup()
        return failed(500, payErr?.message ?? 'Could not start payment')
    }

    try {
        const stk = await initiateStkPush({
            amountKes: total,
            phone,
            accountReference: payment.id.replace(/-/g, '').slice(0, 12),
            transactionDesc: 'Reach order',
            callbackUrl: `${appUrl}/api/webhooks/palpluss/reach`,
        })
        await db.from('reach_payments').update({ palpluss_transaction_id: stk.transactionId }).eq('id', payment.id)
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to start payment'
        await db
            .from('reach_payments')
            .update({ status: 'failed', failure_reason: message, settled_at: new Date().toISOString() })
            .eq('id', payment.id)
        return failed(502, message)
    }

    return { ok: true, orderId: order.id, orderNumber: order.order_number, total }
}

/** The mcloud stores of the vendors on this order (legacy vendors have none). */
function vendorStoreIds(index: VendorIndex, owed: Map<string, number>): string[] {
    return [...owed.keys()].map((id) => index.byId.get(id)?.storeId).filter((id): id is string => !!id)
}

/**
 * Make sure `email` is a customer of each store, the same rows a web storefront sign-in creates
 * (apps/storefront/lib/customer-auth.ts). Returns the Reach store's customer id, or null.
 */
async function linkCustomers(db: any, email: string, storeIds: string[]): Promise<string | null> {
    let reachCustomerId: string | null = null
    for (const storeId of [...new Set(storeIds)]) {
        try {
            const { data: found } = await db.from('customers').select('id').eq('store_id', storeId).eq('email', email).maybeSingle()
            let id = found?.id ?? null
            if (!id) {
                const { data: created } = await db
                    .from('customers')
                    .insert({ store_id: storeId, email, first_name: '', last_name: '' })
                    .select('id')
                    .single()
                id = created?.id ?? null
            }
            if (storeId === REACH_STORE_ID) reachCustomerId = id
        } catch {
            // best effort
        }
    }
    return reachCustomerId
}
