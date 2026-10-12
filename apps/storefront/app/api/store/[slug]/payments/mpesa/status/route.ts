// @route-kind: public — polled by the buyer with the unguessable order number
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'

// Polls order payment_status by order NUMBER (the checkout's ORD-… id) — used by the storefront while
// waiting for Safaricom's STK push callback to arrive.
export async function GET(req: NextRequest) {
    const orderId = req.nextUrl.searchParams.get('orderId')
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    const supabase = await createClient()
    const { data: order } = await supabase
        .from('orders')
        .select('id, status, metadata')
        .eq('order_number', orderId)
        .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const meta = typeof order.metadata === 'object' && order.metadata ? order.metadata as Record<string, any> : {}

    return NextResponse.json({
        status: order.status,
        paymentStatus: meta.payment_status ?? 'pending',
        mpesaCode: meta.mpesa_transaction_code ?? null,
    })
}
