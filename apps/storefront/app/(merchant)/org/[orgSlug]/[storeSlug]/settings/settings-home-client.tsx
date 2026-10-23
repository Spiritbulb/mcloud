'use client'

// The store Overview: how the site is doing and what to do next. Data comes from the server render
// (getStoreOverview); when it could not, the page fetches it and the kit draws the loading state.

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getVertical } from '@mcloud/verticals'
import { storefrontUrl, storefrontDisplayUrl, openExternal } from '@mcloud/merchant/storefront-url'
import { Badge, type BadgeTone } from '@mcloud/ui/kit/badge'
import { Button, buttonClass } from '@mcloud/ui/kit/button'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Skeleton, SkeletonLines } from '@mcloud/ui/kit/skeleton'
import { Stat, StatStrip } from '@mcloud/ui/kit/stat-strip'
import { timeAgo } from '@mcloud/ui/kit/ui-logic'
import { webUrl } from '@/lib/host'
import { formatCurrency, funnelRate, overviewHeadline, overviewSummary } from './overview-logic'

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
    id: string
    customer_name: string
    total: number
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
    created_at: string
}

type StoreOverview = {
    name: string
    slug: string
    logo_url?: string
    // The vertical. Drives which tiles this dashboard shows: a non-commerce site
    // has no products, revenue, or cart funnel to report on.
    type?: string | null
    active: boolean
    product_count: number
    order_count: number
    revenue_total: number
    currency: string
    is_pro?: boolean
    payments_enabled?: boolean
    mpesa_enabled?: boolean
    paypal_enabled?: boolean
    custom_domain?: string | null
    custom_domain_set?: boolean
    primary_color?: string | null
    theme?: string | null
    notifications_enabled?: boolean
}

type CampaignProgress = {
    id: string
    title: string
    raised: number
    goal: number
    percent: number
}

type Funnel = {
    views: number
    add_to_carts: number
    checkouts: number
    orders: number
}

type TopProduct = {
    id: string
    name: string
    image_url?: string
    revenue: number
    units_sold: number
}

type OverviewData = {
    store: StoreOverview
    recent_orders: Order[]
    funnel?: Funnel
    top_product?: TopProduct
    total_raised?: number
    donation_count?: number
    campaign_progress?: CampaignProgress[]
}

const STATUS_TONE: Record<Order['status'], BadgeTone> = {
    pending: 'warning',
    paid: 'success',
    processing: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger',
    refunded: 'neutral',
}

function statusText(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function CopyLink({ url }: { url: string }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard?.writeText(url).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
        })
    }
    return (
        <Button onClick={copy}>
            <Icon name={copied ? 'check' : 'content_copy'} size={15} />
            {copied ? 'Copied' : 'Copy link'}
        </Button>
    )
}

function FunnelPanel({ funnel, loading, analyticsHref }: { funnel?: Funnel; loading: boolean; analyticsHref: string }) {
    const views = funnel?.views ?? 0
    const steps = [
        { label: 'Views', value: funnel?.views ?? 0, rate: null },
        { label: 'Added to cart', value: funnel?.add_to_carts ?? 0, rate: funnelRate(funnel?.add_to_carts ?? 0, views) },
        { label: 'Checkouts started', value: funnel?.checkouts ?? 0, rate: funnelRate(funnel?.checkouts ?? 0, views) },
        { label: 'Orders placed', value: funnel?.orders ?? 0, rate: funnelRate(funnel?.orders ?? 0, views) },
    ]
    return (
        <Panel
            title="Last 7 days"
            description="Site visits to purchases"
            action={<Link href={analyticsHref} className="text-primary hover:underline">Full report</Link>}
            flush
        >
            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
                {steps.map((step) => (
                    <div key={step.label} className="bg-card p-4">
                        <p className="text-[12px] text-muted-foreground">{step.label}</p>
                        {loading
                            ? <Skeleton className="mt-2.5 h-5 w-12" />
                            : <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{step.value.toLocaleString()}</p>}
                        {!loading && step.rate && <p className="mt-0.5 text-[12px] text-muted-foreground">{step.rate} of views</p>}
                    </div>
                ))}
            </div>
        </Panel>
    )
}

