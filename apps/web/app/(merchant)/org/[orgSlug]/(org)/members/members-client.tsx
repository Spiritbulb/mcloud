'use client'

import { useState, useTransition } from 'react'
import { cn } from '@mcloud/ui/utils'
import { Button } from '@mcloud/ui/button'
import { Input } from '@mcloud/ui/input'
import { Label } from '@mcloud/ui/label'
import {
    inviteOrgMember,
    removeOrgMember,
    revokeOrgInvite,
    updateOrgMemberRole,
} from './actions'
import type { OrgMemberRow } from './actions'
import {
    UserX, Mail, Loader2, Clock, Shield, ShieldCheck, ShieldAlert,
} from 'lucide-react'

type Invite = { id: string; email: string | null; role: string | null; created_at: string; expires_at: string | null }

interface Props {
    orgId: string
    orgSlug: string
    members: OrgMemberRow[]
    invites: Invite[]
    currentRole: string | null
}

function RoleBadge({ role }: { role: string | null }) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
            role === 'owner' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            role === 'admin' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            role === 'member' && 'bg-muted text-muted-foreground',
        )}>
            {role === 'owner' && <ShieldCheck className="w-2.5 h-2.5" />}
            {role === 'admin' && <Shield className="w-2.5 h-2.5" />}
            {role === 'member' && <ShieldAlert className="w-2.5 h-2.5" />}
            {role}
        </span>
    )
}

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

function MemberRow({ member, orgId, orgSlug, currentRole, onRemove }: {
    member: OrgMemberRow
    orgId: string
    orgSlug: string
    currentRole: string | null
    onRemove: (id: string) => void
}) {
    const [isPending, start] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [roleChanging, startRole] = useTransition()

    const canRemove = member.role !== 'owner' &&
        (currentRole === 'owner' || (currentRole === 'admin' && member.role === 'member'))

    const canChangeRole = currentRole === 'owner' && member.role !== 'owner'

    const handleRemove = () => {
        start(async () => {
            const res = await removeOrgMember(member.id, orgId, orgSlug)
            if (res.error) setError(res.error)
            else onRemove(member.id)
        })
    }

    const handleRoleChange = (role: string) => {
        startRole(async () => {
            const res = await updateOrgMemberRole(member.id, orgId, orgSlug, role)
            if (res.error) setError(res.error)
        })
    }

    return (
        <div className="py-4 border-b border-border last:border-0">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={member.users?.name} url={member.users?.avatar_url} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">
                                {member.users?.name ?? 'Unknown'}
                            </p>
                            <RoleBadge role={member.role} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{member.users?.email ?? '—'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {canChangeRole && (
                        <select
                            defaultValue={member.role}
                            onChange={e => handleRoleChange(e.target.value)}
                            disabled={roleChanging}
                            className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                        </select>
                    )}
                    {canRemove && (
                        <button
                            onClick={handleRemove}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            aria-label="Remove member"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    )
}

function InviteRow({ invite, orgId, orgSlug, onRevoke }: {
    invite: Invite
    orgId: string
    orgSlug: string
    onRevoke: (id: string) => void
}) {
    const [isPending, start] = useTransition()
    if (!invite.expires_at) return null

    const expiresIn = Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / 86400000)
    if (!invite.email && !invite.role) return null
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
                onClick={() => start(async () => { await revokeOrgInvite(invite.id, orgId, orgSlug); onRevoke(invite.id) })}
                disabled={isPending}
                className="ml-4 text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
            >
                {isPending ? 'Revoking…' : 'Revoke'}
            </button>
        </div>
    )
}

function InviteForm({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('member')
    const [isPending, start] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null); setSuccess(false)
        const fd = new FormData()
        fd.append('orgId', orgId)
        fd.append('orgSlug', orgSlug)
        fd.append('email', email)
        fd.append('role', role)
        start(async () => {
            const res = await inviteOrgMember(fd)
            if (res.error) { setError(res.error); return }
            setSuccess(true); setEmail('')
            setTimeout(() => setSuccess(false), 3000)
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
                <div className="flex-1 grid gap-1.5">
                    <Label htmlFor="invite-email" className="text-xs text-muted-foreground">Email address</Label>
                    <Input
                        id="invite-email"
                        type="email"
                        placeholder="teammate@example.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(null) }}
                        required
                        className="h-9"
                    />
                </div>
                <div className="grid gap-1.5 w-28">
                    <Label htmlFor="invite-role" className="text-xs text-muted-foreground">Role</Label>
                    <select
                        id="invite-role"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                    </select>
                </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && <p className="text-xs text-green-600 dark:text-green-400">✓ Invite sent!</p>}
            <Button type="submit" size="sm" disabled={isPending || !email} className="rounded-lg h-9">
                {isPending ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Sending…</> : 'Send invite'}
            </Button>
            <p className="text-xs text-muted-foreground">Up to 10 invites per day. Invites expire after 7 days.</p>
        </form>
    )
}

export default function OrgMembersClient({ orgId, orgSlug, members: initial, invites: initialInvites, currentRole }: Props) {
    const [members, setMembers] = useState<OrgMemberRow[]>(initial)
    const [invites, setInvites] = useState<Invite[]>(initialInvites)
    const canInvite = currentRole === 'owner' || currentRole === 'admin'

    return (
        <div className="max-w-2xl mx-auto space-y-10">
            <div>
                <h1 className="text-lg font-semibold text-foreground">Organization members</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage who belongs to this organization.</p>
            </div>

            {canInvite && (
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-foreground">Invite someone</h2>
                    <InviteForm orgId={orgId} orgSlug={orgSlug} />
                </div>
            )}

            <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">
                    Members
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{members.length}</span>
                </h2>
                <div>
                    {members.map(member => (
                        <MemberRow
                            key={member.id}
                            member={member}
                            orgId={orgId}
                            orgSlug={orgSlug}
                            currentRole={currentRole}
                            onRemove={(id) => setMembers(prev => prev.filter(m => m.id !== id))}
                        />
                    ))}
                </div>
            </div>

            {invites.length > 0 && (
                <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">
                        Pending invites
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{invites.length}</span>
                    </h2>
                    <div>
                        {invites.map(invite => (
                            <InviteRow
                                key={invite.id}
                                invite={invite}
                                orgId={orgId}
                                orgSlug={orgSlug}
                                onRevoke={(id) => setInvites(prev => prev.filter(i => i.id !== id))}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
