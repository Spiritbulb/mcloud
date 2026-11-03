// @route-kind: customer
// GET /api/mobile/reach/shop/orders/[orderNumber] — one of the shopper's orders with its payment
// status. The app polls this after the STK push. 404 for an order that isn't theirs.
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { getShopperOrder } from '@/lib/reach/shop-orders'
import { fail, requireReachShopper } from '../../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
    const auth = await requireReachShopper(req)
    if (auth instanceof NextResponse) return auth

    const { orderNumber } = await params
    if (!/^[A-Z0-9-]{3,40}$/i.test(orderNumber)) return fail(404, 'Order not found')
    const found = await getShopperOrder(await reachDb(), auth.shopper, orderNumber)
    if (!found) return fail(404, 'Order not found')
    return NextResponse.json({ order: found.order, status: found.paymentStatus }, { headers: { 'Cache-Control': 'no-store' } })
}
