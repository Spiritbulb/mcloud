'use client'
import { Fragment, useState } from 'react'
import { PageHeader } from '@/components/admin/ui/page-header'
import { Panel } from '@/components/admin/ui/panel'
import { Badge, webhookStatusTone } from '@/components/admin/ui/badge'
import { SelectField, Toolbar } from '@/components/admin/ui/fields'
import { Table, Td, Th } from '@/components/admin/ui/table'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { timeAgo } from '@/components/admin/ui/ui-logic'

type WebhookLog = {
    id: string
    provider: string | null
    event_type: string | null
    status: string | null
    store_id: string | null
    created_at: string
    error_message: string | null
    payload: unknown
    store: { name: string | null } | null
}

export default function WebhooksClient({ logs }: { logs: WebhookLog[] }) {
    const [providerFilter, setProviderFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [expanded, setExpanded] = useState<string | null>(null)
    const [now] = useState(() => Date.now())

    const providers = Array.from(new Set(logs.map(l => l.provider).filter(Boolean))) as string[]
    const filtered = logs.filter(l => (!providerFilter || l.provider === providerFilter) && (!statusFilter || l.status === statusFilter))
    const failed = logs.filter(l => l.status === 'failed').length

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader title="Webhook logs" description={`${logs.length.toLocaleString()} recent events${failed ? ` · ${failed} failed` : ''}`} />

            <Toolbar>
                <SelectField value={providerFilter} onChange={setProviderFilter} label="Filter by provider">
                    <option value="">All providers</option>
                    {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </SelectField>
                <SelectField value={statusFilter} onChange={setStatusFilter} label="Filter by status">
                    <option value="">All statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                </SelectField>
            </Toolbar>

            <Panel flush>
                {filtered.length === 0 ? (
                    <EmptyState icon="webhook" title="No webhook logs" description="Provider callbacks will be listed here once they are recorded." />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Provider</Th>
                                <Th>Event</Th>
                                <Th>Status</Th>
                                <Th>Store</Th>
                                <Th align="right">When</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(log => (
                                <Fragment key={log.id}>
                                    <tr
                                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                        className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                                        aria-expanded={expanded === log.id}
                                    >
                                        <Td><span className="font-mono text-[12px]">{log.provider ?? '—'}</span></Td>
                                        <Td muted>{log.event_type ?? '—'}</Td>
                                        <Td><Badge tone={webhookStatusTone(log.status)}>{log.status ?? '—'}</Badge></Td>
                                        <Td muted>{log.store?.name ?? '—'}</Td>
                                        <Td align="right" muted>{timeAgo(log.created_at, now)}</Td>
                                    </tr>
                                    {expanded === log.id && (
                                        <tr className="border-t border-border bg-muted/20">
                                            <td colSpan={5} className="space-y-3 px-4 py-4">
                                                {log.error_message && (
                                                    <div>
                                                        <p className="mb-1 text-[12px] font-medium text-red-700 dark:text-red-300">Error</p>
                                                        <p className="rounded-md border border-red-300/70 bg-red-50/60 px-3 py-2 font-mono text-[12px] text-red-800 dark:border-red-500/30 dark:bg-red-500/[0.06] dark:text-red-300">
                                                            {log.error_message}
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="mb-1 text-[12px] font-medium text-muted-foreground">Payload</p>
                                                    <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
                                                        {JSON.stringify(log.payload, null, 2)}
                                                    </pre>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Panel>
        </div>
    )
}
