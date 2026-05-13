// app/api/store/[slug]/analytics/route.ts

import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()

        const { event, product_id, order_id, session_id, device_type, referrer } = body

        // validate event type
        const validEvents = ['view', 'add_to_cart', 'checkout_started', 'order_placed']
        if (!validEvents.includes(event)) {
            return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
        }

        const supabase = await createClient()

        // resolve store_id from slug — no auth needed, this is a public endpoint
        const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', slug)
            .single()

        if (!store) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

        await supabase.from('store_analytics').insert({
            store_id: store.id,
            event,
            product_id: product_id ?? null,
            order_id: order_id ?? null,
            session_id: session_id ?? null,
            device_type: device_type ?? null,
            referrer: referrer ?? null,
        })

        return NextResponse.json({ ok: true })
    } catch {
        // silently swallow — analytics must never break checkout
        return NextResponse.json({ ok: true })
    }
}