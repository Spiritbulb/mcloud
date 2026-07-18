// app/api/store/[slug]/analytics/route.ts

import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'
import { storeHasFeature } from '@/lib/plans-server'

const RANGES: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

// GET — authorized read of aggregated analytics for the store's owner/members.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const userId = session.user.id
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

    const result: Record<string, unknown> = { range: rangeKey, currency: store.currency, ...(data as object) }

    // Advanced analytics (funnel + source/country/product breakdowns) is Hobby+.
    // Free stores get the basic subset only.
    if (!(await storeHasFeature(store.id, 'advancedAnalytics'))) {
        delete result.funnel
        delete result.by_source
        delete result.by_country
        delete result.top_products
    }

    return NextResponse.json(result)
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()

        const {
            event, product_id, order_id, session_id, device_type, referrer,
            utm_source, utm_medium, utm_campaign,
        } = body

        // validate event type
        const validEvents = ['view', 'add_to_cart', 'checkout_started', 'order_placed']
        if (!validEvents.includes(event)) {
            return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
        }

        // Country comes from the edge (Vercel sets this header per request); the
        // browser can't be trusted to report it. Two-letter ISO code, e.g. "KE".
        const countryCode = request.headers.get('x-vercel-ip-country') || null

        // order_id is a uuid column, but the storefront sends the human-readable
        // order NUMBER (e.g. "ORD-1772...-322P98U5M"). Inserting that throws
        // "invalid input syntax for type uuid", which the catch below swallowed —
        // so every order_placed event was silently dropped. Only keep order_id
        // when it's actually a uuid; otherwise store null (the event still counts).
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const orderIdValue = typeof order_id === 'string' && UUID_RE.test(order_id) ? order_id : null

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
            order_id: orderIdValue,
            session_id: session_id ?? null,
            device_type: device_type ?? null,
            referrer: referrer ?? null,
            country_code: countryCode,
            utm_source: utm_source ?? null,
            utm_medium: utm_medium ?? null,
            utm_campaign: utm_campaign ?? null,
        })

        return NextResponse.json({ ok: true })
    } catch {
        // silently swallow — analytics must never break checkout
        return NextResponse.json({ ok: true })
    }
}