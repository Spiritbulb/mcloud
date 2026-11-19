// Shared server-side store-settings data loader.
// Used directly by the settings layout (no HTTP self-fetch) AND by
// /api/store/[slug] (so client components keep working). Querying Supabase
// directly removes a full network round-trip on every settings page load.

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient, createPublicClient } from '@mcloud/db/server'
import { isPaidPlan } from './plans'
import { getStorePlan } from './plans-server'
import { getVertical } from '@mcloud/verticals'
import { dailySeries } from './overview-series'

export type StoreSettingsResult =
    | { error: 'forbidden' | 'not_found' | 'unknown'; data: null }
    // User IS a member of the store, but the org slug in the URL is wrong.
    // `correctOrgSlug` is where the store actually lives, so the caller can redirect.
    | { error: 'wrong_org'; data: null; correctOrgSlug: string }
    | { error: null; data: any }

async function loadStoreSettingsData(
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
                store:stores( id, name, slug, logo_url, icon_url, org:orgs(slug) )
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

    // The store, its org and its plan are independent of each other, so they go out together
    // (the org rides along as an embed instead of a second round trip).
    const [{ data: storeRow, error }, plan] = await Promise.all([
        supabase
            .from('stores')
            .select(`*, theme:store_themes(*), org:orgs(id, name, slug, logo_url, icon_url)`)
            .eq('id', currentMembership.store_id)
            .single(),
        // `stores.is_pro` is a legacy cache that drifts; the plan comes from the subscription rows.
        getStorePlan(currentMembership.store_id),
    ])

    if (error) console.error('[store fetch]', error.code, error.message)
    if (!storeRow) return { error: 'not_found', data: null }

    // Optional org layer: null for stores not associated with an org.
    const { org: orgEmbed, ...storeData } = storeRow as typeof storeRow & { org?: unknown }
    const org = ((Array.isArray(orgEmbed) ? orgEmbed[0] : orgEmbed) ?? null) as
        | { id: string; name: string; slug: string; logo_url: string | null; icon_url: string | null }
        | null

    const allStores = memberships.map((m) => {
        const memberStore = Array.isArray(m.store) ? m.store[0] : m.store
        const memberOrg = Array.isArray(memberStore?.org) ? memberStore.org[0] : memberStore?.org
        return {
            id: memberStore?.id ?? '',
            name: memberStore?.name ?? '',
            slug: memberStore?.slug ?? '',
            logo_url: memberStore?.logo_url ?? null,
            icon_url: memberStore?.icon_url ?? null,
            role: m.role,
            org_slug: memberOrg?.slug ?? null,
        }
    })

    return {
        error: null,
        data: {
            ...storeData,
            is_pro: isPaidPlan(plan),
            plan,
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

/**
 * Memoised per request: the settings layout, the page under it and the editor/content pages all
 * ask for the same store, and one render should hit the database once. Treat the result as
 * read-only; it is shared between callers.
 */
export const getStoreSettingsData = cache(loadStoreSettingsData)

/** What store_overview_totals() returns (migrations/20261118_store_overview_totals.sql). */
type OverviewTotals = {
    order_count: number
    revenue_total: number
    total_raised: number
    donation_count: number
    raised_by_campaign: Record<string, number>
    events: { view: number; add_to_cart: number; checkout_started: number; order_placed: number }
}

const EMPTY_TOTALS: OverviewTotals = {
    order_count: 0,
    revenue_total: 0,
    total_raised: 0,
    donation_count: 0,
    raised_by_campaign: {},
    events: { view: 0, add_to_cart: 0, checkout_started: 0, order_placed: 0 },
}

/** How stale the Overview's lifetime and 7-day totals may be. Recent orders and the trend are live. */
export const OVERVIEW_TOTALS_TTL_S = 60

/**
 * The store's lifetime totals and 7-day event counts, summed in the database and kept in the data
 * cache for a minute, so reopening the dashboard does not re-aggregate every order each time.
 *
 * Callers authorise the store before asking (the membership check in the loader). This runs
 * without cookies, as `unstable_cache` requires, so it uses the same service-role client minus the
 * `cookies()` read. A failed call is not cached: it throws out of the cache and the caller falls
 * back to zeros, so one bad minute does not stick.
 */
const loadOverviewTotals = (storeId: string) =>
    unstable_cache(
        async (): Promise<OverviewTotals> => {
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            const { data, error } = await createPublicClient().rpc('store_overview_totals', {
                p_store_id: storeId,
                p_since: since,
            })
            if (error || !data) throw new Error(error?.message ?? 'store_overview_totals returned nothing')
            return { ...EMPTY_TOTALS, ...(data as Partial<OverviewTotals>) }
        },
        ['store-overview-totals', storeId],
        { revalidate: OVERVIEW_TOTALS_TTL_S, tags: [`store-overview:${storeId}`] },
    )()

// ── Store overview (dashboard KPIs, funnel, recent orders, top product) ──────
// Extracted so it can run during the page's server render (initial data arrives
// with the page) instead of a post-mount client fetch.
async function loadStoreOverview(
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
    // 15 days back covers the 14 Nairobi days of the trend whatever the server's time zone.
    const sinceTrend = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
        plan,
        { data: store },
        { count: productCount },
        totals,
        { data: recentOrders },
        { data: integrations },
        { data: topProductRows },
        { count: orders7dCount },
        { count: deliveryZoneCount },
        { data: trendOrders },
    ] = await Promise.all([
        getStorePlan(storeId),
        supabase
            .from('stores')
            // `type` carries the vertical through to the Overview. Without it the
            // dashboard cannot tell a shop from an NGO and shows commerce tiles to
            // everyone.
            .select('id, name, slug, logo_url, is_active, currency, custom_domain, settings, is_pro, views, type')
            .eq('id', storeId)
            .single(),
        supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('is_active', true),
        loadOverviewTotals(storeId).catch((err) => {
            console.error('[overview totals]', err)
            return EMPTY_TOTALS
        }),
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
            .from('order_items')
            // Scoped to the store through the order (an inner join), not a pre-fetched id list: that
            // needed its own round trip first and put every order id into the URL.
            .select(`quantity, price, total, product:products ( id, name, images ), order:orders!inner ( store_id, created_at )`)
            .gte('created_at', monthStart)
            .eq('order.store_id', storeId)
            .gte('order.created_at', monthStart),
        // Real 7-day order count for the funnel's Orders step. Sourced from the
        // orders table, not order_placed events (which are unreliable), and
        // windowed to match the 7-day event slice above.
        supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .gte('created_at', since7d)
            .not('status', 'in', '(cancelled,refunded)'),
        // Setup checklist: has the shop said where it delivers?
        supabase
            .from('delivery_zones')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId),
        // The 14-day trend reads only its own window, so a busy store's row cap cannot cut it short.
        supabase
            .from('orders')
            .select('total, status, metadata, created_at')
            .eq('store_id', storeId)
            .gte('created_at', sinceTrend),
    ])

    if (!store) return { error: 'not_found', data: null }

    const settings = (store.settings ?? {}) as Record<string, unknown>
    const revenueTotal = Number(totals.revenue_total) || 0
    const orderCount = Number(totals.order_count) || 0

    const mpesaEnabled = integrations?.some(i => i.provider === 'mpesa' && i.is_active) ?? false
    const paypalEnabled = integrations?.some(i => i.provider === 'paypal' && i.is_active) ?? false
    const stripeEnabled = integrations?.some(i => i.provider === 'stripe' && i.is_active) ?? false

    const eventCounts = totals.events

    // Funnel — every step from the SAME 7-day window so rates are comparable.
    // Views use 7-day view events (not the lifetime store.views counter), and
    // orders use the real 7-day order count (not the unreliable order_placed event).
    const funnel = {
        views: eventCounts.view,
        add_to_carts: eventCounts.add_to_cart,
        checkouts: eventCounts.checkout_started,
        orders: orders7dCount ?? 0,
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

    // ── Donations ────────────────────────────────────────────────────────────
    // Donations are orders tagged in metadata, not a separate table. This mirrors
    // apps/storefront/lib/campaigns.ts:loadCampaignsWithProgress exactly, which
    // filters at the DB with `metadata->>isDonation = 'true'` and
    // `metadata->>payment_status = 'completed'`, then sums `total` by campaignId.
    // `->>` renders JSON to text, so the boolean `true` written by
    // buildDonationMetadata matches the string 'true'. store_overview_totals() applies the same
    // filter, so the two readers cannot disagree on what counts as a completed donation (if they
    // did, the Overview and the storefront progress bars would show different numbers).
    const campaigns = Array.isArray((settings as any).campaigns)
        ? ((settings as any).campaigns as any[])
        : []

    // Summed by store_overview_totals(); same rule as lib/campaigns.ts (isDonation true + completed).
    const raisedById = totals.raised_by_campaign ?? {}
    const totalRaised = Number(totals.total_raised) || 0
    const donationCount = Number(totals.donation_count) || 0

    // Same tolerance as readCampaigns(): a campaign without a string id AND title
    // is not a campaign the storefront would render, so do not report on it.
    const campaignProgress = campaigns
        .filter((c) => c && typeof c.id === 'string' && typeof c.title === 'string')
        .map((c) => {
            const raised = Number(raisedById[c.id]) || 0
            const goal = typeof c.goalAmount === 'number' && c.goalAmount > 0 ? c.goalAmount : 0
            return {
                id: c.id as string,
                title: c.title as string,
                raised,
                goal,
                percent: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
            }
        })
        .sort((a, b) => b.raised - a.raised)

    return {
        error: null,
        data: {
            store: {
                id: store.id,
                name: store.name,
                slug: store.slug,
                logo_url: store.logo_url,
                type: store.type ?? null,
                active: store.is_active ?? false,
                product_count: productCount ?? 0,
                order_count: orderCount,
                revenue_total: revenueTotal,
                currency: store.currency,
                primary_color: (settings.primaryColor as string) ?? null,
                theme: (settings.themeId as string) ?? null,
                is_pro: isPaidPlan(plan),
                plan,
                payments_enabled: mpesaEnabled || paypalEnabled || stripeEnabled,
                mpesa_enabled: mpesaEnabled,
                paypal_enabled: paypalEnabled,
custom_domain: store.custom_domain ?? null,
                custom_domain_set: !!store.custom_domain,
                notifications_enabled: false,
                delivery_zone_count: deliveryZoneCount ?? 0,
                // Raw flags object; the storefront reads it with parseChecklistState().
                setup_checklist: settings.setup_checklist ?? null,
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
            total_raised: totalRaised,
            donation_count: donationCount,
            campaign_progress: campaignProgress,
            daily: dailySeries(trendOrders ?? [], { days: 14, now, commerce: getVertical(store.type).commerce }),
        },
    }
}

/** Memoised per request, like getStoreSettingsData. Treat the result as read-only. */
export const getStoreOverview = cache(loadStoreOverview)
