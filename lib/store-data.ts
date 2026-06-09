// Shared server-side store-settings data loader.
// Used directly by the settings layout (no HTTP self-fetch) AND by
// /api/store/[slug] (so client components keep working). Querying Supabase
// directly removes a full network round-trip on every settings page load.

import { createClient } from '@/lib/server'

export type StoreSettingsResult =
    | { error: 'forbidden' | 'not_found' | 'unknown'; data: null }
    // User IS a member of the store, but the org slug in the URL is wrong.
    // `correctOrgSlug` is where the store actually lives, so the caller can redirect.
    | { error: 'wrong_org'; data: null; correctOrgSlug: string }
    | { error: null; data: any }

export async function getStoreSettingsData(
    userId: string,
    slug: string,
    orgSlug: string
): Promise<StoreSettingsResult> {
    const supabase = await createClient()

    // Logged-in user's own profile + all their store memberships, in parallel.
    const [{ data: sessionUser }, { data: memberships }] = await Promise.all([
        supabase
            .from('users')
            .select('id, name, email, avatar_url')
            .eq('id', userId)
            .single(),
        supabase
            .from('store_members')
            .select(`
                store_id,
                role,
                store:stores( id, name, slug, logo_url, org:orgs(slug) )
            `)
            .eq('user_id', userId),
    ])

    if (!memberships?.length) return { error: 'forbidden', data: null }

    // Match by store slug first (the user's actual membership)…
    const bySlug = memberships.find((m) => {
        const s = Array.isArray(m.store) ? m.store[0] : m.store
        return s?.slug === slug
    })
    if (!bySlug?.store_id) return { error: 'not_found', data: null }

    // …then authorize the org in the URL. If the user is a member but the org
    // slug is wrong, report the correct org so the caller can redirect them.
    const matchedStore = Array.isArray(bySlug.store) ? bySlug.store[0] : bySlug.store
    const matchedOrg = Array.isArray(matchedStore?.org) ? matchedStore.org[0] : matchedStore?.org
    if (matchedOrg?.slug && matchedOrg.slug !== orgSlug) {
        return { error: 'wrong_org', data: null, correctOrgSlug: matchedOrg.slug }
    }

    const currentMembership = bySlug

    const { data: storeData, error } = await supabase
        .from('stores')
        .select(`*, theme:store_themes(*)`)
        .eq('id', currentMembership.store_id)
        .single()

    if (error) console.error('[store fetch]', error.code, error.message)
    if (!storeData) return { error: 'not_found', data: null }

    // Optional org layer — null for stores not associated with an org.
    let org: { id: string; name: string; slug: string; logo_url: string | null } | null = null
    if (storeData.org_id) {
        const { data: orgData } = await supabase
            .from('orgs')
            .select('id, name, slug, logo_url')
            .eq('id', storeData.org_id)
            .single()
        org = orgData ?? null
    }

    const allStores = memberships.map((m) => {
        const memberStore = Array.isArray(m.store) ? m.store[0] : m.store
        const memberOrg = Array.isArray(memberStore?.org) ? memberStore.org[0] : memberStore?.org
        return {
            id: memberStore?.id ?? '',
            name: memberStore?.name ?? '',
            slug: memberStore?.slug ?? '',
            logo_url: memberStore?.logo_url ?? null,
            role: m.role,
            org_slug: memberOrg?.slug ?? null,
        }
    })

    return {
        error: null,
        data: {
            ...storeData,
            user: sessionUser ?? {
                id: userId,
                name: '',
                email: '',
                avatar_url: null,
            },
            role: currentMembership.role,
            allStores,
            org,
        },
    }
}

// ── Store overview (dashboard KPIs, funnel, recent orders, top product) ──────
// Extracted so it can run during the page's server render (initial data arrives
// with the page) instead of a post-mount client fetch.
export async function getStoreOverview(
    userId: string,
    slug: string,
    orgSlug: string
): Promise<StoreSettingsResult> {
    const supabase = await createClient()

    const { data: memberships } = await supabase
        .from('store_members')
        .select('store_id, role, store:stores(id, name, slug, logo_url, org:orgs(slug))')
        .eq('user_id', userId)

    if (!memberships?.length) return { error: 'forbidden', data: null }

    const bySlug = memberships.find(m => (m.store as any)?.slug === slug)
    if (!bySlug) return { error: 'not_found', data: null }

    // Authorize the org; redirect-friendly wrong_org when the member's URL is off.
    const matchedStore = bySlug.store as any
    const matchedOrg = Array.isArray(matchedStore?.org) ? matchedStore.org[0] : matchedStore?.org
    if (matchedOrg?.slug && matchedOrg.slug !== orgSlug) {
        return { error: 'wrong_org', data: null, correctOrgSlug: matchedOrg.slug }
    }

    const currentMembership = bySlug

    const storeId = currentMembership.store_id

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Order IDs for this store this month — needed to scope order_items.
    const { data: monthOrderIds } = await supabase
        .from('orders')
        .select('id')
        .eq('store_id', storeId)
        .gte('created_at', monthStart)

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
        supabase
            .from('store_analytics')
            .select('event')
            .eq('store_id', storeId)
            .gte('created_at', since7d),
        supabase
            .from('order_items')
            .select(`quantity, price, total, product:products ( id, name, images )`)
            .gte('created_at', monthStart)
            .in('order_id', monthOrderIds?.map(o => o.id) ?? []),
    ])

    if (!store) return { error: 'not_found', data: null }

    const settings = (store.settings ?? {}) as Record<string, unknown>
    const revenueTotal = (orderAgg ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)
    const orderCount = orderAgg?.length ?? 0

    const mpesaEnabled = integrations?.some(i => i.provider === 'mpesa' && i.is_active) ?? false
    const paypalEnabled = integrations?.some(i => i.provider === 'paypal' && i.is_active) ?? false
    const stripeEnabled = integrations?.some(i => i.provider === 'stripe' && i.is_active) ?? false

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

    type ProductAgg = { id: string; name: string; image_url?: string; revenue: number; units_sold: number }
    const productMap = new Map<string, ProductAgg>()

    for (const row of topProductRows ?? []) {
        const p = row.product as any
        if (!p?.id) continue
        const existing = productMap.get(p.id)
        const lineRevenue = (row.total ?? row.price * row.quantity)
        const units = row.quantity ?? 0
        const imageUrl = Array.isArray(p.images)
            ? (p.images[0] as any)?.url ?? p.images[0] ?? undefined
            : undefined
        if (existing) {
            existing.revenue += lineRevenue
            existing.units_sold += units
        } else {
            productMap.set(p.id, { id: p.id, name: p.name, image_url: imageUrl, revenue: lineRevenue, units_sold: units })
        }
    }

    const topProduct = productMap.size > 0
        ? [...productMap.values()].sort((a, b) => b.revenue - a.revenue)[0]
        : null

    return {
        error: null,
        data: {
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
                is_pro: store.is_pro ?? false,
                payments_enabled: mpesaEnabled || paypalEnabled || stripeEnabled,
                mpesa_enabled: mpesaEnabled,
                paypal_enabled: paypalEnabled,
                custom_domain_set: !!store.custom_domain,
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
        },
    }
}
