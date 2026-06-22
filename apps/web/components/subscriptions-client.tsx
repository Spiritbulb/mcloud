// components/subscriptions-client.tsx
'use client'
import { useState } from 'react'

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

    async function activate(subId: string, storeId: string) {
        setLoading(subId)
        const res = await fetch('/api/admin/subscriptions/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription_id: subId, store_id: storeId }),
        })
        if (res.ok) {
            setRows(prev => prev.map(r =>
                r.id === subId ? { ...r, status: 'active', stores: r.stores ? { ...r.stores, is_pro: true } : null } : r
            ))
        }
        setLoading(null)
    }

    const statusColor: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        active: 'bg-green-100 text-green-800',
        cancelled: 'bg-muted text-muted-foreground',
        expired: 'bg-red-100 text-red-800',
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Subscriptions</h1>
                <p className="text-sm text-muted-foreground mt-1">{rows.length} total — manually activate after confirming payment</p>
            </div>

                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Store</th>
                                <th className="text-left px-4 py-3 font-medium">Amount</th>
                                <th className="text-left px-4 py-3 font-medium">Status</th>
                                <th className="text-left px-4 py-3 font-medium">Order ID</th>
                                <th className="text-left px-4 py-3 font-medium">Date</th>
                                <th className="text-left px-4 py-3 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rows.map(sub => (
                                <tr key={sub.id} className="bg-background hover:bg-muted/40 transition-colors">
                                    <td className="px-4 py-3">
                                        <a
                                            href={`/store/${sub.stores?.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-foreground hover:text-primary hover:underline"
                                        >
                                            {sub.stores?.name ?? '—'}
                                        </a>
                                        <p className="text-xs text-muted-foreground">{sub.stores?.slug}</p>
                                    </td>
                                    <td className="px-4 py-3 font-mono">
                                        {sub.currency} {sub.amount.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[sub.status] ?? 'bg-muted text-muted-foreground'}`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {sub.google_play_order_id ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">
                                        {new Date(sub.created_at).toLocaleDateString('en-KE', {
                                            day: 'numeric', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-4 py-3">
                                        {sub.status !== 'active' && sub.stores && (
                                            <button
                                                onClick={() => activate(sub.id, sub.stores!.id)}
                                                disabled={loading === sub.id}
                                                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                            >
                                                {loading === sub.id ? 'Activating…' : 'Activate Pro'}
                                            </button>
                                        )}
                                        {sub.status === 'active' && (
                                            <span className="text-xs text-muted-foreground">✓ Active</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                        No subscriptions yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
        </div>
    )
}