function HighlightRow({ icon, image, eyebrow, title, detail, value, href, progress }: {
    icon: string
    image?: string
    eyebrow: string
    title: string
    detail: string
    value: string
    href: string
    progress?: number
}) {
    return (
        <Link href={href} className="block px-4 py-3 transition-colors hover:bg-muted/40">
            <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={image} alt="" className="h-full w-full object-cover" />
                        : <Icon name={icon} size={17} className="text-muted-foreground" />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-muted-foreground">{eyebrow}</span>
                    <span className="block truncate text-[13px] font-medium text-foreground">{title}</span>
                    <span className="block text-[12px] text-muted-foreground">{detail}</span>
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-foreground">{value}</span>
            </div>
            {progress !== undefined && (
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
            )}
        </Link>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsHomeClient({ slug, orgSlug, initialData = null }: {
    slug: string; orgSlug: string; initialData?: OverviewData | null
}) {
    const [data, setData] = useState<OverviewData | null>(initialData)
    // When the server already provided data, render it immediately: no fetch, no skeleton.
    const [loading, setLoading] = useState(!initialData)
    const [error, setError] = useState(false)
    const [now] = useState(() => Date.now())

    const load = useCallback(() => {
        setLoading(true)
        setError(false)
        fetch(`/api/store/${slug}/overview?org=${encodeURIComponent(orgSlug)}`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [slug, orgSlug])

    useEffect(() => {
        // Server render supplied the data; skip the redundant client round-trip.
        if (!initialData) load()
    }, [initialData, load])

    const settings = (tab: string) => `/org/${orgSlug}/${slug}/settings/${tab}`
    const store = data?.store

    // Gate on the vertical's `commerce` flag, never on a specific id: a future non-commerce vertical
    // must inherit the donation dashboard for free. An NGO has no products, revenue or cart.
    const commerce = getVertical(store?.type).commerce
    const campaigns = data?.campaign_progress ?? []
    const topCampaign = campaigns[0]
    const orders = data?.recent_orders ?? []
    const currency = store?.currency ?? 'KES'
    const raised = data?.total_raised ?? 0
    const hasMoney = commerce ? (store?.revenue_total ?? 0) > 0 : raised > 0
    // payments_enabled already aggregates mpesa || paypal || stripe (set server-side)
    const paymentsNeeded = !loading && store && !store.payments_enabled
    const siteUrl = store ? storefrontUrl(store.slug, store.custom_domain) : ''

    if (error && !store) {
        return (
            <Panel flush>
                <LoadError title="Couldn't load your overview" onRetry={load} />
            </Panel>
        )
    }

    return (
        <div className="space-y-6">
            {store ? (
                <PageHeader
                    title={overviewHeadline(store.name, commerce, hasMoney)}
                    description={
                        <span className="flex flex-wrap items-center gap-2">
                            <Badge tone={store.active ? 'success' : 'danger'}>{store.active ? 'Live' : 'Offline'}</Badge>
                            <span>{storefrontDisplayUrl(store.slug, store.custom_domain)}</span>
                        </span>
                    }
                    actions={
                        <>
                            <CopyLink url={siteUrl} />
                            <a
                                href={siteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                // The storefront is customer-facing: force it out of the TWA shell
                                // into the browser rather than navigating inside the merchant app.
                                onClick={(e) => { e.preventDefault(); openExternal(siteUrl) }}
                                className={buttonClass('primary')}
                            >
                                <Icon name="open_in_new" size={15} />
                                View site
                            </a>
                        </>
                    }
                />
            ) : (
                <div className="space-y-2">
                    <Skeleton className="h-6 w-64" />
                    <Skeleton className="h-4 w-40" />
                </div>
            )}

            {store && (
                <p className="max-w-2xl text-[13px] text-muted-foreground">
                    {overviewSummary({ commerce, revenue: store.revenue_total, raised, currency })}
                </p>
            )}

            <StatStrip className="grid-cols-1 sm:grid-cols-3">
                {commerce ? (
                    <>
                        <Stat label="Revenue" value={formatCurrency(store?.revenue_total ?? 0, currency)} hint="All time" loading={loading} />
                        <Stat label="Orders" value={String(store?.order_count ?? 0)} loading={loading} />
                        <Stat label="Products" value={String(store?.product_count ?? 0)} loading={loading} />
                    </>
                ) : (
                    <>
                        <Stat label="Total raised" value={formatCurrency(raised, currency)} hint="All time" loading={loading} />
                        <Stat label="Donations" value={String(data?.donation_count ?? 0)} loading={loading} />
                        <Stat label="Campaigns" value={String(campaigns.length)} loading={loading} />
                    </>
                )}
            </StatStrip>

            {paymentsNeeded && (
                <Panel title="Set up payments">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13px] text-muted-foreground">
                            {commerce
                                ? 'Connect M-Pesa or PayPal so customers can check out. Takes about 2 minutes.'
                                : 'Connect M-Pesa or PayPal so people can donate. Takes about 2 minutes.'}
                        </p>
                        <Link href={settings('integrations/payments')} className={buttonClass('primary', 'sm')}>Set up payments</Link>
                    </div>
                </Panel>
            )}

            {/* The funnel is commerce only: an NGO's visitors never add to cart. */}
            {commerce && <FunnelPanel funnel={data?.funnel} loading={loading} analyticsHref={settings('analytics')} />}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Panel
                    title={commerce ? 'Recent orders' : 'Recent donations'}
                    action={<Link href={settings('orders')} className="text-primary hover:underline">View all</Link>}
                    flush
                >
                    {loading ? (
                        <div className="p-4"><SkeletonLines lines={4} /></div>
                    ) : orders.length === 0 ? (
                        <EmptyState
                            icon={commerce ? 'rocket_launch' : 'volunteer_activism'}
                            title={commerce ? 'Your first sale is close' : 'Your first donation is close'}
                            description={commerce
                                ? (store && store.product_count > 0
                                    ? 'Your products are live. Share your store link and watch the orders roll in.'
                                    : 'Add a product, then share your link. Orders show up here the moment a customer checks out.')
                                : (campaigns.length > 0
                                    ? 'Your campaigns are live. Share your link and donations show up here.'
                                    : 'Add a campaign, then share your link. Donations show up here the moment someone gives.')}
                            action={
                                commerce
                                    ? (store && store.product_count > 0
                                        ? <Link href={settings('orders')} className={buttonClass('secondary', 'sm')}>View orders</Link>
                                        : <Link href={settings('products')} className={buttonClass('primary', 'sm')}>Add your first product</Link>)
                                    : (campaigns.length > 0
                                        ? <Link href={settings('orders')} className={buttonClass('secondary', 'sm')}>View donations</Link>
                                        : <Link href={settings('content')} className={buttonClass('primary', 'sm')}>Add your first campaign</Link>)
                            }
                        />
                    ) : (
                        <ul className="divide-y divide-border">
                            {orders.slice(0, 5).map((order) => (
                                <li key={order.id}>
                                    <Link href={settings('orders')} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-medium text-foreground">{order.customer_name}</span>
                                            <span className="block text-[12px] text-muted-foreground">{timeAgo(order.created_at, now)}</span>
                                        </span>
                                        <span className="text-[13px] font-medium tabular-nums">{formatCurrency(order.total, currency)}</span>
                                        <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>{statusText(order.status)}</Badge>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <div className="space-y-6">
                    {commerce ? (
                        (loading || data?.top_product) && (
                            <Panel title="Top product" flush>
                                {loading || !data?.top_product ? (
                                    <div className="p-4"><SkeletonLines lines={2} /></div>
                                ) : (
                                    <HighlightRow
                                        icon="inventory_2"
                                        image={data.top_product.image_url}
                                        eyebrow="Best seller this month"
                                        title={data.top_product.name}
                                        detail={`${data.top_product.units_sold} sold this month`}
                                        value={formatCurrency(data.top_product.revenue, currency)}
                                        href={settings('products')}
                                    />
                                )}
                            </Panel>
                        )
                    ) : (
                        (loading || topCampaign) && (
                            <Panel title="Top campaign" flush>
                                {loading || !topCampaign ? (
                                    <div className="p-4"><SkeletonLines lines={2} /></div>
                                ) : (
                                    <HighlightRow
                                        icon="volunteer_activism"
                                        eyebrow="Raised the most"
                                        title={topCampaign.title}
                                        detail={topCampaign.goal > 0 ? `${topCampaign.percent}% of ${formatCurrency(topCampaign.goal, currency)} goal` : 'No goal set'}
                                        value={formatCurrency(topCampaign.raised, currency)}
                                        href={settings('content')}
                                        progress={topCampaign.goal > 0 ? topCampaign.percent : undefined}
                                    />
                                )}
                            </Panel>
                        )
                    )}

                    {!loading && store && !store.is_pro && (
                        <Panel
                            title="Grow with Pro"
                            description="Your own domain, advanced analytics, a blog, and your branding out front."
                            footer={<a href={webUrl(`/org/${orgSlug}/billing`)} className={buttonClass('primary', 'sm')}>See plans</a>}
                        >
                            <p className="text-[12px] text-muted-foreground">Plans are paid from your organization wallet in Billing.</p>
                        </Panel>
                    )}
                </div>
            </div>
        </div>
    )
}
