'use client'

// app/store/[slug]/settings/settings-home-client.tsx
//
// Data shape expected from /api/store/[slug]/overview:
// {
//   store: {
//     name: string
//     slug: string
//     logo_url?: string
//     active: boolean
//     product_count: number
//     order_count: number
//     revenue_total: number          // in store currency, e.g. 84500
//     currency: string               // e.g. "KES"
//     primary_color?: string
//     theme?: string
//     payments_enabled?: boolean
//     mpesa_enabled?: boolean
//     paypal_enabled?: boolean
//     custom_domain_verified?: boolean
//     notifications_enabled?: boolean
//   }
//   recent_orders: Array<{
//     id: string
//     customer_name: string
//     total: number
//     status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
//     created_at: string             // ISO string
//   }>
// }

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Store, Palette, Package, ShoppingBag, FileText,
    Globe, Link2, CreditCard, Bell, ArrowRight,
    TrendingUp, Sparkles, AlertCircle, CheckCircle2,
    Circle,
} from 'lucide-react'
import { WIZARD_STEPS } from './getting-started-drawer'
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
    primary_color?: string
    theme?: string
    payments_enabled?: boolean
    mpesa_enabled?: boolean
    paypal_enabled?: boolean
    custom_domain_verified?: boolean
    notifications_enabled?: boolean
}

type OverviewData = {
    store: StoreOverview
    recent_orders: Order[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Order['status'], { dot: string; label: string }> = {
    pending: { dot: 'bg-amber-400', label: 'Pending' },
    paid: { dot: 'bg-blue-400', label: 'Paid' },
    processing: { dot: 'bg-violet-400', label: 'Processing' },
    shipped: { dot: 'bg-sky-400', label: 'Shipped' },
    delivered: { dot: 'bg-green-400', label: 'Delivered' },
    cancelled: { dot: 'bg-red-400', label: 'Cancelled' },
    refunded: { dot: 'bg-slate-400', label: 'Refunded' },
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

function Skeleton({ className, block = false }: { className?: string; block?: boolean }) {
    if (block) return <div className={`animate-pulse rounded-md bg-border/60 ${className ?? ''}`} />
    return <span className={`animate-pulse rounded-md bg-border/60 inline-block ${className ?? ''}`} />
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            {children}
        </p>
    )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, icon, loading,
}: {
    label: string
    value: string
    sub?: string
    icon: React.ReactNode
    loading?: boolean
}) {
    return (
        <div className="rounded-xl border border-border bg-background p-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                {loading
                    ? <Skeleton block className="h-5 w-16 mt-1" />
                    : <p className="text-[15px] font-semibold text-foreground tabular-nums">{value}</p>
                }
                {sub && !loading && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                )}
            </div>
        </div>
    )
}

// ─── Quick link card ──────────────────────────────────────────────────────────

type QuickLink = {
    tab: TabId
    label: string
    description: string
    icon: React.ReactNode
    beta?: boolean
    upsell?: boolean   // highlight as a feature to enable
}

