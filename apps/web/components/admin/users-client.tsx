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
import { SearchField, SelectField, Toolbar } from '@/components/admin/ui/fields'
import { Table, Td, Th, Tr } from '@/components/admin/ui/table'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { Notice } from '@/components/admin/ui/notice'
import { timeAgo } from '@/components/admin/ui/ui-logic'

type User = {
    id: string
    name: string | null
    email: string | null
    avatar_url: string | null
    role: string | null
    created_at: string
}

export default function UsersClient({ users }: { users: User[] }) {
    const [rows, setRows] = useState(users)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [pending, setPending] = useState<{ user: User; newRole: 'admin' | 'user' } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [now] = useState(() => Date.now())

    const q = search.toLowerCase()
    const filtered = rows.filter(u => {
        const matchSearch = (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
        return matchSearch && (!roleFilter || u.role === roleFilter)
    })
    const admins = rows.filter(u => u.role === 'admin').length

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
            setRows(prev => prev.map(u => u.id === pending.user.id ? { ...u, role: saved } : u))
            setPending(null)
        } else {
            const data = await res.json().catch(() => null)
            setError(data?.error ?? 'Something went wrong')
        }
        setLoading(false)
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader title="Users" description={`${rows.length.toLocaleString()} total · ${admins} ${admins === 1 ? 'admin' : 'admins'}`} />

            <Toolbar>
                <SearchField value={search} onChange={setSearch} placeholder="Search name or email" />
                <SelectField value={roleFilter} onChange={setRoleFilter} label="Filter by role">
                    <option value="">All roles</option>
                    <option value="admin">Admin</option>
                    <option value="client">Client</option>
                    <option value="customer">Customer</option>
                </SelectField>
            </Toolbar>

            {error && !pending && <Notice tone="error">{error}</Notice>}

            <Panel flush>
                {filtered.length === 0 ? (
                    <EmptyState icon="people" title="No users found" description={search || roleFilter ? 'Try a different search or filter.' : undefined} />
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
                            {filtered.map(user => (
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
                                    <Td><Badge tone={roleTone(user.role)}>{user.role ?? 'customer'}</Badge></Td>
                                    <Td muted>{timeAgo(user.created_at, now)}</Td>
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
