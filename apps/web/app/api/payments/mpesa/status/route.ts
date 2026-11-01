// @route-kind: public — polled by the buyer with the unguessable order number
import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { confirmDarajaPayment, settleDarajaOrder } from '@mcloud/merchant/daraja'
import { notifyPaidOrder } from '@/lib/merchant/notify-paid-order'

// Don't ask Safaricom more often than this per order (per server instance), and give the
// STK prompt a moment to be answered first.
const QUERY_EVERY_MS = 8_000
const MIN_AGE_MS = 10_000
const lastQuery = new Map<string, number>()

// Polls order payment_status by order NUMBER (the checkout's ORD-… id) — used by the storefront while
// waiting for Safaricom's STK push callback to arrive. If the callback never confirmed (it is unsigned,
// so it is only a hint), this asks Safaricom directly, so a missed callback cannot strand a paid order.
export async function GET(req: NextRequest) {
    const orderId = req.nextUrl.searchParams.get('orderId')
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    const supabase = await createClient()
    const { data: order } = await supabase
        .from('orders')
        .select('id, status, metadata, store_id, order_number, total, currency')
        .eq('order_number', orderId)
        .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const meta = (typeof order.metadata === 'object' && order.metadata ? order.metadata : {}) as Record<string, unknown>
    let status: string = order.status
    let paymentStatus = typeof meta.payment_status === 'string' ? meta.payment_status : 'pending'
    const mpesaCode = typeof meta.mpesa_transaction_code === 'string' ? meta.mpesa_transaction_code : null

    const now = Date.now()
    const pushedAt = Date.parse(typeof meta.daraja_pushed_at === 'string' ? meta.daraja_pushed_at : '')
    const waiting =
        order.status === 'pending' &&
        paymentStatus !== 'completed' &&
        meta.payment_method === 'daraja' &&
        typeof meta.daraja_checkout_request_id === 'string' &&
        Number.isFinite(pushedAt) && now - pushedAt >= MIN_AGE_MS &&
        now - (lastQuery.get(order.id) ?? 0) >= QUERY_EVERY_MS

    if (waiting) {
        lastQuery.set(order.id, now)
        const outcome = await confirmDarajaPayment(supabase, order)
        if (outcome === 'paid') {
            const settled = await settleDarajaOrder(supabase, order)
            if (settled) after(() => notifyPaidOrder(order))
            status = 'paid'
            paymentStatus = 'completed'
        } else if (outcome === 'failed') {
            paymentStatus = 'failed'
        }
    }

    return NextResponse.json({ status, paymentStatus, mpesaCode })
}
