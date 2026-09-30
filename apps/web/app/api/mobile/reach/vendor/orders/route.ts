// GET /api/mobile/reach/vendor/orders — paid orders containing this vendor's items.
// `total` is what the vendor gets for the order (their prices, no markup or fee), and
// `fulfillment_status` reflects this vendor's own delivery, not the whole order's.
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { vendorIdFor } from '@/lib/reach/vendor'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const vendorId = await vendorIdFor(auth.user.id)
    if (!vendorId) return fail(403, 'Not a vendor')

    const db = await reachDb()
    const { data: links, error: linkErr } = await db
        .from('reach_product_vendors')
        .select('product_id')
        .eq('vendor_id', vendorId)
    if (linkErr) return fail(500, linkErr.message)
    const mine = new Set<string>((links ?? []).map((l: any) => l.product_id))

    const { data, error } = await db
        .from('reach_vendor_payouts')
        .select('status, amount_kes, orders!inner(id, order_number, status, created_at, order_items(title, quantity, product_id))')
        .eq('vendor_id', vendorId)
        .in('status', ['held', 'released', 'paid_out'])
    if (error) return fail(500, error.message)

    const orders = (data ?? [])
        .map((row: any) => ({
            id: row.orders.id,
            order_number: row.orders.order_number,
            status: row.orders.status,
            fulfillment_status: row.status === 'held' ? 'unfulfilled' : 'fulfilled',
            total: row.amount_kes,
            created_at: row.orders.created_at,
            items: (row.orders.order_items ?? [])
                .filter((i: any) => mine.has(i.product_id))
                .map((i: any) => ({ title: i.title, quantity: i.quantity })),
        }))
        .sort((a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 100)

    return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store' } })
}