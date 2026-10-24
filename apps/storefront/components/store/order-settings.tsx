'use client'

import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { listOrderItems, listOrders, setOrderStatus } from '@/lib/admin/order-actions'
import { Status, fulfillmentTone, orderStatusTone } from '@mcloud/ui/kit/badge'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Field, Select } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SkeletonRows, Spinner } from '@mcloud/ui/kit/skeleton'
import { Stat, StatStrip } from '@mcloud/ui/kit/stat-strip'
import { ROW_CLASS, Table, Th } from '@mcloud/ui/kit/table'
import { Tabs } from '@mcloud/ui/kit/tabs'
import { cn } from '@mcloud/ui/utils'
import {
    FULFILLMENT_STATUSES,
    ORDER_FILTERS,
    PAYMENT_STATUSES,
    filterCounts,
    filterOrders,
    formatMoney,
    itemCount,
    orderStats,
    statusLabel,
} from './order-logic'

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

const MAX_STACK = 3
const COLUMNS = 5

function Thumb({ src, alt }: { src: string | null; alt: string }) {
    return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-card bg-muted ring-1 ring-border">
            {src
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={src} alt={alt} className="h-full w-full object-cover" />
                : <Icon name="shopping_bag" size={14} className="text-muted-foreground" />}
        </span>
    )
}

// Overlapping product thumbnails lead the row, so merchants recognise an order by what was
// bought, not just its number. Collapses to a +N chip past MAX_STACK.
function ProductStack({ order }: { order: Order }) {
    const items = order.preview_items ?? []
    const shown = items.slice(0, MAX_STACK)
    const extra = Math.max((order.item_count ?? items.length) - shown.length, 0)
    if (shown.length === 0) return <Thumb src={null} alt="" />
    return (
        <span className="flex shrink-0 items-center -space-x-2.5">
            {shown.map((item, i) => <Thumb key={i} src={item.image_url} alt={item.title} />)}
            {extra > 0 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">+{extra}</span>
            )}
        </span>
    )
}

