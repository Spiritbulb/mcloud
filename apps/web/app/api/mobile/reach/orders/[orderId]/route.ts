// GET /api/mobile/reach/orders/[orderId] — payment status for the buyer's own order.
// The app polls this after the STK push. The webhook is the fast path; if it's been
// quiet for 15s we ask PalPluss directly so a lost webhook never strands a payment.
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { reconcilePayment } from '@/lib/reach/payments'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { orderId } = await params
    const db = await reachDb()
    const { data: pay } = await db
        .from('reach_payments')
        .select('id, status, created_at, orders(order_number)')
        .eq('order_id', orderId)
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (!pay) return fail(404, 'Order not found')

    let status: string = pay.status
    if (status === 'pending' && Date.now() - new Date(pay.created_at).getTime() > 15_000) {
        try {
            status = await reconcilePayment(pay.id)
        } catch {
            // PalPluss hiccup, the next poll will retry
        }
    }

    return NextResponse.json(
        { status, orderNumber: pay.orders?.order_number ?? null },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}