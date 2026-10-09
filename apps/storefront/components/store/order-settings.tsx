'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@mcloud/db/client'
import { Card, CardContent } from '@mcloud/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@mcloud/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown,
    ShoppingBag,
    Receipt,
    Clock,
    CheckCircle2,
    Wallet,
    Loader2,
    Mail,
    Phone,
} from 'lucide-react'
import { cn } from '@mcloud/ui/utils'

interface OrderItem {
    id: string
    title: string
    variant_title: string | null
    quantity: number
    price: number
    total: number
    image_url: string | null
}

interface OrderPreviewItem {
    image_url: string | null
    title: string
}

interface Order {
    id: string
    order_number: string
    status: string
    fulfillment_status: string
    total: number
    currency: string
    customer_email: string | null
    customer_phone: string | null
    subtotal: number
    tax: number
    shipping: number
    discount: number
    notes: string | null
    created_at: string
    item_count?: number
    preview_items?: OrderPreviewItem[]
    items?: OrderItem[]
}

const FILTER_TABS = ['all', 'pending', 'paid', 'fulfilled', 'cancelled']
const MAX_STACK = 3

const STATUS_STYLES: Record<string, string> = {
    paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20',
    fulfilled: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20',
    unfulfilled: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20',
    partially_paid: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20',
    partially_fulfilled: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20',
    refunded: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20',
    voided: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20',
    cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20',
}

function StatusPill({ status }: { status: string }) {
    const style = STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground ring-1 ring-inset ring-border'
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize whitespace-nowrap',
                style
            )}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {status.replace(/_/g, ' ')}
        </span>
    )
}

