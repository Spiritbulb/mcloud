import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug } = await params
    const userId = session.user.sub
    const supabase = await createClient()

    const { data: memberships } = await supabase
        .from('store_members')
        .select('store_id, role, store:stores(id, name, slug, logo_url)')
        .eq('user_id', userId)

    if (!memberships?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentMembership = memberships.find(m => (m.store as any)?.slug === slug)
    if (!currentMembership) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const storeId = currentMembership.store_id

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
        { data: store },
        { count: productCount },
        { data: orderAgg },
        { data: recentOrders },
        { data: integrations },
        { data: funnelRows },
        { data: topProductRows },
    ] = await Promise.all([
        supabase
            .from('stores')
            .select('id, name, slug, logo_url, is_active, currency, custom_domain, settings, is_pro, views')
            .eq('id', storeId)
            .single(),

        supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('is_active', true),

        supabase
            .from('orders')
            .select('total, status')
            .eq('store_id', storeId),

        supabase
            .from('orders')
            .select('id, customer_email, customer_phone, total, status, created_at, order_number')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(5),

        supabase
            .from('store_integrations')
            .select('provider, is_active')
            .eq('store_id', storeId),

        // ── Funnel: aggregate event counts from store_analytics (last 7d) ──
        supabase
            .from('store_analytics')
            .select('event')
            .eq('store_id', storeId)
            .gte('created_at', since7d),

        // ── Top product: order_items this month, joined to products ──
        supabase
            .from('order_items')
            .select(`
                quantity,
                price,
                total,
                product:products ( id, name, images )
            `)
            .gte('created_at', monthStart)
            // filter to this store via the orders join
            .in(
                'order_id',
                // subquery: all order IDs for this store this month
                (await supabase
                    .from('orders')
                    .select('id')
                    .eq('store_id', storeId)
                    .gte('created_at', monthStart)
                ).data?.map(o => o.id) ?? []
            ),
    ])

    if (!store) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const settings = (store.settings ?? {}) as Record<string, unknown>

    const revenueTotal = (orderAgg ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)
    const orderCount = orderAgg?.length ?? 0

    const mpesaEnabled = integrations?.some(i => i.provider === 'mpesa' && i.is_active) ?? false
    const paypalEnabled = integrations?.some(i => i.provider === 'paypal' && i.is_active) ?? false
    const stripeEnabled = integrations?.some(i => i.provider === 'stripe' && i.is_active) ?? false

    // ── Funnel ─────────────────────────────────────────────────────────────────
    // Count each event type from store_analytics rows returned above.
    // views falls back to stores.views (all-time counter) when no analytics rows
    // exist yet — gives a non-zero number on day one.
    const eventCounts = (funnelRows ?? []).reduce(
        (acc, row) => {
            if (row.event in acc) acc[row.event as keyof typeof acc]++
            return acc
        },
        { view: 0, add_to_cart: 0, checkout_started: 0, order_placed: 0 }
    )

    const funnel = {
        views: store.views ?? 0,
        add_to_carts: eventCounts.add_to_cart,
        checkouts: eventCounts.checkout_started,
        orders: eventCounts.order_placed,
    }

    // ── Top product ────────────────────────────────────────────────────────────
    type ProductAgg = {
        id: string
        name: string
        image_url?: string
        revenue: number
        units_sold: number
    }

    const productMap = new Map<string, ProductAgg>()

    for (const row of topProductRows ?? []) {
        const p = row.product as any
        if (!p?.id) continue
        const existing = productMap.get(p.id)
        // use row.total (already price × qty) rather than recomputing
        const lineRevenue = (row.total ?? row.price * row.quantity)
        const units = row.quantity ?? 0
        const imageUrl = Array.isArray(p.images)
            ? (p.images[0] as any)?.url ?? p.images[0] ?? undefined
            : undefined

        if (existing) {
            existing.revenue += lineRevenue
            existing.units_sold += units
        } else {
            productMap.set(p.id, {
                id: p.id,
                name: p.name,
                image_url: imageUrl,
                revenue: lineRevenue,
                units_sold: units,
            })
        }
    }

    const topProduct = productMap.size > 0
        ? [...productMap.values()].sort((a, b) => b.revenue - a.revenue)[0]
        : null

    return NextResponse.json({
        store: {
            name: store.name,
            slug: store.slug,
            logo_url: store.logo_url,
            active: store.is_active ?? false,
            product_count: productCount ?? 0,
            order_count: orderCount,
            revenue_total: revenueTotal,
            currency: store.currency,
            primary_color: (settings.primaryColor as string) ?? null,
            theme: (settings.themeId as string) ?? null,
            payments_enabled: mpesaEnabled || paypalEnabled || stripeEnabled,
            mpesa_enabled: mpesaEnabled,
            paypal_enabled: paypalEnabled,
            custom_domain_verified: !!store.custom_domain,
            notifications_enabled: false,
        },
        recent_orders: (recentOrders ?? []).map(o => ({
            id: o.id,
            customer_name: o.customer_email ?? o.customer_phone ?? `Order ${o.order_number}`,
            total: o.total,
            status: o.status,
            created_at: o.created_at,
        })),
        funnel,
        top_product: topProduct,
    })
}