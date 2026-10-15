// @route-kind: mobile
// GET /api/mobile/reach/vendor/orders — paid orders containing this vendor's items.
// `total` is what the vendor gets for the order (their prices, no markup or fee), and
// `fulfillment_status` reflects this vendor's own delivery, not the whole order's.
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { ownedProductIds } from '@/lib/reach/catalog'
import { vendorFor } from '@/lib/reach/vendor'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const vendor = await vendorFor(auth.user.id)
    if (!vendor) return fail(403, 'Not a vendor')
    const vendorId = vendor.id

    const db = await reachDb()

    const { data, error } = await db
        .from('reach_vendor_payouts')
        .select('status, amount_kes, orders!inner(id, order_number, status, created_at, customer_phone, shipping_address, order_items(title, quantity, product_id))')
        .eq('vendor_id', vendorId)
        .in('status', ['held', 'released', 'paid_out'])
    if (error) return fail(500, error.message)

    // Show only this vendor's lines of each order (an order can hold several vendors' items).
    const lineProductIds = (data ?? []).flatMap((row: any) =>
        (row.orders.order_items ?? []).map((i: any) => i.product_id).filter(Boolean),
    )
    let mine: Set<string>
    try {
        mine = await ownedProductIds(db, vendor, [...new Set<string>(lineProductIds)])
    } catch (e) {
        return fail(500, e instanceof Error ? e.message : 'Could not load orders')
    }

    const orders = (data ?? [])
        .map((row: any) => ({
            id: row.orders.id,
            order_number: row.orders.order_number,
            status: row.orders.status,
            fulfillment_status: row.status === 'held' ? 'unfulfilled' : 'fulfilled',
            total: row.amount_kes,
            created_at: row.orders.created_at,
            // Where to take it, and who to call. Only the vendors on the order ever see this.
            deliver_to: {
                area: row.orders.shipping_address?.area ?? null,
                address: row.orders.shipping_address?.address ?? null,
                phone: row.orders.customer_phone ?? null,
            },
            items: (row.orders.order_items ?? [])
                .filter((i: any) => mine.has(i.product_id))
                .map((i: any) => ({ title: i.title, quantity: i.quantity })),
        }))
        .sort((a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 100)

    return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store' } })
}