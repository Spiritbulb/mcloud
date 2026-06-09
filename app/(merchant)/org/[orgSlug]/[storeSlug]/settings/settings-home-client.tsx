'use client'

// app/(storefront)/store/[slug]/settings/settings-home-client.tsx

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { TabId } from './settings-shell'

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
    active: boolean
    product_count: number
    order_count: number
    revenue_total: number
    currency: string
    is_pro?: boolean
    payments_enabled?: boolean
    mpesa_enabled?: boolean
    paypal_enabled?: boolean
    custom_domain_set?: boolean
    primary_color?: string | null
    theme?: string | null
    notifications_enabled?: boolean
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS: Record<Order['status'], { icon: string; label: string; bg: string; fg: string }> = {
    pending: { icon: 'schedule', label: 'Pending', bg: 'bg-amber-500/10', fg: 'text-amber-600 dark:text-amber-400' },
    paid: { icon: 'check_circle', label: 'Paid', bg: 'bg-[var(--md-sys-color-primary-container)]', fg: 'text-[var(--md-sys-color-primary)]' },
    processing: { icon: 'autorenew', label: 'Processing', bg: 'bg-violet-500/10', fg: 'text-violet-600 dark:text-violet-400' },
    shipped: { icon: 'local_shipping', label: 'Shipped', bg: 'bg-sky-500/10', fg: 'text-sky-600 dark:text-sky-400' },
    delivered: { icon: 'verified', label: 'Delivered', bg: 'bg-[var(--md-sys-color-primary-container)]', fg: 'text-[var(--md-sys-color-primary)]' },
    cancelled: { icon: 'cancel', label: 'Cancelled', bg: 'bg-[var(--md-sys-color-error-container)]', fg: 'text-[var(--md-sys-color-error)]' },
    refunded: { icon: 'currency_exchange', label: 'Refunded', bg: 'bg-[var(--md-sys-color-surface-variant)]', fg: 'text-[var(--md-sys-color-on-surface-variant)]' },
}

function fmt(n: number, currency: string) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency', currency,
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d === 1) return 'yesterday'
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
    return (
        <span className={cn(
            'block animate-pulse rounded-lg bg-[var(--md-sys-color-surface-variant)]',
            className
        )} />
    )
}

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span
            className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
        >
            {icon}
        </span>
    )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, loading, featured }: {
    label: string; value: string; sub?: string; icon?: string; loading?: boolean; featured?: boolean
}) {
    return (
        <div className={cn(
            'relative overflow-hidden rounded-2xl p-5 flex flex-col gap-1',
            featured
                ? 'bg-[var(--md-sys-color-primary-container)] col-span-2 sm:col-span-1'
                : 'bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]'
        )}>
            {icon && (
                <MSO
                    icon={icon}
                    fill={1}
                    className={cn(
                        'absolute right-3 top-3 text-[20px]',
                        featured
                            ? 'text-[var(--md-sys-color-primary)] opacity-70'
                            : 'text-[var(--md-sys-color-on-surface-variant)] opacity-30'
                    )}
                />
            )}
            {loading
                ? <Sk className="h-8 w-24 mb-1" />
                : <p className={cn(
                    'text-[28px] font-semibold tabular-nums leading-none tracking-tight',
                    featured ? 'text-[var(--md-sys-color-on-primary-container)]' : 'text-[var(--md-sys-color-on-surface)]'
                )}>{value}</p>
            }
            <p className={cn(
                'text-[12px] font-medium',
                featured ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
            )}>{label}</p>
            {sub && !loading && (
                <p className={cn(
                    'text-[11px]',
                    featured ? 'text-[var(--md-sys-color-primary)]/60' : 'text-[var(--md-sys-color-on-surface-variant)] opacity-60'
                )}>{sub}</p>
            )}
        </div>
    )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Order['status'] }) {
    const s = STATUS[status] ?? STATUS.pending
    return (
        <span className={cn(
            'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full shrink-0',
            s.bg, s.fg
        )}>
            <MSO icon={s.icon} className="text-[12px]" fill={status === 'delivered' || status === 'paid' ? 1 : 0} />
            {s.label}
        </span>
    )
}

// ─── Payments callout ─────────────────────────────────────────────────────────

