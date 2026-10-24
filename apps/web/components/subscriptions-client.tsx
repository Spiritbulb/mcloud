// components/subscriptions-client.tsx
'use client'
import { useState } from 'react'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Status, subscriptionStatusTone } from '@mcloud/ui/kit/badge'
import { humanize } from '@mcloud/ui/kit/ui-logic'
import { Button } from '@mcloud/ui/kit/button'
import { SelectField, Toolbar } from '@mcloud/ui/kit/fields'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Notice } from '@mcloud/ui/kit/notice'

type Subscription = {
    id: string
    status: string
    amount: number
    currency: string
    created_at: string
    provider: string | null
    google_play_order_id: string | null
    stores: {
        id: string
        name: string
        slug: string
        is_pro: boolean
    } | null
}

export default function SubscriptionsClient({ subscriptions }: { subscriptions: Subscription[] }) {
    const [rows, setRows] = useState(subscriptions)
    const [loading, setLoading] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('')
    const [error, setError] = useState<string | null>(null)

    async function activate(subId: string, storeId: string) {
        setLoading(subId)
        setError(null)
        const res = await fetch('/api/admin/subscriptions/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription_id: subId, store_id: storeId }),
        })
        if (res.ok) {
            setRows(prev => prev.map(r =>
                r.id === subId ? { ...r, status: 'active', stores: r.stores ? { ...r.stores, is_pro: true } : null } : r
            ))
        } else {
            const data = await res.json().catch(() => null)
            setError(data?.error ?? 'Could not activate that subscription')
        }
        setLoading(null)
    }

    const pending = rows.filter(r => r.status === 'pending').length
    const filtered = rows.filter(r => !statusFilter || r.status === statusFilter)

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader
                title="Subscriptions"
                description={`${rows.length.toLocaleString()} total${pending ? ` · ${pending} pending` : ''} — activate manually after confirming payment`}
            />

            <Toolbar>
                <SelectField value={statusFilter} onChange={setStatusFilter} label="Filter by status">
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                </SelectField>
            </Toolbar>

            {error && <Notice tone="error">{error}</Notice>}

            <Panel flush>
                {filtered.length === 0 ? (
                    <EmptyState icon="subscriptions" title="No subscriptions" description={statusFilter ? 'Nothing has that status.' : 'Subscriptions will appear here when stores upgrade.'} />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Store</Th>
                                <Th align="right">Amount</Th>
                                <Th>Status</Th>
                                <Th>Reference</Th>
                                <Th>Created</Th>
                                <Th align="right">Action</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(sub => (
                                <Tr key={sub.id}>
                                    <Td>
                                        {sub.stores?.slug ? (
                                            <a href={`/store/${sub.stores.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary hover:underline underline-offset-4">
                                                {sub.stores.name}
                                            </a>
                                        ) : <span className="font-medium">{sub.stores?.name ?? '—'}</span>}
                                        <p className="font-mono text-[11px] text-muted-foreground">{sub.stores?.slug}</p>
                                    </Td>
                                    <Td align="right" label="Amount">{sub.currency} {sub.amount.toLocaleString()}</Td>
                                    <Td label="Status"><Status tone={subscriptionStatusTone(sub.status)}>{humanize(sub.status)}</Status></Td>
                                    <Td muted label="Reference"><span className="font-mono text-[12px]">{sub.google_play_order_id ?? '—'}</span></Td>
                                    <Td muted label="Created">
                                        {new Date(sub.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </Td>
                                    <Td align="right">
                                        {sub.status !== 'active' && sub.stores ? (
                                            <Button size="sm" variant="primary" onClick={() => activate(sub.id, sub.stores!.id)} disabled={loading === sub.id}>
                                                {loading === sub.id ? 'Activating…' : 'Activate Pro'}
                                            </Button>
                                        ) : sub.status === 'active' ? (
                                            <span className="text-[12px] text-muted-foreground">Active</span>
                                        ) : null}
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Panel>
        </div>
    )
}
