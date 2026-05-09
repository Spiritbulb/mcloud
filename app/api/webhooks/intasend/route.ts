// app/api/webhooks/intasend/route.ts
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'
import crypto from 'crypto'

function verifySignature(payload: string, signature: string) {
    const expected = crypto
        .createHmac('sha256', process.env.INTASEND_WEBHOOK_SECRET!)
        .update(payload)
        .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
    const payload = await request.text()
    const signature = request.headers.get('x-intasend-signature') ?? ''

    if (!verifySignature(payload, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(payload)
    const invoiceId = event.invoice?.invoice_id
    const state = event.invoice?.state // COMPLETE | FAILED | PENDING

    if (!invoiceId) return NextResponse.json({ ok: true })

    const supabase = await createClient()

    // Find the subscription row
    const { data: sub } = await supabase
        .from('store_subscriptions')
        .select('id, store_id')
        .eq('intasend_invoice_id', invoiceId)
        .single()

    if (!sub) return NextResponse.json({ ok: true }) // not our invoice

    if (state === 'COMPLETE') {
        const now = new Date()
        const expires = new Date(now)
        expires.setMonth(expires.getMonth() + 1)

        await Promise.all([
            supabase.from('store_subscriptions').update({
                status: 'complete',
                period_start: now.toISOString(),
                period_end: expires.toISOString(),
            }).eq('id', sub.id),

            supabase.from('stores').update({
                is_pro: true,
                pro_since: now.toISOString(),
                pro_expires_at: expires.toISOString(),
            }).eq('id', sub.store_id),
        ])
    }

    if (state === 'FAILED') {
        await supabase.from('store_subscriptions')
            .update({ status: 'failed' })
            .eq('id', sub.id)
    }

    return NextResponse.json({ ok: true })
}