function PaymentsCallout({ onNavigate }: { onNavigate: () => void }) {
    return (
        <button
            onClick={onNavigate}
            className={cn(
                'w-full flex items-start gap-4 text-left',
                'rounded-2xl bg-[var(--md-sys-color-secondary-container)]',
                'px-5 py-4 group',
                'hover:brightness-95 dark:hover:brightness-110 transition-all duration-150'
            )}
        >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--md-sys-color-on-secondary-container)]/10 shrink-0 mt-0.5">
                <MSO icon="payments" className="text-[20px] text-[var(--md-sys-color-on-secondary-container)]" fill={1} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-secondary-container)]">Set up payments</p>
                <p className="text-[12px] text-[var(--md-sys-color-on-secondary-container)]/70 mt-0.5 leading-relaxed">
                    Connect M-Pesa or PayPal so customers can checkout. Takes about 2 minutes.
                </p>
            </div>
            <MSO
                icon="arrow_forward"
                className="text-[18px] text-[var(--md-sys-color-on-secondary-container)]/50 group-hover:text-[var(--md-sys-color-on-secondary-container)] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5"
            />
        </button>
    )
}

// ─── FunnelRow ────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
    if (!b) return null
    return `${((a / b) * 100).toFixed(1)}%`
}

function FunnelRow({ funnel, loading, onViewAnalytics }: {
    funnel?: Funnel; loading: boolean; onViewAnalytics: () => void
}) {
    const steps = [
        { label: 'Views', value: funnel?.views, rate: null },
        { label: 'Add to cart', value: funnel?.add_to_carts, rate: pct(funnel?.add_to_carts ?? 0, funnel?.views ?? 0) },
        { label: 'Checkouts Started', value: funnel?.checkouts, rate: pct(funnel?.checkouts ?? 0, funnel?.add_to_carts ?? 0) },
        { label: 'Orders Placed', value: funnel?.orders, rate: pct(funnel?.orders ?? 0, funnel?.checkouts ?? 0) },
    ]

    return (
        <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-[var(--md-sys-color-outline-variant)]">
                {steps.map((step, i) => (
                    <div key={step.label} className="flex flex-col gap-1 px-4 py-4">
                        <div className="h-1 rounded-full bg-[var(--md-sys-color-surface-variant)] mb-2 overflow-hidden">
                            {!loading && funnel && (
                                <div
                                    className="h-full rounded-full bg-[var(--md-sys-color-primary)] transition-all duration-500"
                                    style={{
                                        width: i === 0 ? '100%' : `${((steps[i].value ?? 0) / (funnel.views || 1)) * 100}%`,
                                        opacity: 1 - i * 0.15,
                                    }}
                                />
                            )}
                        </div>
                        {loading
                            ? <Sk className="h-5 w-14" />
                            : <p className="text-[18px] font-semibold tabular-nums leading-none text-[var(--md-sys-color-on-surface)]">
                                {(step.value ?? 0).toLocaleString()}
                            </p>
                        }
                        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{step.label}</p>
                        {step.rate && (
                            <p className="text-[11px] font-medium text-[var(--md-sys-color-primary)] mt-0.5">
                                {step.rate} conv.
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer — period label + analytics link */}
            <div className="px-4 py-2 border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] flex items-center justify-between">
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                    Last 7 days · store visits → purchases
                </p>
                <button
                    onClick={onViewAnalytics}
                    className="flex items-center gap-0.5 text-[11px] text-[var(--md-sys-color-primary)] hover:underline underline-offset-2"
                >
                    Full report
                    <MSO icon="chevron_right" className="text-[13px]" />
                </button>
            </div>
        </div>
    )
}

// ─── TopProductCard ───────────────────────────────────────────────────────────

function TopProductCard({ product, currency, loading, onNavigate }: {
    product?: TopProduct; currency: string; loading: boolean; onNavigate: () => void
}) {
    if (!loading && !product) return null

    return (
        <button
            onClick={onNavigate}
            className={cn(
                'w-full flex items-center gap-4 text-left group',
                'rounded-2xl border border-[var(--md-sys-color-outline-variant)]',
                'bg-[var(--md-sys-color-surface)] px-4 py-3.5',
                'hover:bg-[var(--md-sys-color-surface-container-low)] transition-colors duration-150'
            )}
        >
            <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-[var(--md-sys-color-surface-variant)] flex items-center justify-center">
                {loading
                    ? <Sk className="w-full h-full rounded-none" />
                    : product?.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <MSO icon="inventory_2" className="text-[18px] text-[var(--md-sys-color-on-surface-variant)]" />
                }
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)]">
                    Top product
                </span>
                {loading
                    ? <Sk className="h-4 w-32 mt-0.5" />
                    : <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{product!.name}</p>
                }
                {!loading && product && (
                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                        {product.units_sold} sold this month
                    </p>
                )}
            </div>
            <div className="shrink-0 text-right">
                {loading
                    ? <Sk className="h-5 w-16" />
                    : <p className="text-[14px] font-semibold tabular-nums text-[var(--md-sys-color-on-surface)]">
                        {fmt(product!.revenue, currency)}
                    </p>
                }
                <MSO
                    icon="chevron_right"
                    className="text-[15px] text-[var(--md-sys-color-outline-variant)] group-hover:text-[var(--md-sys-color-on-surface-variant)] transition-colors mt-0.5 ml-auto"
                />
            </div>
        </button>
    )
}

// ─── Welcome hero ─────────────────────────────────────────────────────────────

function WelcomeHero({ store, loading, onVisit }: {
    store?: StoreOverview; loading: boolean; onVisit: () => void
}) {
    const hasRevenue = !!store && store.revenue_total > 0
    const headline = loading
        ? null
        : !store
            ? 'Your store'
            : hasRevenue
                ? `${store.name} is making money.`
                : `${store.name} is ready to sell.`
    const sub = loading
        ? null
        : hasRevenue
            ? `You've earned ${fmt(store!.revenue_total, store!.currency)} so far. Keep the momentum going.`
            : 'Add a product, share your link, and take your first order today. We handle the hosting, SSL, and uptime.'

    return (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)]">
            {/* brand glow */}
            <div
                className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-60 blur-3xl"
                style={{ background: 'radial-gradient(circle, var(--md-sys-color-primary-container) 0%, transparent 70%)' }}
            />
            <div className="relative flex items-start justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                        {!loading && store && (
                            <span className={cn(
                                'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full',
                                store.active
                                    ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]'
                                    : 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-error)]'
                            )}>
                                <span className={cn(
                                    'w-1.5 h-1.5 rounded-full',
                                    store.active ? 'bg-[var(--md-sys-color-primary)]' : 'bg-[var(--md-sys-color-error)]'
                                )} />
                                {store.active ? 'Live' : 'Offline'}
                            </span>
                        )}
                        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">
                            {loading ? <Sk className="h-3 w-40 inline-block" /> : `menengai.cloud/s/${store?.slug ?? ''}`}
                        </p>
                    </div>
                    {headline
                        ? <h1 className="text-[1.4rem] sm:text-[1.6rem] font-bold leading-tight tracking-tight text-[var(--md-sys-color-on-surface)]">
                            {headline}
                        </h1>
                        : <Sk className="h-7 w-56" />
                    }
                    {sub
                        ? <p className="text-[13px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)] max-w-md">{sub}</p>
                        : <Sk className="h-4 w-72" />
                    }
                </div>

                {!loading && store && (
                    <a
                        href={`/s/${store.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onVisit}
                        className={cn(
                            'shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full',
                            'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                            'text-[12px] font-semibold hover:opacity-90 transition-opacity'
                        )}
                    >
                        Visit store
                        <MSO icon="open_in_new" className="text-[15px]" />
                    </a>
                )}
            </div>
        </div>
    )
}

// ─── Share store card ─────────────────────────────────────────────────────────

function ShareStore({ slug }: { slug: string }) {
    const [copied, setCopied] = useState(false)
    const url = `menengai.cloud/s/${slug}`

    const copy = () => {
        navigator.clipboard?.writeText(`https://${url}`).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
        })
    }

    return (
        <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--md-sys-color-primary-container)] shrink-0">
                <MSO icon="share" className="text-[18px] text-[var(--md-sys-color-primary)]" fill={1} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--md-sys-color-on-surface)]">Share your store</p>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">{url}</p>
            </div>
            <button
                onClick={copy}
                className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium transition-colors',
                    copied
                        ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]'
                        : 'border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-low)]'
                )}
            >
                <MSO icon={copied ? 'check' : 'content_copy'} className="text-[14px]" />
                {copied ? 'Copied' : 'Copy link'}
            </button>
        </div>
    )
}

