'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    inviteMember,
    removeMember,
    revokeInvite,
    updateMemberPermissions,
} from './actions'
import { PERMISSIONS } from './utils'
import type { MemberRow } from './utils'
import {
    UserX,
    Mail,
    ChevronDown,
    ChevronUp,
    Loader2,
    Clock,
    Shield,
    ShieldCheck,
    ShieldAlert,
} from 'lucide-react'


// ─── Types ─────────────────────────────────────────────────────────────────────

type Member = MemberRow

interface Invite {
    id: string
    email: string
    role: string
    created_at: string
    expires_at: string
}

interface Props {
    storeId: string
    members: Member[]
    invites: Invite[]
    currentRole: string | null
    slug: string
}

// ─── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
            role === 'owner' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            role === 'admin' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            role === 'staff' && 'bg-muted text-muted-foreground',
        )}>
            {role === 'owner' && <ShieldCheck className="w-2.5 h-2.5" />}
            {role === 'admin' && <Shield className="w-2.5 h-2.5" />}
            {role === 'staff' && <ShieldAlert className="w-2.5 h-2.5" />}
            {role}
        </span>
    )
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, url }: { name: string | null; url: string | null }) {
    const initials = (name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    return url ? (
        <img src={url} alt={name ?? ''} className="w-8 h-8 rounded-full object-cover" />
    ) : (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
            {initials}
        </div>
    )
}

// ─── Permissions editor ────────────────────────────────────────────────────────

function PermissionsEditor({
    member,
    storeId,
    canEdit,
}: {
    member: Member
    storeId: string
    canEdit: boolean
}) {
    const [open, setOpen] = useState(false)
    const [perms, setPerms] = useState<string[]>(member.permissions ?? [])
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)

    const toggle = (key: string) => {
        setPerms(prev =>
            prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
        )
        setSaved(false)
    }

    const save = () => {
        startTransition(async () => {
            await updateMemberPermissions(member.id, storeId, perms)
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        })
    }

    // Owners always have all permissions — no editor needed
    if (member.role === 'owner') {
        return (
            <p className="text-xs text-muted-foreground mt-1">
                Owners have full access to all features.
            </p>
        )
    }

    return (
        <div className="mt-2">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {open ? 'Hide permissions' : 'Manage permissions'}
            </button>

            {open && (
                <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PERMISSIONS.map(p => (
                            <label
                                key={p.key}
                                className={cn(
                                    'flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors',
                                    perms.includes(p.key)
                                        ? 'border-primary/40 bg-primary/5'
                                        : 'border-border bg-background hover:bg-muted/40',
                                    !canEdit && 'opacity-50 pointer-events-none'
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={perms.includes(p.key)}
                                    onChange={() => toggle(p.key)}
                                    disabled={!canEdit}
                                    className="mt-0.5 accent-primary"
                                />
                                <div>
                                    <p className="text-xs font-medium text-foreground">{p.label}</p>
                                    <p className="text-[11px] text-muted-foreground">{p.description}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    {canEdit && (
                        <Button
                            size="sm"
                            onClick={save}
                            disabled={isPending}
                            className="rounded-lg h-8 text-xs"
                        >
                            {isPending
                                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving…</>
                                : saved ? '✓ Saved' : 'Save permissions'
                            }
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Member row ────────────────────────────────────────────────────────────────

function MemberRow({
    member,
    storeId,
    currentRole,
    onRemove,
}: {
    member: Member
    storeId: string
    currentRole: string | null
    onRemove: (id: string) => void
}) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const canRemove =
        member.role !== 'owner' &&
        (currentRole === 'owner' || (currentRole === 'admin' && member.role === 'staff'))

    const canEditPerms =
        member.role !== 'owner' &&
        (currentRole === 'owner' || (currentRole === 'admin' && member.role === 'staff'))

    const handleRemove = () => {
        startTransition(async () => {
            const result = await removeMember(member.id, storeId)
            if (result.error) setError(result.error)
            else onRemove(member.id)
        })
    }

    return (
        <div className="py-4 border-b border-border last:border-0">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={member.users?.name} url={member.users?.avatar_url} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">
                                {member.users?.name ?? 'Unknown'}
                            </p>
                            <RoleBadge role={member.role} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {member.users?.email ?? '—'}
                        </p>
                    </div>
                </div>

                {canRemove && (
                    <button
                        onClick={handleRemove}
                        disabled={isPending}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        aria-label="Remove member"
                    >
                        {isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <UserX className="w-4 h-4" />
                        }
                    </button>
                )}
            </div>

            {error && <p className="text-xs text-destructive mt-1">{error}</p>}

            <div className="ml-11">
                <PermissionsEditor
                    member={member}
                    storeId={storeId}
                    canEdit={canEditPerms}
                />
            </div>
        </div>
    )
}

// ─── Invite row ────────────────────────────────────────────────────────────────

function InviteRow({
    invite,
    storeId,
    onRevoke,
}: {
    invite: Invite
    storeId: string
    onRevoke: (id: string) => void
}) {
    const [isPending, startTransition] = useTransition()

    const handleRevoke = () => {
        startTransition(async () => {
            await revokeInvite(invite.id, storeId)
            onRevoke(invite.id)
        })
    }

    const expiresIn = Math.ceil(
        (new Date(invite.expires_at).getTime() - Date.now()) / 86400000
    )

    return (
        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-foreground truncate">{invite.email}</p>
                        <RoleBadge role={invite.role} />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires in {expiresIn}d
                    </p>
                </div>
            </div>
            <button
                onClick={handleRevoke}
                disabled={isPending}
                className="ml-4 text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
            >
                {isPending ? 'Revoking…' : 'Revoke'}
            </button>
        </div>
    )
}

// ─── Invite form ───────────────────────────────────────────────────────────────

function InviteForm({
    storeId,
    onInvited,
}: {
    storeId: string
    onInvited: (invite: Invite) => void
}) {
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('staff')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        const formData = new FormData()
        formData.append('storeId', storeId)
        formData.append('email', email)
        formData.append('role', role)

        startTransition(async () => {
            const result = await inviteMember(formData)
            if (result.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                setEmail('')
                setTimeout(() => setSuccess(false), 3000)
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
                <div className="flex-1 grid gap-1.5">
                    <Label htmlFor="invite-email" className="text-xs text-muted-foreground">
                        Email address
                    </Label>
                    <Input
                        id="invite-email"
                        type="email"
                        placeholder="teammate@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null) }}
                        required
                        className="h-9"
                    />
                </div>

                <div className="grid gap-1.5 w-28">
                    <Label htmlFor="invite-role" className="text-xs text-muted-foreground">
                        Role
                    </Label>
                    <select
                        id="invite-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                    </select>
                </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && <p className="text-xs text-green-600 dark:text-green-400">✓ Invite sent!</p>}

            <Button
                type="submit"
                size="sm"
                disabled={isPending || !email}
                className="rounded-lg h-9"
            >
                {isPending
                    ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Sending…</>
                    : 'Send invite'
                }
            </Button>

            <p className="text-xs text-muted-foreground">
                Up to 5 invites per day. Invites expire after 7 days.
            </p>
        </form>
    )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MembersPage({
    storeId,
    members: initialMembers,
    invites: initialInvites,
    currentRole,
    slug,
}: Props) {
    const [members, setMembers] = useState<Member[]>(initialMembers)
    const [invites, setInvites] = useState<Invite[]>(initialInvites)

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

            {/* Header */}
            <div>
                <h1 className="text-lg font-semibold text-foreground">Team members</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage who has access to this store and what they can do.
                </p>
            </div>

            {/* Invite form */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Invite someone</h2>
                <InviteForm
                    storeId={storeId}
                    onInvited={(invite) => setInvites(prev => [invite, ...prev])}
                />
            </div>

            {/* Current members */}
            <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">
                    Members
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {members.length}
                    </span>
                </h2>
                <div>
                    {members.map(member => (
                        <MemberRow
                            key={member.id}
                            member={member}
                            storeId={storeId}
                            currentRole={currentRole}
                            onRemove={(id) => setMembers(prev => prev.filter(m => m.id !== id))}
                        />
                    ))}
                </div>
            </div>

            {/* Pending invites */}
            {invites.length > 0 && (
                <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">
                        Pending invites
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {invites.length}
                        </span>
                    </h2>
                    <div>
                        {invites.map(invite => (
                            <InviteRow
                                key={invite.id}
                                invite={invite}
                                storeId={storeId}
                                onRevoke={(id) => setInvites(prev => prev.filter(i => i.id !== id))}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}