const QUICK_LINKS: QuickLink[] = [
    { tab: 'general', label: 'General', description: 'Name, currency, timezone', icon: <Store className="w-4 h-4" /> },
    { tab: 'appearance', label: 'Appearance', description: 'Theme, colours, logo', icon: <Palette className="w-4 h-4" /> },
    { tab: 'products', label: 'Products', description: 'Catalog and inventory', icon: <Package className="w-4 h-4" /> },
    { tab: 'orders', label: 'Orders', description: 'Fulfillment and history', icon: <ShoppingBag className="w-4 h-4" /> },
    { tab: 'blog', label: 'Blog', description: 'Articles and content', icon: <FileText className="w-4 h-4" /> },
    { tab: 'social', label: 'Social', description: 'Instagram, WhatsApp, TikTok', icon: <Link2 className="w-4 h-4" /> },
    { tab: 'payments', label: 'Payments', description: 'M-Pesa, PayPal, Stripe', icon: <CreditCard className="w-4 h-4" />, beta: true, upsell: true },
    { tab: 'domain', label: 'Custom Domain', description: 'Bring your own domain', icon: <Globe className="w-4 h-4" />, beta: true, upsell: true },
    { tab: 'notifications', label: 'Notifications', description: 'Email alerts and webhooks', icon: <Bell className="w-4 h-4" />, beta: true, upsell: true },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsHomeClient({ slug }: { slug: string }) {
    const router = useRouter()
    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        fetch(`/api/store/${slug}/overview`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [slug])

    const store = data?.store
    const orders = data?.recent_orders ?? []

    const navigate = (tab: TabId) => router.push(`/store/${slug}/settings/${tab}`)

    // Wizard progress
    const doneCount = store ? WIZARD_STEPS.filter(s => s.isDone(store)).length : 0
    const totalSteps = WIZARD_STEPS.length
    const setupComplete = doneCount === totalSteps

    // Stagger animation helper
    const item = (i: number) => ({
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: i * 0.06, ease: 'easeOut' as const },
    })

    return (
        <div className="max-w-3xl mx-auto space-y-10">

            {/* ── Welcome ────────────────────────────────────────────────── */}
            <motion.div {...item(0)}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        {loading
                            ? <Skeleton className="h-7 w-40 mb-2" />
                            : <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
                                {store?.name ?? 'Your store'}
                            </h1>
                        }
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {loading ? <Skeleton className="h-4 w-56" />
                                : store?.active
                                    ? 'Your store is live and accepting orders.'
                                    : 'Your store is currently offline.'
                            }
                        </p>
                    </div>
                    {!loading && store && (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${store.active
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${store.active ? 'bg-green-500' : 'bg-amber-400'}`} />
                            {store.active ? 'Live' : 'Offline'}
                        </span>
                    )}
                </div>
            </motion.div>

            {/* ── Stats ──────────────────────────────────────────────────── */}
            <motion.div {...item(2)}>
                <SectionLabel>Overview</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard
                        label="Products"
                        value={store?.product_count?.toString() ?? '—'}
                        icon={<Package className="w-4 h-4" />}
                        loading={loading}
                    />
                    <StatCard
                        label="Orders"
                        value={store?.order_count?.toString() ?? '—'}
                        icon={<ShoppingBag className="w-4 h-4" />}
                        loading={loading}
                    />
                    <StatCard
                        label="Revenue"
                        value={store ? fmt(store.revenue_total, store.currency) : '—'}
                        sub="all time"
                        icon={<TrendingUp className="w-4 h-4" />}
                        loading={loading}
                    />
                </div>
            </motion.div>

            {/* ── Recent orders ───────────────────────────────────────────── */}
            <motion.div {...item(3)}>
                <div className="flex items-center justify-between mb-3">
                    <SectionLabel>Recent activity</SectionLabel>
                    <button
                        onClick={() => navigate('orders')}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 -mt-3"
                    >
                        View all <ArrowRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="rounded-xl border border-border bg-background overflow-hidden">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
                                <Skeleton block className="h-4 w-24" />
                                <Skeleton block className="h-4 w-16 ml-auto" />
                                <Skeleton block className="h-5 w-16 rounded-full" />
                            </div>
                        ))
                    ) : error ? (
                        <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            Could not load recent orders.
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-muted-foreground">No orders yet.</p>
                            <button
                                onClick={() => navigate('products')}
                                className="mt-2 text-xs text-primary hover:underline"
                            >
                                Add your first product →
                            </button>
                        </div>
                    ) : (
                        orders.slice(0, 5).map((order) => {
                            const s = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending
                            return (
                                <button
                                    key={order.id}
                                    onClick={() => navigate('orders')}
                                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors text-left group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {order.customer_name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {timeAgo(order.created_at)}
                                        </p>
                                    </div>
                                    <span className="text-sm font-medium text-foreground tabular-nums flex-shrink-0">
                                        {fmt(order.total, store?.currency ?? 'KES')}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border border-border flex-shrink-0 bg-secondary`}>
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
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
                <SectionLabel>Settings</SectionLabel>
                <div className="grid sm:grid-cols-2 gap-2">
                    {QUICK_LINKS.map((link) => (
                        <button
                            key={link.tab}
                            onClick={() => navigate(link.tab)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background hover:bg-secondary/50 transition-colors text-left group"
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                                {link.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">{link.label}</span>
                                    {link.beta && (
                                        <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                            beta
                                        </span>
                                    )}
                                    {link.upsell && (
                                        <Sparkles className="w-3 h-3 text-[#425e7b] flex-shrink-0" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* ── Upsell strip ────────────────────────────────────────────── */}
            {!loading && store && !(store.payments_enabled || store.mpesa_enabled) && (
                <motion.div {...item(5)}>
                    <div className="rounded-xl border border-[#425e7b]/30 bg-[#425e7b]/5 px-5 py-4 flex items-start gap-4">
                        <CreditCard className="w-5 h-5 text-[#425e7b] flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">Accept payments</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Connect M-Pesa, PayPal or Stripe so customers can checkout directly on your store.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('payments')}
                            className="flex-shrink-0 text-xs font-medium text-[#425e7b] hover:underline flex items-center gap-1 mt-0.5"
                        >
                            Set up <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </motion.div>
            )}

        </div>
    )
}