function OrderDetail({ order, updating, onStatus }: {
    order: Order
    updating: boolean
    onStatus: (field: 'status' | 'fulfillment_status', value: string) => void
}) {
    const totals = [
        { label: 'Subtotal', value: order.subtotal },
        { label: 'Tax', value: order.tax },
        { label: 'Shipping', value: order.shipping },
        { label: 'Discount', value: -order.discount },
    ].filter((r) => Number(r.value) !== 0)

    return (
        <div className="grid gap-6 bg-muted/30 px-4 py-5 md:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="min-w-0 space-y-4">
                {order.customer_email || order.customer_phone ? (
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
                        {order.customer_email && <span className="inline-flex items-center gap-1.5"><Icon name="mail" size={14} />{order.customer_email}</span>}
                        {order.customer_phone && <span className="inline-flex items-center gap-1.5"><Icon name="call" size={14} />{order.customer_phone}</span>}
                    </div>
                ) : (
                    <p className="text-[12px] text-muted-foreground">Guest checkout: no contact on file.</p>
                )}

                {order.items && order.items.length > 0 && (
                    <ul className="divide-y divide-border rounded-md border border-border bg-card">
                        {order.items.map((item) => (
                            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                                <Thumb src={item.image_url} alt={item.title} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] text-foreground">{item.title}</span>
                                    {item.variant_title && <span className="block text-[12px] text-muted-foreground">{item.variant_title}</span>}
                                </span>
                                <span className="text-[12px] text-muted-foreground">×{item.quantity}</span>
                                <span className="w-24 text-right text-[13px] tabular-nums">{formatMoney(order.currency, item.total)}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {order.notes && (
                    <div className="rounded-md border border-border bg-card p-3">
                        <p className="mb-1 text-[12px] font-medium text-muted-foreground">Customer note</p>
                        <p className="text-[13px] text-foreground">{order.notes}</p>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <dl className="space-y-1.5 text-[12px]">
                    {totals.map((row) => (
                        <div key={row.label} className="flex justify-between text-muted-foreground">
                            <dt>{row.label}</dt>
                            <dd className="tabular-nums">{formatMoney(order.currency, row.value)}</dd>
                        </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-1.5 text-[13px] font-semibold text-foreground">
                        <dt>Total</dt>
                        <dd className="tabular-nums">{formatMoney(order.currency, order.total)}</dd>
                    </div>
                </dl>
                <Field label="Payment status">
                    <Select value={order.status} disabled={updating} onChange={(e) => onStatus('status', e.target.value)} className="h-8">
                        {/* Keep a status the merchant cannot set (e.g. a legacy "fulfilled") selectable as the current value. */}
                        {!PAYMENT_STATUSES.includes(order.status as never) && <option value={order.status}>{statusLabel(order.status)}</option>}
                        {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </Select>
                </Field>
                <Field label="Fulfilment status">
                    <Select value={order.fulfillment_status} disabled={updating} onChange={(e) => onStatus('fulfillment_status', e.target.value)} className="h-8">
                        {FULFILLMENT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </Select>
                </Field>
                {updating && <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Spinner size={12} />Saving…</p>}
            </div>
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
    const [loadError, setLoadError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await listOrders(storeId)
        setLoadError(res.ok ? null : res.error)
        const baseOrders = (res.ok ? (res.orders as Order[]) : [])

        if (res.ok && baseOrders.length > 0) {
            const grouped = new Map<string, OrderPreviewItem[]>()
            res.itemRows.forEach((row) => {
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

    const toggle = async (orderId: string) => {
        if (expandedId === orderId) { setExpandedId(null); return }
        const res = await listOrderItems(storeId, orderId)
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, items: res.ok ? (res.items as OrderItem[]) : [] } : o))
        setExpandedId(orderId)
    }

    const updateStatus = async (orderId: string, field: 'status' | 'fulfillment_status', value: string) => {
        setUpdating(orderId)
        const res = await setOrderStatus(storeId, orderId, field, value)
        if (res.ok) setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, [field]: value } : o))
        setUpdating(null)
    }

    const filtered = filterOrders(orders, filter)
    const stats = useMemo(() => orderStats(orders), [orders])
    const counts = useMemo(() => filterCounts(orders), [orders])

    return (
        <div className="space-y-6">
            <PageHeader title="Orders" description="Manage and fulfil incoming orders." />

            <StatStrip className="grid-cols-2 md:grid-cols-4">
                <Stat label="Total orders" value={String(stats.total)} loading={loading} />
                <Stat label="Pending" value={String(stats.pending)} loading={loading} />
                <Stat label="Paid" value={String(stats.paid)} loading={loading} />
                <Stat label={`Revenue (${currency})`} value={stats.revenue.toLocaleString()} loading={loading} />
            </StatStrip>

            <Tabs
                label="Filter orders"
                value={filter}
                onChange={setFilter}
                items={ORDER_FILTERS.map((f) => ({ id: f, label: statusLabel(f), count: loading || counts[f] === 0 ? undefined : counts[f] }))}
            />

            <Panel flush>
                {loadError && !loading ? (
                    <LoadError message={loadError} onRetry={load} />
                ) : !loading && filtered.length === 0 ? (
                    <EmptyState
                        icon="receipt_long"
                        title={filter === 'all' ? 'No orders yet' : `No ${statusLabel(filter).toLowerCase()} orders`}
                        description={filter === 'all' ? 'Orders from your storefront appear here as customers check out.' : undefined}
                    />
                ) : (
                    <Table busy={loading}>
                        <thead>
                            <tr>
                                <Th>Order</Th>
                                <Th>Payment</Th>
                                <Th>Fulfilment</Th>
                                <Th align="right">Total</Th>
                                <Th><span className="sr-only">Details</span></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows columns={COLUMNS} rows={4} />
                            ) : (
                                filtered.map((order) => {
                                    const open = expandedId === order.id
                                    return (
                                        <Fragment key={order.id}>
                                            <tr
                                                className={cn(ROW_CLASS, 'cursor-pointer', open && 'bg-muted/40')}
                                                onClick={() => toggle(order.id)}
                                                aria-expanded={open}
                                            >
                                                <td className="px-4 py-2.5 max-md:block max-md:px-0 max-md:py-1">
                                                    <div className="flex items-center gap-3">
                                                        <ProductStack order={order} />
                                                        <div className="min-w-0">
                                                            <p className="font-mono text-[11px] text-muted-foreground">#{order.order_number}</p>
                                                            <p className="truncate text-[13px] text-foreground">
                                                                {itemCount(order.item_count)}
                                                                <span className="text-muted-foreground"> · {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 max-md:inline-block max-md:px-0 max-md:py-1 max-md:pr-1.5"><Status tone={orderStatusTone(order.status)}>{statusLabel(order.status)}</Status></td>
                                                <td className="px-4 py-2.5 max-md:inline-block max-md:px-0 max-md:py-1"><Status tone={fulfillmentTone(order.fulfillment_status)}>{statusLabel(order.fulfillment_status)}</Status></td>
                                                <td className="px-4 py-2.5 text-right text-[13px] font-medium tabular-nums max-md:block max-md:px-0 max-md:py-1 max-md:text-left">{formatMoney(order.currency, order.total)}</td>
                                                <td className="w-10 px-4 py-2.5 text-right max-md:hidden">
                                                    <Icon name={open ? 'expand_less' : 'expand_more'} size={18} className="text-muted-foreground" />
                                                </td>
                                            </tr>
                                            {open && (
                                                <tr className="border-t border-border max-md:block">
                                                    <td colSpan={COLUMNS} className="p-0 max-md:block">
                                                        <OrderDetail
                                                            order={order}
                                                            updating={updating === order.id}
                                                            onStatus={(field, value) => updateStatus(order.id, field, value)}
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </Table>
                )}
            </Panel>
        </div>
    )
}
