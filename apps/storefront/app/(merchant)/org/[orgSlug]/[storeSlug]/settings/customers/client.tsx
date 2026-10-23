'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { SearchField, Toolbar } from '@mcloud/ui/kit/fields'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SkeletonRows } from '@mcloud/ui/kit/skeleton'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import { Plan } from '@mcloud/merchant/plans'
import { ProGateInline } from '@/components/pro'

type Customer = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    order_count: number | null
    total_spent: number | null
    created_at: string | null
    tags: string | string[] | null
}

const PAGE_SIZE = 20

function tagsOf(tags: Customer['tags']): string[] {
    if (!tags) return []
    return (Array.isArray(tags) ? tags : String(tags).split(',')).map((t) => t.trim()).filter(Boolean)
}

export default function CustomersPage({ slug, plan, currency }: { slug: string; plan: Plan; currency: string }) {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [q, setQ] = useState('')
    const [page, setPage] = useState(1)

    const load = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(page) })
        if (q) params.set('q', q)
        try {
            const res = await fetch(`/api/store/${slug}/customers?${params}`, { credentials: 'include' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
            setCustomers(data.customers ?? [])
            setTotal(data.total ?? 0)
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load customers')
        } finally {
            setLoading(false)
        }
    }, [slug, q, page])

    useEffect(() => { load() }, [load])

    const fullName = (c: Customer) => [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
    const totalPages = Math.ceil(total / PAGE_SIZE)

    return (
        <ProGateInline
            plan={plan}
            requires="hobby"
            feature="Customer management"
            description="Manage your customer base on the Hobby plan and higher."
        >
            <div className="space-y-6">
                <PageHeader title="Customers" description={loading && total === 0 ? 'Loading…' : `${total} ${total === 1 ? 'customer' : 'customers'}`} />

                <Toolbar>
                    {/* A new search starts from the first page. */}
                    <SearchField value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Search by name, email or phone" />
                </Toolbar>

                <Panel flush>
                    {error && !loading ? (
                        <LoadError message={error} onRetry={load} />
                    ) : !loading && customers.length === 0 ? (
                        <EmptyState icon="person" title={q ? 'No customers match your search' : 'No customers yet'} />
                    ) : (
                        <Table busy={loading}>
                            <thead>
                                <tr>
                                    <Th>Name</Th>
                                    <Th>Email</Th>
                                    <Th>Phone</Th>
                                    <Th align="right">Orders</Th>
                                    <Th align="right">Spent</Th>
                                    <Th>Tags</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <SkeletonRows columns={6} />
                                ) : (
                                    customers.map((c) => (
                                        <Tr key={c.id}>
                                            <Td><span className="font-medium">{fullName(c)}</span></Td>
                                            <Td label="Email" muted>{c.email ?? '—'}</Td>
                                            <Td label="Phone" muted>{c.phone ?? '—'}</Td>
                                            <Td label="Orders" align="right">{c.order_count ?? 0}</Td>
                                            <Td label="Spent" align="right">{c.total_spent != null ? `${currency} ${c.total_spent.toLocaleString()}` : '—'}</Td>
                                            <Td label="Tags">
                                                <span className="inline-flex flex-wrap gap-1">
                                                    {tagsOf(c.tags).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                                                </span>
                                            </Td>
                                        </Tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    )}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[12px] text-muted-foreground">
                            <span>Page {page} of {totalPages}</span>
                            <div className="flex gap-2">
                                <Button size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                                <Button size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
                            </div>
                        </div>
                    )}
                </Panel>
            </div>
        </ProGateInline>
    )
}
