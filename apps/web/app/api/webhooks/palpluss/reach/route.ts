// POST /api/webhooks/palpluss/reach — PalPluss result for Reach order payments.
// Separate from the wallet top-up webhook. The body only tells us which transaction to
// look at; status and amount are re-fetched from PalPluss before anything is settled.
import { NextResponse, type NextRequest } from 'next/server'
import type { PalplussWebhookPayload } from '@/lib/palpluss'
import { reachDb } from '@/lib/reach/db'
import { reconcilePayment } from '@/lib/reach/payments'

export async function POST(req: NextRequest) {
    const payload = (await req.json().catch(() => null)) as PalplussWebhookPayload | null
    const txId = payload?.transaction?.id
    if (!txId) return NextResponse.json({ ok: true }) // not for us

    try {
        const db = await reachDb()
        const { data: pay } = await db
            .from('reach_payments')
            .select('id')
            .eq('palpluss_transaction_id', txId)
            .maybeSingle()
        if (!pay) return NextResponse.json({ ok: true }) // unknown transaction, ignore

        await reconcilePayment(pay.id, payload?.transaction?.mpesa_receipt ?? null)
        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[reach webhook]', e)
        return NextResponse.json({ error: 'retry' }, { status: 500 }) // PalPluss will resend
    }
}