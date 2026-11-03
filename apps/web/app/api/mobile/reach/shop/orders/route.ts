// @route-kind: customer
// GET  /api/mobile/reach/shop/orders — the signed-in shopper's Reach orders, newest first
// POST /api/mobile/reach/shop/orders — check out: create a pending order and fire the STK push.
// Prices come from the database (lib/reach/checkout.ts); the payer comes from the verified token.
import { NextResponse, type NextRequest } from 'next/server'
import { createReachOrder } from '@/lib/reach/checkout'
import { reachDb } from '@/lib/reach/db'
import { listShopperOrders } from '@/lib/reach/shop-orders'
import { fail, requireReachShopper } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireReachShopper(req)
    if (auth instanceof NextResponse) return auth
    try {
        const orders = await listShopperOrders(await reachDb(), auth.shopper)
        return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (e) {
        return fail(500, e instanceof Error ? e.message : 'Could not load your orders')
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireReachShopper(req)
    if (auth instanceof NextResponse) return auth

    const { shopper } = auth
    const result = await createReachOrder({ shopperId: shopper.id, email: shopper.email }, await req.json().catch(() => null))
    if (!result.ok) return fail(result.status, result.error)
    return NextResponse.json({ orderId: result.orderId, orderNumber: result.orderNumber, total: result.total }, { status: 201 })
}
