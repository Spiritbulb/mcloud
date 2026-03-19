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

    // Verify membership
    const { data: memberships } = await supabase
        .from('store_members')
        .select('store_id, role, store:stores(id, name, slug, logo_url)')
        .eq('user_id', userId)

    if (!memberships?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const currentMembership = memberships.find(m => m.store?.slug === slug)
    if (!currentMembership) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const storeId = currentMembership.store_id

    // Run everything in parallel
    const [
        { data: store },
        { count: productCount },
        { data: orderAgg },
        { data: recentOrders },
        { data: integrations },
    ] = await Promise.all([
        supabase
            .from('stores')
            .select('id, name, slug, logo_url, is_active, currency, custom_domain, settings, is_pro')
            .eq('id', storeId)
            .single(),

        supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('is_active', true),

        // Sum total revenue and count orders
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
    ])

    if (!store) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const settings = (store.settings ?? {}) as Record<string, unknown>

    const revenueTotal = (orderAgg ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)
    const orderCount = orderAgg?.length ?? 0

    const mpesaEnabled = integrations?.some(i => i.provider === 'mpesa' && i.is_active) ?? false
    const paypalEnabled = integrations?.some(i => i.provider === 'paypal' && i.is_active) ?? false
    const stripeEnabled = integrations?.some(i => i.provider === 'stripe' && i.is_active) ?? false

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
            notifications_enabled: false, // no column yet
        },
        recent_orders: (recentOrders ?? []).map(o => ({
            id: o.id,
            // no customer_name column — use email, phone, or order number as fallback
            customer_name: o.customer_email ?? o.customer_phone ?? `Order ${o.order_number}`,
            total: o.total,
            status: o.status,
            created_at: o.created_at,
        })),
    })
}