// ─── Pro upsell ───────────────────────────────────────────────────────────────

function ProUpsell({ onNavigate }: { onNavigate: () => void }) {
    return (
        <button
            onClick={onNavigate}
            className="w-full text-left rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5 group hover:border-[var(--md-sys-color-primary)] transition-colors relative overflow-hidden"
        >
            <div
                className="pointer-events-none absolute -left-10 -bottom-12 h-40 w-40 rounded-full opacity-40 blur-3xl"
                style={{ background: 'radial-gradient(circle, var(--md-sys-color-primary-container) 0%, transparent 70%)' }}
            />
            <div className="relative flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--md-sys-color-primary-container)] shrink-0">
                    <MSO icon="workspace_premium" className="text-[20px] text-[var(--md-sys-color-primary)]" fill={1} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">Grow with Pro</p>
                    <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed max-w-sm">
                        Your own domain, advanced analytics, a blog, and your branding out front. Everything you need to scale.
                    </p>
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--md-sys-color-primary)] mt-2 group-hover:gap-1.5 transition-all">
                        See Pro features
                        <MSO icon="arrow_forward" className="text-[14px]" />
                    </span>
                </div>
            </div>
        </button>
    )
}

// ─── Quick links ──────────────────────────────────────────────────────────────

type QuickLink = { tab: TabId; label: string; icon: string; beta?: boolean }

