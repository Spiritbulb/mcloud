'use client'
import { useState } from 'react'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@mcloud/ui/alert-dialog'

type Store = {
    id: string
    name: string | null
    slug: string | null
    logo_url: string | null
    is_pro: boolean | null
    is_active: boolean | null
    pro_since: string | null
    pro_expires_at: string | null
    owner_id: string | null
    currency: string | null
    created_at: string
    owner: { name: string | null; email: string | null } | null
}

function getInitials(name: string | null) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type PlanDialog = { store: Store }
type StatusDialog = { store: Store; newStatus: boolean }

export default function StoresClient({ stores }: { stores: Store[] }) {
    const [rows, setRows] = useState(stores)
    const [search, setSearch] = useState('')
    const [planDialog, setPlanDialog] = useState<PlanDialog | null>(null)
    const [statusDialog, setStatusDialog] = useState<StatusDialog | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const filtered = rows.filter(s =>
        (s.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.slug ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.owner?.email ?? '').toLowerCase().includes(search.toLowerCase())
    )

    async function handlePlanAction(action: 'grant' | 'revoke') {
        if (!planDialog) return
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/stores/${planDialog.store.id}/plan`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        })
        if (res.ok) {
            const now = new Date().toISOString()
            setRows(prev => prev.map(s => s.id === planDialog.store.id
                ? {
                    ...s,
                    is_pro: action === 'grant',
                    pro_since: action === 'grant' ? now : s.pro_since,
                    pro_expires_at: action === 'revoke' ? now : null,
                }
                : s
            ))
            setPlanDialog(null)
        } else {
            const data = await res.json()
            setError(data.error ?? 'Something went wrong')
        }
        setLoading(false)
    }

    async function confirmStatusChange() {
        if (!statusDialog) return
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/stores/${statusDialog.store.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: statusDialog.newStatus }),
        })
        if (res.ok) {
            setRows(prev => prev.map(s => s.id === statusDialog.store.id
                ? { ...s, is_active: statusDialog.newStatus }
                : s
            ))
            setStatusDialog(null)
        } else {
            const data = await res.json()
            setError(data.error ?? 'Something went wrong')
        }
        setLoading(false)
    }

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Stores</h1>
                <p className="text-sm text-muted-foreground mt-1">{rows.length} total</p>
            </div>

            <input
                type="text"
                placeholder="Search by name, slug or owner email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Store</th>
                            <th className="text-left px-4 py-3 font-medium">Slug</th>
                            <th className="text-left px-4 py-3 font-medium">Owner</th>
                            <th className="text-left px-4 py-3 font-medium">Pro</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-left px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(store => {
                            const isActive = store.is_active !== false
                            return (
                                <tr key={store.id} className="bg-background hover:bg-muted/40 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="store-avatar-fallback w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                                {store.logo_url
                                                    ? <img src={store.logo_url} alt={store.name ?? ''} className="w-full h-full object-cover" />
                                                    : getInitials(store.name)
                                                }
                                            </div>
                                            <span className="font-medium text-foreground">{store.name ?? '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{store.slug ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-foreground">{store.owner?.name ?? '—'}</span>
                                        <p className="text-xs text-muted-foreground">{store.owner?.email ?? ''}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            store.is_pro
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {store.is_pro ? 'Pro' : 'Free'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            isActive
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                            {isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPlanDialog({ store })}
                                                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                                            >
                                                Manage plan
                                            </button>
                                            <button
                                                onClick={() => setStatusDialog({ store, newStatus: !isActive })}
                                                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                                            >
                                                {isActive ? 'Suspend' : 'Unsuspend'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No stores found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Plan Dialog */}
            <AlertDialog open={!!planDialog} onOpenChange={open => { if (!open) { setPlanDialog(null); setError(null) } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Manage plan — {planDialog?.store.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Current plan: <strong>{planDialog?.store.is_pro ? 'Pro' : 'Free'}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && <p className="text-sm text-red-500 px-1">{error}</p>}
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        {planDialog?.store.is_pro ? (
                            <AlertDialogAction
                                onClick={() => handlePlanAction('revoke')}
                                disabled={loading}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {loading ? 'Saving…' : 'Revoke Pro'}
                            </AlertDialogAction>
                        ) : (
                            <AlertDialogAction
                                onClick={() => handlePlanAction('grant')}
                                disabled={loading}
                            >
                                {loading ? 'Saving…' : 'Grant Pro'}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Status Dialog */}
            <AlertDialog open={!!statusDialog} onOpenChange={open => { if (!open) { setStatusDialog(null); setError(null) } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {statusDialog?.newStatus
                                ? `Unsuspend ${statusDialog?.store.name}?`
                                : `Suspend ${statusDialog?.store.name}?`
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {statusDialog?.newStatus
                                ? 'The store will be visible and accessible to customers again.'
                                : 'The store will be hidden from customers and inaccessible until unsuspended.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && <p className="text-sm text-red-500 px-1">{error}</p>}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmStatusChange}
                            disabled={loading}
                            className={statusDialog?.newStatus ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
                        >
                            {loading ? 'Saving…' : statusDialog?.newStatus ? 'Unsuspend' : 'Suspend'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
