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
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Badge } from '@mcloud/ui/kit/badge'
import { Avatar } from '@mcloud/ui/kit/avatar'
import { Button } from '@mcloud/ui/kit/button'
import { SearchField, SelectField, Toolbar } from '@mcloud/ui/kit/fields'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Notice } from '@mcloud/ui/kit/notice'

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

type PlanDialog = { store: Store }
type StatusDialog = { store: Store; newStatus: boolean }

const DANGER = 'bg-destructive text-destructive-foreground hover:bg-destructive/90'

export default function StoresClient({ stores }: { stores: Store[] }) {
    const [rows, setRows] = useState(stores)
    const [search, setSearch] = useState('')
    const [planFilter, setPlanFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [planDialog, setPlanDialog] = useState<PlanDialog | null>(null)
    const [statusDialog, setStatusDialog] = useState<StatusDialog | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const q = search.toLowerCase()
    const filtered = rows.filter(s => {
        const matchSearch =
            (s.name ?? '').toLowerCase().includes(q) ||
            (s.slug ?? '').toLowerCase().includes(q) ||
            (s.owner?.email ?? '').toLowerCase().includes(q)
        const matchPlan = !planFilter || (planFilter === 'pro') === !!s.is_pro
        const matchStatus = !statusFilter || (statusFilter === 'active') === (s.is_active !== false)
        return matchSearch && matchPlan && matchStatus
    })
    const proCount = rows.filter(s => s.is_pro).length

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
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader title="Stores" description={`${rows.length.toLocaleString()} total · ${proCount.toLocaleString()} on a paid plan`} />

            <Toolbar>
                <SearchField value={search} onChange={setSearch} placeholder="Search name, slug or owner email" />
                <SelectField value={planFilter} onChange={setPlanFilter} label="Filter by plan">
                    <option value="">All plans</option>
                    <option value="pro">Pro</option>
                    <option value="free">Free</option>
                </SelectField>
                <SelectField value={statusFilter} onChange={setStatusFilter} label="Filter by status">
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </SelectField>
            </Toolbar>

            {error && !planDialog && !statusDialog && <Notice tone="error">{error}</Notice>}

            <Panel flush>
                {filtered.length === 0 ? (
                    <EmptyState icon="storefront" title="No stores found" description={search || planFilter || statusFilter ? 'Try a different search or filter.' : undefined} />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Store</Th>
                                <Th>Owner</Th>
                                <Th>Plan</Th>
                                <Th>Status</Th>
                                <Th align="right">Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(store => {
                                const isActive = store.is_active !== false
                                return (
                                    <Tr key={store.id}>
                                        <Td>
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={store.name} src={store.logo_url} />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{store.name ?? '—'}</p>
                                                    <p className="truncate font-mono text-[11px] text-muted-foreground">{store.slug ?? '—'}</p>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td label="Owner">
                                            <p>{store.owner?.name ?? '—'}</p>
                                            <p className="text-[12px] text-muted-foreground">{store.owner?.email ?? ''}</p>
                                        </Td>
                                        <Td label="Plan"><Badge tone={store.is_pro ? 'success' : 'neutral'}>{store.is_pro ? 'Pro' : 'Free'}</Badge></Td>
                                        <Td label="Status"><Badge tone={isActive ? 'success' : 'danger'}>{isActive ? 'Active' : 'Suspended'}</Badge></Td>
                                        <Td align="right">
                                            <div className="flex flex-wrap items-center justify-end gap-2 max-md:justify-start max-md:pt-1">
                                                <Button size="sm" onClick={() => setPlanDialog({ store })}>Manage plan</Button>
                                                <Button size="sm" variant={isActive ? 'danger' : 'secondary'} onClick={() => setStatusDialog({ store, newStatus: !isActive })}>
                                                    {isActive ? 'Suspend' : 'Unsuspend'}
                                                </Button>
                                            </div>
                                        </Td>
                                    </Tr>
                                )
                            })}
                        </tbody>
                    </Table>
                )}
            </Panel>

            {/* Plan Dialog */}
            <AlertDialog open={!!planDialog} onOpenChange={open => { if (!open) { setPlanDialog(null); setError(null) } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Manage plan — {planDialog?.store.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Current plan: <strong>{planDialog?.store.is_pro ? 'Pro' : 'Free'}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && <Notice tone="error">{error}</Notice>}
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        {planDialog?.store.is_pro ? (
                            <AlertDialogAction onClick={() => handlePlanAction('revoke')} disabled={loading} className={DANGER}>
                                {loading ? 'Saving…' : 'Revoke Pro'}
                            </AlertDialogAction>
                        ) : (
                            <AlertDialogAction onClick={() => handlePlanAction('grant')} disabled={loading}>
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
                            {statusDialog?.newStatus ? `Unsuspend ${statusDialog?.store.name}?` : `Suspend ${statusDialog?.store.name}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {statusDialog?.newStatus
                                ? 'The store will be visible and accessible to customers again.'
                                : 'The store will be hidden from customers and inaccessible until unsuspended.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && <Notice tone="error">{error}</Notice>}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmStatusChange} disabled={loading} className={statusDialog?.newStatus ? '' : DANGER}>
                            {loading ? 'Saving…' : statusDialog?.newStatus ? 'Unsuspend' : 'Suspend'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
