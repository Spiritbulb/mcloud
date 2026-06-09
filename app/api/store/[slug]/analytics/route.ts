// app/api/store/[slug]/analytics/route.ts

import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

const RANGES: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

// GET — authorized read of aggregated analytics for the store's owner/members.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const userId = session.user.sub
    const supabase = await createClient()

    // Resolve the store and confirm the caller is a member.
    const { data: store } = await supabase
        .from('stores')
        .select('id, currency')
        .eq('slug', slug)
        .single()
    if (!store) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const { data: membership } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', store.id)
        .eq('user_id', userId)
        .maybeSingle()
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Resolve the date range.
    const rangeKey = request.nextUrl.searchParams.get('range') ?? '30d'
    const days = RANGES[rangeKey] ?? 30
    const end = new Date()
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase.rpc('get_store_analytics', {
        p_store_id: store.id,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
    })

    if (error) {
        return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
    }

    return NextResponse.json({ range: rangeKey, currency: store.currency, ...(data as object) })
}

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