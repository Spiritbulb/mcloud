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

    // 7 days ago ISO string — used for funnel window
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Start of current calendar month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
        { data: store },
        { count: productCount },
        { data: orderAgg },
        { data: recentOrders },
        { data: integrations },
        { data: recentOrderCount },   // funnel: orders last 7d
        { data: topProductRows },     // top product this month
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

        // Funnel: orders in last 7d
        supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .gte('created_at', since),

        // Top product this month: join order_items → products, sum revenue + units
        supabase
            .from('order_items')
            .select(`
        quantity,
        price,
        product:products ( id, name, images )
      `)
            .eq('store_id', storeId)
            .gte('created_at', monthStart),
    ])

    if (!store) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const settings = (store.settings ?? {}) as Record<string, unknown>

    const revenueTotal = (orderAgg ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)
    const orderCount = orderAgg?.length ?? 0

    const mpesaEnabled = integrations?.some(i => i.provider === 'mpesa' && i.is_active) ?? false
    const paypalEnabled = integrations?.some(i => i.provider === 'paypal' && i.is_active) ?? false
    const stripeEnabled = integrations?.some(i => i.provider === 'stripe' && i.is_active) ?? false

    // ── Top product ────────────────────────────────────────────────────────────
    // Aggregate order_items client-side (avoids a raw SQL call)
    type ProductAgg = { id: string; name: string; image_url?: string; revenue: number; units_sold: number }
    const productMap = new Map<string, ProductAgg>()

    for (const row of topProductRows ?? []) {
        const p = row.product as any
        if (!p?.id) continue
        const existing = productMap.get(p.id)
        const lineRevenue = (row.price ?? 0) * (row.quantity ?? 0)
        if (existing) {
            existing.revenue += lineRevenue
            existing.units_sold += row.quantity ?? 0
        } else {
            productMap.set(p.id, {
                id: p.id,
                name: p.name,
                image_url: Array.isArray(p.images) ? p.images[0] ?? undefined : undefined,
                revenue: lineRevenue,
                units_sold: row.quantity ?? 0,
            })
        }
    }

    const topProduct = productMap.size > 0
        ? [...productMap.values()].sort((a, b) => b.revenue - a.revenue)[0]
        : null

    // ── Funnel ─────────────────────────────────────────────────────────────────
    // views comes from stores.views (your new column — total all-time counter)
    // For a 7d window approximation we just surface the raw total for now;
    // swap for a time-series table later if needed.
    const funnel = {
        views: store.views ?? 0,
        orders_7d: recentOrderCount?.length ?? 0,  // count from head query above
    }

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