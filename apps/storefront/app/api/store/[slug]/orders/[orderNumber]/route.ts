// @route-kind: public — order status by order number, an unguessable capability; contact, address, fees and prices need the signed-in owner
// app/api/store/[slug]/orders/[orderNumber]/route.ts
//
// Backs the order page shoppers land on after paying. Anonymous callers get the basic view;
// the signed-in owner (Supabase customer session, via getStoreCustomer) gets the full one.
// What belongs to which tier is decided in lib/order-view.ts and pinned by its tests.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId, getStoreCustomer } from '@/lib/customer-auth'
import { ownsOrder, viewOrder, type OrderRow } from '@/lib/order-view'

// Never cache (it is per-order and per-viewer) and never index.
const privateHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }

// ORD-<ms>-<base36>; anything else cannot be an order number, so skip the lookup.
const ORDER_NUMBER_RE = /^[A-Za-z0-9_-]{6,64}$/

const notFound = () => NextResponse.json({ error: 'Order not found' }, { status: 404, headers: privateHeaders })

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string; orderNumber: string }> },
) {
    const { slug, orderNumber } = await params
    if (!ORDER_NUMBER_RE.test(orderNumber)) return notFound()

    const storeId = await getActiveStoreId(slug)
    if (!storeId) return notFound()

    const admin = await createClient()
    // Scoped to the store: an order number from another store is simply not found here.
    const { data: order } = await admin
        .from('orders')
        .select(
            'order_number, status, fulfillment_status, currency, total, subtotal, shipping, created_at, tracking_number, ' +
            'customer_id, customer_email, customer_phone, shipping_address, ' +
            'order_items(title, variant_title, quantity, price, total)',
        )
        .eq('store_id', storeId)
        .eq('order_number', orderNumber)
        .maybeSingle()
    if (!order) return notFound()

    // A failed session read just means "not signed in": this route serves anonymous shoppers.
    const customer = await getStoreCustomer(storeId).catch(() => null)
    const row = order as unknown as OrderRow & { customer_id: string | null }
    const owner = ownsOrder(row, customer)

    return NextResponse.json(
        { order: viewOrder(row, owner), signedIn: !!customer, owner },
        { headers: privateHeaders },
    )
}