const QUICK_LINKS: QuickLink[] = [
    { tab: 'general', label: 'General', icon: 'storefront' },
    { tab: 'appearance', label: 'Appearance', icon: 'palette' },
    { tab: 'products', label: 'Products', icon: 'inventory_2' },
    { tab: 'orders', label: 'Orders', icon: 'receipt_long' },
    { tab: 'analytics', label: 'Analytics', icon: 'bar_chart' },
    { tab: 'blog', label: 'Blog', icon: 'article' },
    { tab: 'integrations', label: 'Integrations', icon: 'link', beta: true },
    { tab: 'domain', label: 'Custom domain', icon: 'language', beta: true },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsHomeClient({ slug, orgSlug }: { slug: string; orgSlug: string }) {
    const router = useRouter()
    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/${slug}/overview`, {
            credentials: 'include',
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [slug])

    const navigate = useCallback((tab: TabId) => {
        router.push(`/org/${orgSlug}/${slug}/settings/${tab}`)
    }, [router, orgSlug, slug])

    const store = data?.store
    const orders = data?.recent_orders ?? []
    // payments_enabled already aggregates mpesa || paypal || stripe (set server-side)
    const paymentsNeeded = !loading && store && !store.payments_enabled

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16 pt-2">

            {/* ── Welcome hero ─────────────────────────────────────────────── */}
            <div className="animate-rise">
                <WelcomeHero store={store} loading={loading} onVisit={() => { }} />
            </div>

            {/* ── KPIs ─────────────────────────────────────────────────────── */}
            <div className="animate-rise-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KpiCard
                    label="Revenue"
                    value={store ? fmt(store.revenue_total, store.currency) : '—'}
                    sub="all time"
                    icon="payments"
                    loading={loading}
                    featured
                />
                <KpiCard label="Orders" value={store?.order_count?.toString() ?? '—'} icon="receipt_long" loading={loading} />
                <KpiCard label="Products" value={store?.product_count?.toString() ?? '—'} icon="inventory_2" loading={loading} />
            </div>

            {/* ── Funnel ───────────────────────────────────────────────────── */}
            <div className="animate-rise-2">
                <FunnelRow
                    funnel={data?.funnel}
                    loading={loading}
                    onViewAnalytics={() => navigate('analytics')}
                />
            </div>

            {/* ── Top product ──────────────────────────────────────────────── */}
            <div className="animate-rise-3">
                <TopProductCard
                    product={data?.top_product}
                    currency={store?.currency ?? 'KES'}
                    loading={loading}
                    onNavigate={() => navigate('products')}
                />
            </div>

            {/* ── Payments callout ─────────────────────────────────────────── */}
            {paymentsNeeded && (
                <div className="animate-rise">
                    <PaymentsCallout onNavigate={() => navigate('integrations')} />
                </div>
            )}

            {/* ── Share store ──────────────────────────────────────────────── */}
            {!loading && store && (
                <div className="animate-rise-4">
                    <ShareStore slug={store.slug} />
                </div>
            )}

            {/* ── Recent orders ─────────────────────────────────────────────── */}
            <div className="animate-rise-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">Recent orders</p>
                    <button
                        onClick={() => navigate('orders')}
                        className="flex items-center gap-0.5 text-[12px] text-[var(--md-sys-color-primary)] hover:underline underline-offset-2"
                    >
                        View all
                        <MSO icon="chevron_right" className="text-[15px]" />
                    </button>
                </div>

                <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] overflow-hidden">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--md-sys-color-outline-variant)] last:border-0">
                                <Sk className="h-4 w-32 flex-1" />
                                <Sk className="h-4 w-14" />
                                <Sk className="h-6 w-20 rounded-full" />
                            </div>
                        ))
                    ) : error ? (
                        <div className="flex items-center gap-2.5 px-5 py-6 text-[13px] text-[var(--md-sys-color-on-surface-variant)]">
                            <MSO icon="error_outline" className="text-[18px] text-[var(--md-sys-color-error)]" />
                            Could not load orders.{' '}
                            <button onClick={() => window.location.reload()} className="text-[var(--md-sys-color-primary)] hover:underline">
                                Retry
                            </button>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--md-sys-color-primary-container)]">
                                <MSO icon="rocket_launch" className="text-[26px] text-[var(--md-sys-color-primary)]" fill={1} />
                            </div>
                            <div className="max-w-xs">
                                <p className="text-[14px] font-semibold text-[var(--md-sys-color-on-surface)]">Your first sale is close</p>
                                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-1 leading-relaxed">
                                    {store && store.product_count > 0
                                        ? 'Your products are live. Share your store link and watch the orders roll in.'
                                        : 'Add a product, then share your link. Orders show up here the moment a customer checks out.'}
                                </p>
                            </div>
                            <button
                                onClick={() => navigate(store && store.product_count > 0 ? 'orders' : 'products')}
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[12px] font-semibold hover:opacity-90 transition-opacity"
                            >
                                <MSO icon="add" className="text-[16px]" />
                                {store && store.product_count > 0 ? 'View orders' : 'Add your first product'}
                            </button>
                        </div>
                    ) : (
                        orders.slice(0, 5).map((order) => (
                            <button
                                key={order.id}
                                onClick={() => navigate('orders')}
                                className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-[var(--md-sys-color-outline-variant)] last:border-0 hover:bg-[var(--md-sys-color-surface-container-low)] transition-colors text-left group"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">
                                        {order.customer_name}
                                    </p>
                                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                                        {timeAgo(order.created_at)}
                                    </p>
                                </div>
                                <span className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] tabular-nums shrink-0">
                                    {fmt(order.total, store?.currency ?? 'KES')}
                                </span>
                                <StatusBadge status={order.status} />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── Grow with Pro (non-Pro stores only) ──────────────────────── */}
            {!loading && store && !store.is_pro && (
                <div className="animate-rise-5">
                    <ProUpsell onNavigate={() => navigate('billing')} />
                </div>
            )}

            {/* ── Settings quick links ─────────────────────────────────────── */}
            <div className="animate-rise-6">
                <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] mb-3">Settings</p>
                <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] overflow-hidden">
                    {QUICK_LINKS.map((link) => (
                        <button
                            key={link.tab}
                            onClick={() => navigate(link.tab)}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 text-left group',
                                'border-b border-[var(--md-sys-color-outline-variant)] last:border-0',
                                'hover:bg-[var(--md-sys-color-surface-container-low)] transition-colors duration-100'
                            )}
                        >
                            <MSO
                                icon={link.icon}
                                className="text-[18px] text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-primary)] transition-colors shrink-0"
                            />
                            <span className="flex-1 text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">
                                {link.label}
                            </span>
                            {link.beta && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] shrink-0">
                                    beta
                                </span>
                            )}
                            <MSO
                                icon="chevron_right"
                                className="text-[16px] text-[var(--md-sys-color-outline-variant)] group-hover:text-[var(--md-sys-color-on-surface-variant)] transition-colors shrink-0"
                            />
                        </button>
                    ))}
                </div>
            </div>

        </div>
    )
}