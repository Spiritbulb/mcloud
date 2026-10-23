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
import { PageHeader } from '@/components/admin/ui/page-header'
import { Panel } from '@/components/admin/ui/panel'
import { Badge, roleTone } from '@/components/admin/ui/badge'
import { Avatar } from '@/components/admin/ui/avatar'
import { Button } from '@/components/admin/ui/button'
import { FilterBar } from '@/components/admin/ui/filter-bar'
import { Pagination } from '@/components/admin/ui/pagination'
import { isFiltered, type ListQuery } from '@/components/admin/ui/list-query'
import { Table, Td, Th, Tr } from '@/components/admin/ui/table'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { Notice } from '@/components/admin/ui/notice'
import { timeAgo } from '@/components/admin/ui/ui-logic'
import { USER_ROLES } from './users-filters'

type User = {
    id: string
    name: string | null
    email: string | null
    avatar_url: string | null
    role: string | null
    created_at: string
}

export default function UsersClient({
    users,
    total,
    admins,
    pages,
    q,
    error: loadError,
}: {
    users: User[]
    total: number
    admins: number
    pages: number
    q: ListQuery<'role'>
    error: string | null
}) {
    // Roles changed on this page, laid over the server rows so a refetch (next page, new search) is not stale.
    const [changed, setChanged] = useState<Record<string, string>>({})
    const rows = users.map(u => (changed[u.id] ? { ...u, role: changed[u.id] } : u))
    const filtered = isFiltered(q)
    const [pending, setPending] = useState<{ user: User; newRole: 'admin' | 'user' } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [now] = useState(() => Date.now())

    // The header count is the whole platform's, so adjust it for role changes made here.
    const adminDelta = Object.entries(changed).reduce((n, [id, role]) => {
        const was = users.find(u => u.id === id)?.role
        return n + (role === 'admin' ? 1 : 0) - (was === 'admin' ? 1 : 0)
    }, 0)
    const adminCount = Math.max(0, admins + adminDelta)

    async function confirmRoleChange() {
        if (!pending) return
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/users/${pending.user.id}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: pending.newRole }),
        })
        if (res.ok) {
            // The server decides what a revoked admin becomes (client or customer); show that.
            const saved = (await res.json().catch(() => null))?.role ?? pending.newRole
            setChanged(prev => ({ ...prev, [pending.user.id]: saved }))
            setPending(null)
        } else {
            const data = await res.json().catch(() => null)
            setError(data?.error ?? 'Something went wrong')
        }
        setLoading(false)
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader title="Users" description={`${total.toLocaleString()} ${filtered ? (total === 1 ? 'match' : 'matches') : 'total'} · ${adminCount} ${adminCount === 1 ? 'admin' : 'admins'}`} />

            <FilterBar
                searchPlaceholder="Search name or email"
                filters={[{ name: 'role', label: 'Filter by role', allLabel: 'All roles', options: USER_ROLES }]}
            />

            {loadError && <Notice tone="error">Could not load users: {loadError}</Notice>}

            {error && !pending && <Notice tone="error">{error}</Notice>}

            <Panel flush>
                {rows.length === 0 ? (
                    <EmptyState icon="people" title="No users found" description={filtered ? 'Try a different search or filter.' : undefined} />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>User</Th>
                                <Th>Role</Th>
                                <Th>Joined</Th>
                                <Th align="right">Action</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(user => (
                                <Tr key={user.id}>
                                    <Td>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar name={user.name ?? user.email} src={user.avatar_url} shape="circle" />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{user.name ?? '—'}</p>
                                                <p className="truncate text-[12px] text-muted-foreground">{user.email ?? '—'}</p>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td label="Role"><Badge tone={roleTone(user.role)}>{user.role ?? 'customer'}</Badge></Td>
                                    <Td muted label="Joined">{timeAgo(user.created_at, now)}</Td>
                                    <Td align="right">
                                        <Button
                                            size="sm"
                                            variant={user.role === 'admin' ? 'danger' : 'secondary'}
                                            onClick={() => setPending({ user, newRole: user.role === 'admin' ? 'user' : 'admin' })}
                                        >
                                            {user.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                                        </Button>
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Panel>

            <Pagination basePath="/admin/users" q={q} pages={pages} total={total} />

            <AlertDialog open={!!pending} onOpenChange={open => { if (!open) { setPending(null); setError(null) } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pending?.newRole === 'admin'
                                ? `Grant admin access to ${pending?.user.name ?? pending?.user.email}?`
                                : `Revoke admin from ${pending?.user.name ?? pending?.user.email}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending?.newRole === 'admin'
                                ? 'They will have full platform access including this admin console.'
                                : 'They will lose access to this admin console immediately.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && <Notice tone="error">{error}</Notice>}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRoleChange} disabled={loading}>
                            {loading ? 'Saving…' : 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
