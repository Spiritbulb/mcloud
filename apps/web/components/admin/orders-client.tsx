'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/admin/ui/page-header'
import { Panel } from '@/components/admin/ui/panel'
import { Badge, fulfillmentTone, orderStatusTone } from '@/components/admin/ui/badge'
import { SearchField, SelectField, Toolbar } from '@/components/admin/ui/fields'
import { Table, Td, Th, Tr } from '@/components/admin/ui/table'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { Notice } from '@/components/admin/ui/notice'
import { timeAgo } from '@/components/admin/ui/ui-logic'

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

export default function OrdersClient({ orders, capped }: { orders: Order[]; capped?: boolean }) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [now] = useState(() => Date.now())

    const q = search.toLowerCase()
    const filtered = orders.filter(o => {
        const matchSearch =
            (o.order_number ?? '').toLowerCase().includes(q) ||
            (o.customer_email ?? '').toLowerCase().includes(q) ||
            (o.store?.name ?? '').toLowerCase().includes(q)
        return matchSearch && (!statusFilter || o.status === statusFilter)
    })

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader title="Orders" description={`${orders.length.toLocaleString()} ${capped ? 'most recent' : 'total'}`} />

            {capped && <Notice tone="warning">Showing the {orders.length.toLocaleString()} most recent orders. Older ones are not searchable here yet.</Notice>}

            <Toolbar>
                <SearchField value={search} onChange={setSearch} placeholder="Search order #, customer or store" />
                <SelectField value={statusFilter} onChange={setStatusFilter} label="Filter by status">
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                </SelectField>
            </Toolbar>

            <Panel flush>
                {filtered.length === 0 ? (
                    <EmptyState icon="receipt_long" title="No orders found" description={search || statusFilter ? 'Try a different search or filter.' : undefined} />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Order</Th>
                                <Th>Store</Th>
                                <Th>Customer</Th>
                                <Th align="right">Total</Th>
                                <Th>Status</Th>
                                <Th>Fulfillment</Th>
                                <Th align="right">Placed</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(order => (
                                <Tr key={order.id}>
                                    <Td><span className="font-mono text-[12px]">{order.order_number ?? '—'}</span></Td>
                                    <Td>
                                        {order.store?.slug ? (
                                            <a href={`/store/${order.store.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary hover:underline underline-offset-4">
                                                {order.store.name ?? '—'}
                                            </a>
                                        ) : '—'}
                                    </Td>
                                    <Td muted>{order.customer_email ?? '—'}</Td>
                                    <Td align="right">{order.currency} {order.total?.toLocaleString() ?? '—'}</Td>
                                    <Td><Badge tone={orderStatusTone(order.status)}>{order.status ?? '—'}</Badge></Td>
                                    <Td><Badge tone={fulfillmentTone(order.fulfillment_status)}>{order.fulfillment_status ?? '—'}</Badge></Td>
                                    <Td align="right" muted>{timeAgo(order.created_at, now)}</Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Panel>
        </div>
    )
}
