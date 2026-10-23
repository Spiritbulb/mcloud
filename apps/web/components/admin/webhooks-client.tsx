'use client'
import { Fragment, useState } from 'react'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Badge, webhookStatusTone } from '@mcloud/ui/kit/badge'
import { FilterBar } from '@mcloud/ui/kit/filter-bar'
import { Pagination } from '@mcloud/ui/kit/pagination'
import { isFiltered, type ListQuery } from '@mcloud/ui/kit/list-query'
import { Notice } from '@mcloud/ui/kit/notice'
import { ROW_CLASS, Table, Td, Th } from '@mcloud/ui/kit/table'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { timeAgo } from '@mcloud/ui/kit/ui-logic'
import { WEBHOOK_STATUSES } from './webhooks-filters'

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

export default function WebhooksClient({
    logs,
    total,
    failed,
    providers,
    pages,
    q,
    error,
}: {
    logs: WebhookLog[]
    total: number
    failed: number
    providers: string[]
    pages: number
    q: ListQuery<'provider' | 'status'>
    error: string | null
}) {
    const [expanded, setExpanded] = useState<string | null>(null)
    const [now] = useState(() => Date.now())
    const filtered = isFiltered(q)

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader title="Webhook logs" description={`${total.toLocaleString()} ${filtered ? (total === 1 ? 'match' : 'matches') : 'events'}${failed ? ` · ${failed.toLocaleString()} failed overall` : ''}`} />

            <FilterBar
                searchPlaceholder="Search event, provider or error"
                filters={[
                    { name: 'provider', label: 'Filter by provider', allLabel: 'All providers', options: providers.map(p => ({ value: p, label: p })) },
                    { name: 'status', label: 'Filter by status', allLabel: 'All statuses', options: WEBHOOK_STATUSES },
                ]}
            />

            {error && <Notice tone="error">Could not load webhook logs: {error}</Notice>}

            <Panel flush>
                {logs.length === 0 ? (
                    <EmptyState icon="webhook" title="No webhook logs" description={filtered ? 'Try a different search or filter.' : 'Provider callbacks will be listed here once they are recorded.'} />
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
                            {logs.map(log => (
                                <Fragment key={log.id}>
                                    <tr
                                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                        className={`cursor-pointer ${ROW_CLASS}`}
                                        aria-expanded={expanded === log.id}
                                    >
                                        <Td><span className="font-mono text-[12px]">{log.provider ?? '—'}</span></Td>
                                        <Td muted label="Event">{log.event_type ?? '—'}</Td>
                                        <Td label="Status"><Badge tone={webhookStatusTone(log.status)}>{log.status ?? '—'}</Badge></Td>
                                        <Td muted label="Store">{log.store?.name ?? '—'}</Td>
                                        <Td align="right" muted label="When">{timeAgo(log.created_at, now)}</Td>
                                    </tr>
                                    {expanded === log.id && (
                                        <tr className="border-t border-border bg-muted/20 max-md:block">
                                            <td colSpan={5} className="space-y-3 px-4 py-4 max-md:block">
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

            <Pagination basePath="/admin/webhooks" q={q} pages={pages} total={total} newestFirst />
        </div>
    )
}
