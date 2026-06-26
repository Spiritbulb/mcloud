'use client'
import { useState } from 'react'

type Order = {
    id: string
    order_number: string | null
    store_id: string | null
    customer_email: string | null
    total: number | null
    currency: string | null
    status: string | null
    fulfillment_status: string | null
    created_at: string
    store: { name: string | null; slug: string | null } | null
}

function relativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-muted text-muted-foreground',
    refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const fulfillmentColors: Record<string, string> = {
    unfulfilled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
}

export default function OrdersClient({ orders }: { orders: Order[] }) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const filtered = orders.filter(o => {
        const matchSearch =
            (o.order_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (o.customer_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (o.store?.name ?? '').toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || o.status === statusFilter
        return matchSearch && matchStatus
    })

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
                <p className="text-sm text-muted-foreground mt-1">{orders.length} total</p>
            </div>

            <div className="flex gap-3 flex-wrap">
                <input
                    type="text"
                    placeholder="Search by order #, customer or store…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                </select>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Order #</th>
                            <th className="text-left px-4 py-3 font-medium">Store</th>
                            <th className="text-left px-4 py-3 font-medium">Customer</th>
                            <th className="text-left px-4 py-3 font-medium">Total</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-left px-4 py-3 font-medium">Fulfillment</th>
                            <th className="text-left px-4 py-3 font-medium">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(order => (
                            <tr key={order.id} className="bg-background hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-foreground">
                                    {order.order_number ?? '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {order.store?.slug ? (
                                        <a
                                            href={`/store/${order.store.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-foreground hover:text-primary hover:underline"
                                        >
                                            {order.store.name ?? '—'}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{order.customer_email ?? '—'}</td>
                                <td className="px-4 py-3 font-mono text-xs">
                                    {order.currency} {order.total?.toLocaleString() ?? '—'}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                                        {order.status ?? '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fulfillmentColors[order.fulfillment_status ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                                        {order.fulfillment_status ?? '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">{relativeDate(order.created_at)}</td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No orders found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
