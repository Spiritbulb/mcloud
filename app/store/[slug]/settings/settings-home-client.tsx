'use client'

// app/store/[slug]/settings/settings-home-client.tsx

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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
    payments_enabled?: boolean
    mpesa_enabled?: boolean
    paypal_enabled?: boolean
    custom_domain_verified?: boolean
}

type OverviewData = {
    store: StoreOverview
    recent_orders: Order[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS: Record<Order['status'], { icon: string; color: string; label: string }> = {
    pending: { icon: 'schedule', color: 'text-amber-500', label: 'Pending' },
    paid: { icon: 'payments', color: 'text-[--md-sys-color-primary]', label: 'Paid' },
    processing: { icon: 'autorenew', color: 'text-violet-500', label: 'Processing' },
    shipped: { icon: 'local_shipping', color: 'text-sky-500', label: 'Shipped' },
    delivered: { icon: 'check_circle', color: 'text-[--md-sys-color-primary]', label: 'Delivered' },
    cancelled: { icon: 'cancel', color: 'text-[--md-sys-color-error]', label: 'Cancelled' },
    refunded: { icon: 'currency_exchange', color: 'text-[--md-sys-color-on-surface-variant]', label: 'Refunded' },
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
    return `${Math.floor(h / 24)}d ago`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
    return (
        <span className={cn(
            'animate-pulse rounded-md bg-[--md-sys-color-surface-variant]',
            className
        )} />
    )
}

// ─── MSO — Material Symbol shorthand ─────────────────────────────────────────

function MSO({ icon, className }: { icon: string; className?: string }) {
    return (
        <span className={cn('material-symbols-outlined select-none', className)}
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
            {icon}
        </span>
    )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, icon, loading, accent,
}: {
    label: string
    value: string
    sub?: string
    icon: string
    loading?: boolean
    accent?: boolean
}) {
    return (
        <div className={cn(
            'rounded-2xl p-4 flex flex-col gap-3',
            accent
                ? 'bg-[--md-sys-color-primary-container]'
                : 'bg-[--md-sys-color-surface] border border-[--md-sys-color-outline-variant]'
        )}>
            <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-xl',
                accent
                    ? 'bg-[--md-sys-color-primary]/15'
                    : 'bg-[--md-sys-color-surface-variant]'
            )}>
                <MSO icon={icon} className={cn(
                    'text-[18px]',
                    accent ? 'text-[--md-sys-color-primary]' : 'text-[--md-sys-color-on-surface-variant]'
                )} />
            </div>
            <div>
                <p className={cn(
                    'text-[11px] font-medium uppercase tracking-wider mb-1',
                    accent ? 'text-[--md-sys-color-primary]' : 'text-[--md-sys-color-on-surface-variant]'
                )}>
                    {label}
                </p>
                {loading
                    ? <Sk className="h-6 w-20" />
                    : <p className={cn(
                        'text-[22px] font-semibold tabular-nums leading-none',
                        accent ? 'text-[--md-sys-color-on-primary-container]' : 'text-[--md-sys-color-on-surface]'
                    )}>
                        {value}
                    </p>
                }
                {sub && !loading && (
                    <p className={cn(
                        'text-[11px] mt-1',
                        accent ? 'text-[--md-sys-color-primary]/70' : 'text-[--md-sys-color-on-surface-variant]'
                    )}>
                        {sub}
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── Quick links ──────────────────────────────────────────────────────────────

type QuickLink = {
    tab: TabId
    label: string
    description: string
    icon: string
    beta?: boolean
}

const QUICK_LINKS: QuickLink[] = [
    { tab: 'general', label: 'General', description: 'Name, currency, timezone', icon: 'storefront' },
    { tab: 'appearance', label: 'Appearance', description: 'Theme, colours, logo', icon: 'palette' },
    { tab: 'products', label: 'Products', description: 'Catalog and inventory', icon: 'inventory_2' },
    { tab: 'orders', label: 'Orders', description: 'Fulfillment and history', icon: 'receipt_long' },
    { tab: 'blog', label: 'Blog', description: 'Articles and content', icon: 'article' },
    { tab: 'integrations', label: 'Integrations', description: 'M-Pesa, PayPal, notifications', icon: 'link', beta: true },
    { tab: 'domain', label: 'Custom Domain', description: 'Bring your own domain', icon: 'language', beta: true },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsHomeClient({ slug }: { slug: string }) {
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

    const store = data?.store
    const orders = data?.recent_orders ?? []

    const navigate = (tab: TabId) =>
        router.push(
            process.env.NODE_ENV === 'development'
                ? `/store/${slug}/settings/${tab}`
                : `/settings/${tab}`
        )

    const ease = [0.25, 0.1, 0.25, 1] as const
    const item = (i: number) => ({
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: i * 0.055, ease },
    })

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16">

            {/* ── Hero banner ────────────────────────────────────────────── */}
            <motion.div {...item(0)}>
                <div className={cn(
                    'relative overflow-hidden rounded-2xl px-6 py-6',
                    'bg-[--md-sys-color-primary-container]',
                )}>
                    {/* Subtle topographic texture — pure CSS, no image */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
                        style={{
                            backgroundImage: `radial-gradient(circle at 20% 50%, var(--md-sys-color-primary) 0%, transparent 60%),
                                              radial-gradient(circle at 80% 20%, var(--md-sys-color-primary) 0%, transparent 50%)`,
                        }}
                    />

                    <div className="relative flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                            {loading
                                ? <Sk className="h-7 w-44 mb-1" />
                                : <h1 className="text-[20px] font-semibold text-[--md-sys-color-on-primary-container] tracking-tight">
                                    {store?.name ?? 'Your store'}
                                </h1>
                            }
                            <p className="text-[13px] text-[--md-sys-color-primary]/80">
                                {loading
                                    ? <Sk className="h-4 w-52 inline-block" />
                                    : store?.active
                                        ? `${store.slug}.menengai.cloud · Live`
                                        : `${store?.slug ?? slug}.menengai.cloud · Offline`
                                }
                            </p>
                        </div>

                        {!loading && store && (
                            <span className={cn(
                                'inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full',
                                store.active
                                    ? 'bg-[--md-sys-color-primary] text-[--md-sys-color-on-primary]'
                                    : 'bg-[--md-sys-color-error-container] text-[--md-sys-color-on-error-container]'
                            )}>
                                <MSO
                                    icon={store.active ? 'wifi' : 'wifi_off'}
                                    className="text-[14px]"
                                />
                                {store.active ? 'Live' : 'Offline'}
                            </span>
                        )}
                    </div>

                    {/* Visit store link */}
                    {!loading && store && (
                        <a
                            href={`https://${store.slug}.menengai.cloud`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                'relative mt-4 inline-flex items-center gap-1.5',
                                'text-[12px] font-medium text-[--md-sys-color-primary]',
                            )}
                        >
                            <MSO icon="open_in_new" className="text-[14px]" />
                            Visit store
                        </a>
                    )}
                </div>
            </motion.div>

            {/* ── Stats ──────────────────────────────────────────────────── */}
            <motion.div {...item(1)}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[--md-sys-color-on-surface-variant] mb-3">
                    Overview
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <StatCard
                        label="Revenue"
                        value={store ? fmt(store.revenue_total, store.currency) : '—'}
                        sub="all time"
                        icon="trending_up"
                        loading={loading}
                        accent
                    />
                    <StatCard
                        label="Orders"
                        value={store?.order_count?.toString() ?? '—'}
                        icon="receipt_long"
                        loading={loading}
                    />
                    <StatCard
                        label="Products"
                        value={store?.product_count?.toString() ?? '—'}
                        icon="inventory_2"
                        loading={loading}
                    />
                </div>
            </motion.div>

            {/* ── Payments callout — only if not configured ──────────────── */}
            {!loading && store && !(store.payments_enabled || store.mpesa_enabled) && (
                <motion.div {...item(2)}>
                    <button
                        onClick={() => navigate('integrations')}
                        className={cn(
                            'w-full flex items-center gap-4 text-left',
                            'rounded-2xl border border-dashed border-[--md-sys-color-primary]/40',
                            'bg-[--md-sys-color-primary]/[0.04] px-5 py-4',
                            'hover:bg-[--md-sys-color-primary]/[0.08] transition-colors duration-150 group'
                        )}
                    >
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[--md-sys-color-primary-container] shrink-0">
                            <MSO icon="payments" className="text-[20px] text-[--md-sys-color-primary]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[--md-sys-color-on-surface]">
                                Accept payments
                            </p>
                            <p className="text-[12px] text-[--md-sys-color-on-surface-variant] mt-0.5">
                                Connect M-Pesa or PayPal so customers can checkout on your store.
                            </p>
                        </div>
                        <MSO
                            icon="arrow_forward"
                            className="text-[18px] text-[--md-sys-color-primary] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                        />
                    </button>
                </motion.div>
            )}

            {/* ── Recent orders ───────────────────────────────────────────── */}
            <motion.div {...item(3)}>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[--md-sys-color-on-surface-variant]">
                        Recent activity
                    </p>
                    <button
                        onClick={() => navigate('orders')}
                        className="flex items-center gap-1 text-[12px] text-[--md-sys-color-primary] hover:underline underline-offset-2"
                    >
                        View all
                        <MSO icon="arrow_forward" className="text-[14px]" />
                    </button>
                </div>

                <div className="rounded-2xl border border-[--md-sys-color-outline-variant] bg-[--md-sys-color-surface] overflow-hidden">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[--md-sys-color-outline-variant] last:border-0">
                                <Sk className="h-4 w-28" />
                                <Sk className="h-4 w-16 ml-auto" />
                                <Sk className="h-5 w-20 rounded-full" />
                            </div>
                        ))
                    ) : error ? (
                        <div className="flex items-center gap-2.5 px-5 py-6 text-[13px] text-[--md-sys-color-on-surface-variant]">
                            <MSO icon="error_outline" className="text-[18px] text-[--md-sys-color-error]" />
                            Could not load recent orders.
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                            <MSO icon="receipt_long" className="text-[32px] text-[--md-sys-color-on-surface-variant] opacity-30" />
                            <p className="text-[13px] text-[--md-sys-color-on-surface-variant]">No orders yet.</p>
                            <button
                                onClick={() => navigate('products')}
                                className="text-[12px] text-[--md-sys-color-primary] hover:underline underline-offset-2 mt-1"
                            >
                                Add your first product →
                            </button>
                        </div>
                    ) : (
                        orders.slice(0, 5).map((order) => {
                            const s = STATUS[order.status] ?? STATUS.pending
                            return (
                                <button
                                    key={order.id}
                                    onClick={() => navigate('orders')}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-[--md-sys-color-outline-variant] last:border-0 hover:bg-[--md-sys-color-surface-variant]/50 transition-colors text-left group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-[--md-sys-color-on-surface] truncate">
                                            {order.customer_name}
                                        </p>
                                        <p className="text-[11px] text-[--md-sys-color-on-surface-variant] mt-0.5">
                                            {timeAgo(order.created_at)}
                                        </p>
                                    </div>
                                    <span className="text-[13px] font-semibold text-[--md-sys-color-on-surface] tabular-nums shrink-0">
                                        {fmt(order.total, store?.currency ?? 'KES')}
                                    </span>
                                    <span className={cn(
                                        'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full shrink-0',
                                        'bg-[--md-sys-color-surface-variant]',
                                        s.color
                                    )}>
                                        <MSO icon={s.icon} className="text-[12px]" />
                                        {s.label}
                                    </span>
                                </button>
                            )
                        })
                    )}
                </div>
            </motion.div>

            {/* ── Settings quick links ────────────────────────────────────── */}
            <motion.div {...item(4)}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[--md-sys-color-on-surface-variant] mb-3">
                    Settings
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                    {QUICK_LINKS.map((link) => (
                        <button
                            key={link.tab}
                            onClick={() => navigate(link.tab)}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-2xl text-left group',
                                'border border-[--md-sys-color-outline-variant] bg-[--md-sys-color-surface]',
                                'hover:bg-[--md-sys-color-surface-variant]/60 hover:border-[--md-sys-color-outline] transition-all duration-150'
                            )}
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[--md-sys-color-surface-variant] shrink-0 group-hover:bg-[--md-sys-color-primary-container] transition-colors">
                                <MSO icon={link.icon} className="text-[18px] text-[--md-sys-color-on-surface-variant] group-hover:text-[--md-sys-color-primary] transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-medium text-[--md-sys-color-on-surface] truncate">
                                        {link.label}
                                    </span>
                                    {link.beta && (
                                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[--md-sys-color-secondary-container] text-[--md-sys-color-on-secondary-container]">
                                            beta
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-[--md-sys-color-on-surface-variant] truncate mt-0.5">
                                    {link.description}
                                </p>
                            </div>
                            <MSO
                                icon="chevron_right"
                                className="text-[18px] text-[--md-sys-color-on-surface-variant] opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                            />
                        </button>
                    ))}
                </div>
            </motion.div>

        </div>
    )
}