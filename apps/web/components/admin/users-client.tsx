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

type User = {
    id: string
    name: string | null
    email: string | null
    avatar_url: string | null
    role: string | null
    created_at: string
}

function getInitials(name: string | null) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function relativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
}

export default function UsersClient({ users }: { users: User[] }) {
    const [rows, setRows] = useState(users)
    const [search, setSearch] = useState('')
    const [pending, setPending] = useState<{ user: User; newRole: 'admin' | 'user' } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const filtered = rows.filter(u =>
        (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    )

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
            setRows(prev => prev.map(u => u.id === pending.user.id ? { ...u, role: pending.newRole } : u))
            setPending(null)
        } else {
            const data = await res.json()
            setError(data.error ?? 'Something went wrong')
        }
        setLoading(false)
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Users</h1>
                <p className="text-sm text-muted-foreground mt-1">{rows.length} total</p>
            </div>

            <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">User</th>
                            <th className="text-left px-4 py-3 font-medium">Email</th>
                            <th className="text-left px-4 py-3 font-medium">Role</th>
                            <th className="text-left px-4 py-3 font-medium">Joined</th>
                            <th className="text-left px-4 py-3 font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(user => (
                            <tr key={user.id} className="bg-background hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="store-avatar-fallback w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                            {user.avatar_url
                                                ? <img src={user.avatar_url} alt={user.name ?? ''} className="w-full h-full object-cover" />
                                                : getInitials(user.name)
                                            }
                                        </div>
                                        <span className="font-medium text-foreground">{user.name ?? '—'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{user.email ?? '—'}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        user.role === 'admin'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {user.role ?? 'user'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">{relativeDate(user.created_at)}</td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => setPending({
                                            user,
                                            newRole: user.role === 'admin' ? 'user' : 'admin',
                                        })}
                                        className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                                    >
                                        {user.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No users found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AlertDialog open={!!pending} onOpenChange={open => { if (!open) setPending(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pending?.newRole === 'admin'
                                ? `Grant admin access to ${pending?.user.name}?`
                                : `Revoke admin from ${pending?.user.name}?`
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending?.newRole === 'admin'
                                ? 'They will have full platform access including this admin console.'
                                : 'They will lose access to this admin console immediately.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
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
