'use client'

import { useState, useTransition } from 'react'
import { cn } from '@mcloud/ui/utils'
import { Avatar } from '@mcloud/ui/kit/avatar'
import { Badge, type BadgeTone } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { Field, FormGrid, Select, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import {
    inviteMember,
    removeMember,
    revokeInvite,
    updateMemberPermissions,
} from './actions'
import { PERMISSIONS } from './utils'
import type { MemberRow } from './utils'
import { canManageMember, daysUntil, roleLabel } from './members-logic'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Member = MemberRow

interface Invite {
    id: string
    email: string | null
    role: string | null
    created_at: string | null
    expires_at: string | null
}

interface Props {
    storeId: string
    members: Member[]
    invites: Invite[]
    currentRole: string | null
    slug: string
}

const ROLE_TONE: Record<string, BadgeTone> = { owner: 'warning', admin: 'info', staff: 'neutral' }

function RoleBadge({ role }: { role: string | null }) {
    return <Badge tone={ROLE_TONE[role ?? ''] ?? 'neutral'}>{roleLabel(role)}</Badge>
}

// ─── Permissions editor ────────────────────────────────────────────────────────

function PermissionsEditor({ member, storeId, canEdit }: { member: Member; storeId: string; canEdit: boolean }) {
    const [open, setOpen] = useState(false)
    const [perms, setPerms] = useState<string[]>(member.permissions ?? [])
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)

    const toggle = (key: string) => {
        setPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]))
        setSaved(false)
    }

    const save = () => {
        startTransition(async () => {
            await updateMemberPermissions(member.id, storeId, perms)
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        })
    }

    // Owners always have every permission, so there is nothing to edit.
    if (member.role === 'owner') {
        return <p className="mt-1 text-[12px] text-muted-foreground">Owners have full access to every feature.</p>
    }

    return (
        <div className="mt-1.5">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
                <Icon name={open ? 'expand_less' : 'expand_more'} size={15} />
                {open ? 'Hide permissions' : `Permissions (${perms.length})`}
            </button>

            {open && (
                <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {PERMISSIONS.map((p) => {
                            const on = perms.includes(p.key)
                            return (
                                <label
                                    key={p.key}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors',
                                        on ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/40',
                                        !canEdit && 'pointer-events-none opacity-60',
                                    )}
                                >
                                    <input type="checkbox" checked={on} onChange={() => toggle(p.key)} disabled={!canEdit} className="mt-0.5 accent-primary" />
                                    <span>
                                        <span className="block text-[12px] font-medium text-foreground">{p.label}</span>
                                        <span className="block text-[12px] text-muted-foreground">{p.description}</span>
                                    </span>
                                </label>
                            )
                        })}
                    </div>
                    {canEdit && (
                        <Button size="sm" variant="primary" onClick={save} disabled={isPending}>
                            {isPending ? <Spinner size={11} /> : saved ? <Icon name="check" size={14} /> : null}
                            {isPending ? 'Saving…' : saved ? 'Saved' : 'Save permissions'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Member row ────────────────────────────────────────────────────────────────

function MemberItem({ member, storeId, currentRole, onRemove }: {
    member: Member
    storeId: string
    currentRole: string | null
    onRemove: (id: string) => void
}) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)
    const canManage = canManageMember(currentRole, member.role)
    const name = member.users?.name ?? 'Unknown'

    const handleRemove = () => {
        startTransition(async () => {
            const result = await removeMember(member.id, storeId)
            if (result.error) { setError(result.error); setConfirming(false) }
            else onRemove(member.id)
        })
    }

    return (
        <li className="px-4 py-3">
            <div className="flex items-start gap-3">
                <Avatar name={member.users?.name ?? null} src={member.users?.avatar_url} shape="circle" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-foreground">{name}</p>
                        <RoleBadge role={member.role} />
                    </div>
                    <p className="truncate text-[12px] text-muted-foreground">{member.users?.email ?? '—'}</p>
                    {error && <p role="alert" className="mt-1 text-[12px] text-red-700 dark:text-red-300">{error}</p>}
                    <PermissionsEditor member={member} storeId={storeId} canEdit={canManage} />
                </div>
                {canManage && (
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label={`Remove ${name}`}>
                        <Icon name="person_remove" size={15} />
                        <span className="max-sm:hidden">Remove</span>
                    </Button>
                )}
            </div>
            <ConfirmDialog
                open={confirming}
                title={`Remove ${name}?`}
                description="They lose access to this store straight away. You can invite them again later."
                confirmLabel="Remove member"
                busy={isPending}
                onConfirm={handleRemove}
                onCancel={() => setConfirming(false)}
            />
        </li>
    )
}

// ─── Invite row ────────────────────────────────────────────────────────────────

function InviteItem({ invite, storeId, now, onRevoke }: { invite: Invite; storeId: string; now: number; onRevoke: (id: string) => void }) {
    const [isPending, startTransition] = useTransition()
    const days = daysUntil(invite.expires_at, now)

    const handleRevoke = () => {
        startTransition(async () => {
            await revokeInvite(invite.id, storeId)
            onRevoke(invite.id)
        })
    }

    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon name="mail" size={14} className="text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] text-foreground">{invite.email}</p>
                    <RoleBadge role={invite.role} />
                </div>
                {days !== null && (
                    <p className="text-[12px] text-muted-foreground">{days === 0 ? 'Expires today' : `Expires in ${days} ${days === 1 ? 'day' : 'days'}`}</p>
                )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleRevoke} disabled={isPending}>
                {isPending ? 'Revoking…' : 'Revoke'}
            </Button>
        </li>
    )
}

// ─── Invite form ───────────────────────────────────────────────────────────────

function InviteForm({ storeId }: { storeId: string }) {
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
        <Panel title="Invite someone" description="Up to 5 invites per day. Invites expire after 7 days.">
            <form onSubmit={handleSubmit} className="space-y-3">
                <FormGrid className="sm:grid-cols-[1fr_9rem_auto] sm:items-end">
                    <Field label="Email address">
                        <TextInput type="email" placeholder="teammate@example.com" value={email} required onChange={(e) => { setEmail(e.target.value); setError(null) }} />
                    </Field>
                    <Field label="Role">
                        <Select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                        </Select>
                    </Field>
                    <Button type="submit" variant="primary" disabled={isPending || !email} className="h-9">
                        {isPending ? <Spinner size={13} /> : <Icon name="send" size={15} />}
                        {isPending ? 'Sending…' : 'Send invite'}
                    </Button>
                </FormGrid>
                {error && <Notice tone="error">{error}</Notice>}
                {success && <Notice>Invite sent.</Notice>}
            </form>
        </Panel>
    )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MembersPage({
    storeId,
    members: initialMembers,
    invites: initialInvites,
    currentRole,
}: Props) {
    const [members, setMembers] = useState<Member[]>(initialMembers)
    const [invites, setInvites] = useState<Invite[]>(initialInvites)
    // One clock per visit, so invite expiry is stable across re-renders.
    const [now] = useState(() => Date.now())

    return (
        <div className="space-y-6">
            <PageHeader title="Members" description="Who has access to this store and what they can do." />

            <InviteForm storeId={storeId} />

            <Panel title="Members" description={`${members.length} ${members.length === 1 ? 'person' : 'people'}`} flush>
                <ul className="divide-y divide-border">
                    {members.map((member) => (
                        <MemberItem
                            key={member.id}
                            member={member}
                            storeId={storeId}
                            currentRole={currentRole}
                            onRemove={(id) => setMembers((prev) => prev.filter((m) => m.id !== id))}
                        />
                    ))}
                </ul>
            </Panel>

            {invites.length > 0 && (
                <Panel title="Pending invites" description={`${invites.length} waiting to be accepted`} flush>
                    <ul className="divide-y divide-border">
                        {invites.map((invite) => (
                            <InviteItem
                                key={invite.id}
                                invite={invite}
                                storeId={storeId}
                                now={now}
                                onRevoke={(id) => setInvites((prev) => prev.filter((i) => i.id !== id))}
                            />
                        ))}
                    </ul>
                </Panel>
            )}
        </div>
    )
}
