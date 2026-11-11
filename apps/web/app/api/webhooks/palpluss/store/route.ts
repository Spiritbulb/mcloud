// @route-kind: webhook — PalPluss posts unsigned; matched to an order by its stored transaction id, then status and amount are re-fetched from PalPluss before settling
// apps/web/app/api/webhooks/palpluss/store/route.ts
// Async STK result for a store's shopper payment (see lib/palpluss-store-payments.ts). The body is only a
// hint about WHICH transaction changed: the order is matched on the transaction id we stored when we sent
// the prompt, and nothing is marked paid until PalPluss itself reports a covering SUCCESS. Ack fast, safe
// to deliver twice (a settled order is never processed again).
import { NextResponse, after, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import type { PalplussWebhookPayload } from '@/lib/palpluss'
import { settlePalplussOrder } from '@/lib/palpluss-store-payments'
import { notifyPaidOrder } from '@/lib/merchant/notify-paid-order'

export async function POST(req: NextRequest) {
    const payload = (await req.json().catch(() => null)) as PalplussWebhookPayload | null
    const txId = payload?.transaction?.id
    // Nothing we can use: acknowledge so PalPluss stops retrying.
    if (typeof txId !== 'string' || !txId) return NextResponse.json({ ok: true })

    const supabase = await createClient()
    const { data: orders } = await supabase
        .from('orders')
        .select('id, status, metadata, store_id, order_number, total, currency')
        .eq('metadata->>palpluss_transaction_id', txId)
        .limit(1)
    const order = orders?.[0]
    // Not a store order (wallet and Reach transactions have their own routes): acknowledge.
    if (!order) return NextResponse.json({ ok: true })
    if (order.status === 'paid') return NextResponse.json({ ok: true })

    try {
        const receipt = typeof payload?.transaction?.mpesa_receipt === 'string' ? payload.transaction.mpesa_receipt : null
        const { justSettled } = await settlePalplussOrder(supabase, order, { mpesaReceipt: receipt })
        if (justSettled) after(() => notifyPaidOrder(order))
    } catch (e) {
        console.error('[palpluss store webhook] verify failed', e)
        return NextResponse.json({ error: 'retry' }, { status: 500 }) // PalPluss will resend
    }
    return NextResponse.json({ ok: true })
}
