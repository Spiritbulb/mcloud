// @route-kind: mobile
// POST /api/mobile/reach/orders — WorkOS buyers (old Reach builds). New builds use
// /reach/shop/orders. The checkout itself lives in lib/reach/checkout.ts.
import { NextResponse, type NextRequest } from 'next/server'
import { createReachOrder } from '@/lib/reach/checkout'
import { fail, requireMobileUser } from '../../_lib'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const result = await createReachOrder({ userId: auth.user.id }, await req.json().catch(() => null))
    if (!result.ok) return fail(result.status, result.error)
    return NextResponse.json({ orderId: result.orderId, orderNumber: result.orderNumber, total: result.total }, { status: 201 })
}
