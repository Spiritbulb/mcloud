'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderItem {
    id: string
    title: string
    variant_title: string | null
    quantity: number
    price: number
    total: number
    image_url: string | null
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
    items?: OrderItem[]
}

const FILTER_TABS = ['all', 'pending', 'paid', 'fulfilled', 'cancelled']

function financialBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'paid') return 'default'
    if (status === 'refunded' || status === 'voided') return 'destructive'
    return 'secondary'
}

function fulfillmentBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
    if (status === 'fulfilled') return 'default'
    if (status === 'partially_fulfilled') return 'secondary'
    return 'outline'
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
        setOrders((data as Order[]) ?? [])
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

    const stats = {
        total: orders.length,
        pending: orders.filter((o) => o.status === 'pending').length,
        paid: orders.filter((o) => o.status === 'paid').length,
        revenue: orders.filter((o) => o.status === 'paid').reduce((s, o) => s + Number(o.total), 0),
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold text-foreground">Orders</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Manage and fulfil incoming orders</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total orders', value: stats.total },
                    { label: 'Pending', value: stats.pending },
                    { label: 'Paid', value: stats.paid },
                    { label: `Revenue (${currency})`, value: stats.revenue.toLocaleString() },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardContent className="p-4 space-y-1">
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className="text-xl font-semibold text-foreground">{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-0 border-b">
                {FILTER_TABS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            'px-3 py-2 text-xs capitalize transition-colors border-b-2 -mb-px',
                            filter === f
                                ? 'border-foreground text-foreground font-medium'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && filtered.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No orders yet</p>
                        <p className="text-xs text-muted-foreground">Orders from your storefront will appear here.</p>
                    </CardContent>
                </Card>
            )}

            {!loading && filtered.length > 0 && (
                <div className="rounded-lg border divide-y overflow-hidden">
                    {filtered.map((order) => (
                        <div key={order.id} className="bg-background">
                            {/* Row */}
                            <div
                                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                onClick={() => loadItems(order.id)}
                            >
                                <div className="w-28 shrink-0">
                                    <p className="text-sm font-medium text-foreground font-mono">
                                        #{order.order_number}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(order.created_at).toLocaleDateString('en-KE', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </p>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">
                                        {order.customer_email ?? order.customer_phone ?? 'Guest'}
                                    </p>
                                </div>

                                <p className="text-sm font-medium text-foreground w-24 text-right shrink-0">
                                    {order.currency} {Number(order.total).toLocaleString()}
                                </p>

                                <Badge
                                    variant={financialBadgeVariant(order.status)}
                                    className="text-[10px] capitalize shrink-0 hidden sm:inline-flex"
                                >
                                    {order.status}
                                </Badge>

                                <Badge
                                    variant={fulfillmentBadgeVariant(order.fulfillment_status)}
                                    className="text-[10px] capitalize shrink-0 hidden md:inline-flex"
                                >
                                    {order.fulfillment_status.replace('_', ' ')}
                                </Badge>

                                {expandedId === order.id
                                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                            </div>

                            {/* Expanded detail */}
                            <AnimatePresence>
                                {expandedId === order.id && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden border-t"
                                    >
                                        <div className="px-4 py-5 space-y-5 bg-muted/20">
                                            {/* Line items */}
                                            {order.items && order.items.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items</p>
                                                    {order.items.map((item) => (
                                                        <div key={item.id} className="flex items-center gap-3">
                                                            {item.image_url && (
                                                                <img
                                                                    src={item.image_url}
                                                                    alt={item.title}
                                                                    className="w-10 h-10 object-cover rounded border shrink-0"
                                                                />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-foreground">{item.title}</p>
                                                                {item.variant_title && (
                                                                    <p className="text-xs text-muted-foreground">{item.variant_title}</p>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                                                            <p className="text-sm text-foreground w-20 text-right">
                                                                {order.currency} {Number(item.total).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Totals */}
                                            <div className="border-t pt-3 space-y-1 max-w-xs ml-auto">
                                                {[
                                                    { label: 'Subtotal', value: order.subtotal },
                                                    { label: 'Tax', value: order.tax },
                                                    { label: 'Shipping', value: order.shipping },
                                                    { label: 'Discount', value: -order.discount },
                                                ].filter(r => Number(r.value) !== 0).map((row) => (
                                                    <div key={row.label} className="flex justify-between text-xs text-muted-foreground">
                                                        <span>{row.label}</span>
                                                        <span>{order.currency} {Number(row.value).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-sm font-semibold text-foreground border-t pt-1 mt-1">
                                                    <span>Total</span>
                                                    <span>{order.currency} {Number(order.total).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {order.notes && (
                                                <div className="rounded border bg-background p-3">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Customer note</p>
                                                    <p className="text-sm text-foreground">{order.notes}</p>
                                                </div>
                                            )}

                                            {/* Status selects */}
                                            <div className="flex flex-wrap gap-4 pt-1">
                                                <div className="space-y-1.5">
                                                    <p className="text-xs text-muted-foreground">Payment status</p>
                                                    <Select
                                                        value={order.status}
                                                        disabled={updating === order.id}
                                                        onValueChange={(v) => updateStatus(order.id, 'status', v)}
                                                    >
                                                        <SelectTrigger className="h-8 w-40 text-xs">
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
                                                        <SelectTrigger className="h-8 w-40 text-xs">
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
                                                    <p className="text-xs text-muted-foreground self-end pb-2">Saving…</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}