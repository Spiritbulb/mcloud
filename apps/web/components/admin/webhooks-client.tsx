'use client'
import { useState } from 'react'

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

function relativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) {
        const hours = Math.floor(diff / 3600000)
        if (hours === 0) return `${Math.floor(diff / 60000)}m ago`
        return `${hours}h ago`
    }
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

export default function WebhooksClient({ logs }: { logs: WebhookLog[] }) {
    const [providerFilter, setProviderFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [expanded, setExpanded] = useState<string | null>(null)

    const providers = Array.from(new Set(logs.map(l => l.provider).filter(Boolean)))

    const filtered = logs.filter(l => {
        const matchProvider = !providerFilter || l.provider === providerFilter
        const matchStatus = !statusFilter || l.status === statusFilter
        return matchProvider && matchStatus
    })

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Webhook Logs</h1>
                <p className="text-sm text-muted-foreground mt-1">{logs.length} recent events</p>
            </div>

            <div className="flex gap-3 flex-wrap">
                <select
                    value={providerFilter}
                    onChange={e => setProviderFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">All providers</option>
                    {providers.map(p => (
                        <option key={p} value={p!}>{p}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">All statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Provider</th>
                            <th className="text-left px-4 py-3 font-medium">Event type</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-left px-4 py-3 font-medium">Store</th>
                            <th className="text-left px-4 py-3 font-medium">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(log => (
                            <>
                                <tr
                                    key={log.id}
                                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                    className="bg-background hover:bg-muted/40 transition-colors cursor-pointer"
                                >
                                    <td className="px-4 py-3 font-mono text-xs text-foreground">{log.provider ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{log.event_type ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            log.status === 'success'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : log.status === 'failed'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {log.status ?? '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{log.store?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">{relativeDate(log.created_at)}</td>
                                </tr>
                                {expanded === log.id && (
                                    <tr key={`${log.id}-expand`} className="bg-muted/20">
                                        <td colSpan={5} className="px-4 py-4 space-y-3">
                                            {log.error_message && (
                                                <div>
                                                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Error</p>
                                                    <p className="text-xs text-red-700 dark:text-red-300 font-mono bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">
                                                        {log.error_message}
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Payload</p>
                                                <pre className="text-xs font-mono bg-muted rounded px-3 py-2 overflow-x-auto max-h-64 text-foreground">
                                                    {JSON.stringify(log.payload, null, 2)}
                                                </pre>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No webhook logs found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
