'use client'
import { useState } from 'react'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Badge, fulfillmentTone, orderStatusTone } from '@mcloud/ui/kit/badge'
import { FilterBar } from '@mcloud/ui/kit/filter-bar'
import { Pagination } from '@mcloud/ui/kit/pagination'
import { isFiltered, type ListQuery } from '@mcloud/ui/kit/list-query'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Notice } from '@mcloud/ui/kit/notice'
import { timeAgo } from '@mcloud/ui/kit/ui-logic'
import { ORDER_STATUSES } from './orders-filters'

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

export default function OrdersClient({
    orders,
    total,
    pages,
    q,
    error,
}: {
    orders: Order[]
    total: number
    pages: number
    q: ListQuery<'status'>
    error: string | null
}) {
    const [now] = useState(() => Date.now())
    const filtered = isFiltered(q)

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader title="Orders" description={`${total.toLocaleString()} ${filtered ? (total === 1 ? 'match' : 'matches') : 'total'}`} />

            <FilterBar
                searchPlaceholder="Search order #, customer or store"
                filters={[{ name: 'status', label: 'Filter by status', allLabel: 'All statuses', options: ORDER_STATUSES }]}
            />

            {error && <Notice tone="error">Could not load orders: {error}</Notice>}

            <Panel flush>
                {orders.length === 0 ? (
                    <EmptyState icon="receipt_long" title="No orders found" description={filtered ? 'Try a different search or filter.' : undefined} />
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
                            {orders.map(order => (
                                <Tr key={order.id}>
                                    <Td><span className="font-mono text-[12px] max-md:font-medium">{order.order_number ?? '—'}</span></Td>
                                    <Td label="Store">
                                        {order.store?.slug ? (
                                            <a href={`/store/${order.store.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary hover:underline underline-offset-4">
                                                {order.store.name ?? '—'}
                                            </a>
                                        ) : '—'}
                                    </Td>
                                    <Td muted label="Customer">{order.customer_email ?? '—'}</Td>
                                    <Td align="right" label="Total">{order.currency} {order.total?.toLocaleString() ?? '—'}</Td>
                                    <Td label="Status"><Badge tone={orderStatusTone(order.status)}>{order.status ?? '—'}</Badge></Td>
                                    <Td label="Fulfillment"><Badge tone={fulfillmentTone(order.fulfillment_status)}>{order.fulfillment_status ?? '—'}</Badge></Td>
                                    <Td align="right" muted label="Placed">{timeAgo(order.created_at, now)}</Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Panel>

            <Pagination basePath="/admin/orders" q={q} pages={pages} total={total} newestFirst />
        </div>
    )
}