function formatMoney(currency: string, value: number) {
    return `${currency} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

// Overlapping product thumbnail stack — leads the row so merchants recognise
// the order by what was bought, not just a number. Falls back to a generic
// bag icon tile when no image is available, and collapses to a +N chip
// once the item count exceeds MAX_STACK.
function ProductStack({ order }: { order: Order }) {
    const items = order.preview_items ?? []
    const shown = items.slice(0, MAX_STACK)
    const extra = Math.max((order.item_count ?? items.length) - shown.length, 0)

    if (shown.length === 0) {
        return (
            <div className="w-11 h-11 rounded-lg bg-muted/70 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex items-center -space-x-3 shrink-0">
            {shown.map((item, i) => (
                <div
                    key={i}
                    className="w-11 h-11 rounded-lg border-2 border-background shadow-sm overflow-hidden bg-muted shrink-0 ring-1 ring-border/40"
                    style={{ zIndex: shown.length - i }}
                >
                    {item.image_url ? (
                        <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground/50" />
                        </div>
                    )}
                </div>
            ))}
            {extra > 0 && (
                <div
                    className="w-11 h-11 rounded-lg border-2 border-background bg-muted flex items-center justify-center shrink-0 shadow-sm"
                    style={{ zIndex: 0 }}
                >
                    <span className="text-[10px] font-medium text-muted-foreground">+{extra}</span>
                </div>
            )}
        </div>
    )
}

export default function OrderSettings({
    storeId,
    currency,
}: {
    storeId: string
    currency: string
}) {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [updating, setUpdating] = useState<string | null>(null)
    const [filter, setFilter] = useState<string>('all')

    const load = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('orders')
            .select('id, order_number, status, fulfillment_status, total, currency, customer_email, customer_phone, subtotal, tax, shipping, discount, notes, created_at')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(100)

        const baseOrders = (data as Order[]) ?? []

        if (baseOrders.length > 0) {
            const orderIds = baseOrders.map((o) => o.id)
            // Single batched fetch for preview thumbnails + counts, avoids
            // an N+1 query per row while still showing images up front.
            const { data: itemRows } = await supabase
                .from('order_items')
                .select('order_id, title, image_url')
                .in('order_id', orderIds)

            const grouped = new Map<string, OrderPreviewItem[]>()
            ;(itemRows ?? []).forEach((row: { order_id: string; title: string; image_url: string | null }) => {
                const list = grouped.get(row.order_id) ?? []
                list.push({ image_url: row.image_url, title: row.title })
                grouped.set(row.order_id, list)
            })

            baseOrders.forEach((o) => {
                const items = grouped.get(o.id) ?? []
                o.item_count = items.length
                o.preview_items = items.slice(0, MAX_STACK)
            })
        }

        setOrders(baseOrders)
        setLoading(false)
    }, [storeId])

    useEffect(() => { load() }, [load])

    const loadItems = async (orderId: string) => {
        if (expandedId === orderId) { setExpandedId(null); return }
        const supabase = createClient()
        const { data } = await supabase
            .from('order_items')
            .select('id, title, variant_title, quantity, price, total, image_url')
            .eq('order_id', orderId)
        setOrders((prev) =>
            prev.map((o) => o.id === orderId ? { ...o, items: (data as OrderItem[]) ?? [] } : o)
        )
        setExpandedId(orderId)
    }

    const updateStatus = async (
        orderId: string,
        field: 'status' | 'fulfillment_status',
        value: string
    ) => {
        setUpdating(orderId)
        const supabase = createClient()
        await supabase
            .from('orders')
            .update({ [field]: value, updated_at: new Date().toISOString() })
            .eq('id', orderId)
        setOrders((prev) =>
            prev.map((o) => o.id === orderId ? { ...o, [field]: value } : o)
        )
        setUpdating(null)
    }

    const filtered = filter === 'all'
        ? orders
        : orders.filter((o) => o.status === filter || o.fulfillment_status === filter)

    const stats = useMemo(() => ({
        total: orders.length,
        pending: orders.filter((o) => o.status === 'pending').length,
        paid: orders.filter((o) => o.status === 'paid').length,
        revenue: orders.filter((o) => o.status === 'paid').reduce((s, o) => s + Number(o.total), 0),
    }), [orders])

    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = { all: orders.length }
        FILTER_TABS.slice(1).forEach((f) => {
            counts[f] = orders.filter((o) => o.status === f || o.fulfillment_status === f).length
        })
        return counts
    }, [orders])

    return (
        <div className="mx-auto max-w-4xl space-y-7">
            <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">Orders</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Manage and fulfil incoming orders</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total orders', value: stats.total, icon: Receipt, accent: 'text-foreground' },
                    { label: 'Pending', value: stats.pending, icon: Clock, accent: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Paid', value: stats.paid, icon: CheckCircle2, accent: 'text-emerald-600 dark:text-emerald-400' },
                ].map((s) => (
                    <Card key={s.label} className="border-border/60 hover:border-border transition-colors py-1.5">
                        <CardContent className="p-4 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                <p className="text-2xl font-semibold text-foreground tabular-nums">{s.value}</p>
                            </div>
                            <s.icon className={cn('w-4 h-4 mt-0.5', s.accent)} />
                        </CardContent>
                    </Card>
                ))}

                <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-transparent py-1.5">
                    <CardContent className="p-4 flex items-start justify-between">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Revenue ({currency})</p>
                            <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                {stats.revenue.toLocaleString()}
                            </p>
                        </div>
                        <Wallet className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    </CardContent>
                </Card>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-lg w-fit">
                {FILTER_TABS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            'relative px-3 py-1.5 text-xs font-medium capitalize rounded-md transition-all',
                            filter === f
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {f}
                        {tabCounts[f] > 0 && (
                            <span className={cn(
                                'ml-1.5 text-[10px] tabular-nums',
                                filter === f ? 'text-muted-foreground' : 'text-muted-foreground/70'
                            )}>
                                {tabCounts[f]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-16 rounded-lg animate-pulse bg-gradient-to-r from-muted via-muted/40 to-muted bg-[length:200%_100%]"
                            style={{ animationName: 'shimmer', animationDuration: '1.8s', animationIterationCount: 'infinite' }}
                        />
                    ))}
                    <style jsx>{`
                        @keyframes shimmer {
                            0% { background-position: 200% 0; }
                            100% { background-position: -200% 0; }
                        }
                    `}</style>
                </div>
            )}

            {!loading && filtered.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center space-y-3">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-11 h-11 rounded-full bg-muted flex items-center justify-center mx-auto"
                        >
                            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                        </motion.div>
                        <p className="text-sm font-medium text-foreground">No orders yet</p>
                        <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                            Orders from your storefront will appear here as customers check out.
                        </p>
                    </CardContent>
                </Card>
            )}

            {!loading && filtered.length > 0 && (
                <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden shadow-sm">
                    {filtered.map((order, idx) => (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.2 }}
                            className="bg-background"
                        >
                            {/* Row — image stack leads, order number is an eyebrow */}
                            <div
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors group"
                                onClick={() => loadItems(order.id)}
                            >
                                <ProductStack order={order} />

                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                        #{order.order_number}
                                    </p>
                                    <p className="text-sm text-foreground truncate">
                                        {(order.item_count ?? 0) === 1
                                            ? '1 item'
                                            : `${order.item_count ?? 0} items`}
                                        <span className="text-muted-foreground"> · {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <p className="text-sm font-semibold text-foreground tabular-nums">
                                        {formatMoney(order.currency, order.total)}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <div className="hidden sm:flex">
                                            <StatusPill status={order.status} />
                                        </div>
                                        <div className="hidden md:flex">
                                            <StatusPill status={order.fulfillment_status} />
                                        </div>
                                    </div>
                                </div>

                                <motion.div
                                    animate={{ rotate: expandedId === order.id ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="shrink-0"
                                >
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </motion.div>
                            </div>

                            {/* Expanded detail */}
                            <AnimatePresence>
                                {expandedId === order.id && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="overflow-hidden border-t border-border/60"
                                    >
                                        <div className="px-4 py-5 space-y-5 bg-muted/20">
                                            {/* Customer contact — moved here from the row */}
                                            {(order.customer_email || order.customer_phone) && (
                                                <div className="flex flex-wrap gap-4">
                                                    {order.customer_email && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Mail className="w-3.5 h-3.5" />
                                                            {order.customer_email}
                                                        </div>
                                                    )}
                                                    {order.customer_phone && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Phone className="w-3.5 h-3.5" />
                                                            {order.customer_phone}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {!order.customer_email && !order.customer_phone && (
                                                <p className="text-xs text-muted-foreground italic">Guest checkout — no contact on file</p>
                                            )}

                                            {/* Line items */}
                                            {order.items && order.items.length > 0 && (
                                                <div className="space-y-2.5">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        Items ({order.items.length})
                                                    </p>
                                                    {order.items.map((item, i) => (
                                                        <motion.div
                                                            key={item.id}
                                                            initial={{ opacity: 0, x: -6 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.04 }}
                                                            className="flex items-center gap-3 bg-background/60 rounded-lg p-2"
                                                        >
                                                            {item.image_url ? (
                                                                <img
                                                                    src={item.image_url}
                                                                    alt={item.title}
                                                                    className="w-10 h-10 object-cover rounded-md border border-border/60 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-md border border-dashed border-border/60 flex items-center justify-center shrink-0">
                                                                    <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground/50" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-foreground truncate">{item.title}</p>
                                                                {item.variant_title && (
                                                                    <p className="text-xs text-muted-foreground">{item.variant_title}</p>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground shrink-0">×{item.quantity}</p>
                                                            <p className="text-sm text-foreground w-24 text-right shrink-0 tabular-nums">
                                                                {formatMoney(order.currency, item.total)}
                                                            </p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Totals */}
                                            <div className="border-t border-border/60 pt-3 space-y-1.5 max-w-xs ml-auto">
                                                {[
                                                    { label: 'Subtotal', value: order.subtotal },
                                                    { label: 'Tax', value: order.tax },
                                                    { label: 'Shipping', value: order.shipping },
                                                    { label: 'Discount', value: -order.discount },
                                                ].filter(r => Number(r.value) !== 0).map((row) => (
                                                    <div key={row.label} className="flex justify-between text-xs text-muted-foreground">
                                                        <span>{row.label}</span>
                                                        <span className="tabular-nums">{formatMoney(order.currency, row.value)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border/60 pt-1.5 mt-1.5">
                                                    <span>Total</span>
                                                    <span className="tabular-nums">{formatMoney(order.currency, order.total)}</span>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {order.notes && (
                                                <div className="rounded-lg border border-border/60 bg-background p-3">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Customer note</p>
                                                    <p className="text-sm text-foreground">{order.notes}</p>
                                                </div>
                                            )}

                                            {/* Status selects */}
                                            <div className="flex flex-wrap items-end gap-4 pt-1">
                                                <div className="space-y-1.5">
                                                    <p className="text-xs text-muted-foreground">Payment status</p>
                                                    <Select
                                                        value={order.status}
                                                        disabled={updating === order.id}
                                                        onValueChange={(v) => updateStatus(order.id, 'status', v)}
                                                    >
                                                        <SelectTrigger className="h-8 w-44 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {['pending', 'paid', 'partially_paid', 'refunded', 'voided'].map((s) => (
                                                                <SelectItem key={s} value={s} className="text-xs">
                                                                    {s.replace('_', ' ')}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className="text-xs text-muted-foreground">Fulfilment status</p>
                                                    <Select
                                                        value={order.fulfillment_status}
                                                        disabled={updating === order.id}
                                                        onValueChange={(v) => updateStatus(order.id, 'fulfillment_status', v)}
                                                    >
                                                        <SelectTrigger className="h-8 w-44 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {['unfulfilled', 'partially_fulfilled', 'fulfilled'].map((s) => (
                                                                <SelectItem key={s} value={s} className="text-xs">
                                                                    {s.replace('_', ' ')}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {updating === order.id && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 pb-2">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Saving…
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}