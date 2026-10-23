'use client'

import { useState, useTransition } from 'react'
import { Avatar } from '@mcloud/ui/kit/avatar'
import { Badge, type BadgeTone } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Field, FormGrid, Select, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import {
    inviteOrgMember,
    removeOrgMember,
    revokeOrgInvite,
    updateOrgMemberRole,
} from './actions'
import type { OrgMemberRow } from './actions'
import { canInvite, daysUntil, memberPermissions } from './members-logic'

type Invite = { id: string; email: string | null; role: string | null; created_at: string | null; expires_at: string | null }

interface Props {
    orgId: string
    orgSlug: string
    members: OrgMemberRow[]
    invites: Invite[]
    currentRole: string | null
}

const ROLE_TONE: Record<string, BadgeTone> = { owner: 'warning', admin: 'info', member: 'neutral' }

function RoleBadge({ role }: { role: string | null }) {
    if (!role) return null
    return <Badge tone={ROLE_TONE[role] ?? 'neutral'}>{role[0].toUpperCase() + role.slice(1)}</Badge>
}

function MemberRow({ member, orgId, orgSlug, currentRole, onRemove }: {
    member: OrgMemberRow
    orgId: string
    orgSlug: string
    currentRole: string | null
    onRemove: (id: string) => void
}) {
    const [isPending, start] = useTransition()
    const [roleChanging, startRole] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)
    const { canRemove, canChangeRole } = memberPermissions(currentRole, member.role)
    const name = member.users?.name ?? 'Unknown'

    const handleRemove = () => {
        start(async () => {
            const res = await removeOrgMember(member.id, orgId, orgSlug)
            if (res.error) { setError(res.error); setConfirming(false) }
            else onRemove(member.id)
        })
    }

    const handleRoleChange = (role: string) => {
        setError(null)
        startRole(async () => {
            const res = await updateOrgMemberRole(member.id, orgId, orgSlug, role)
            if (res.error) setError(res.error)
        })
    }

    return (
        <Tr>
            <Td>
                <div className="flex items-center gap-3">
                    <Avatar name={member.users?.name ?? null} src={member.users?.avatar_url} shape="circle" />
                    <div className="min-w-0">
                        <p className="truncate font-medium">{name}</p>
                        <p className="truncate text-[12px] text-muted-foreground">{member.users?.email ?? '—'}</p>
                        {error && <p role="alert" className="mt-0.5 text-[12px] text-red-700 dark:text-red-300">{error}</p>}
                    </div>
                </div>
            </Td>
            <Td label="Role">
                {canChangeRole ? (
                    <span className="inline-flex items-center gap-2">
                        <Select defaultValue={member.role ?? 'member'} disabled={roleChanging} aria-label={`Role for ${name}`} onChange={(e) => handleRoleChange(e.target.value)} className="h-8 w-28">
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                        </Select>
                        {roleChanging && <Spinner size={12} className="text-muted-foreground" />}
                    </span>
                ) : (
                    <RoleBadge role={member.role} />
                )}
            </Td>
            <Td align="right" label="Actions">
                {canRemove && (
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label={`Remove ${name}`}>
                        <Icon name="person_remove" size={15} />
                        <span className="max-md:hidden">Remove</span>
                    </Button>
                )}
                <ConfirmDialog
                    open={confirming}
                    title={`Remove ${name}?`}
                    description="They lose access to this organization and its stores straight away. You can invite them again later."
                    confirmLabel="Remove member"
                    busy={isPending}
                    onConfirm={handleRemove}
                    onCancel={() => setConfirming(false)}
                />
            </Td>
        </Tr>
    )
}

function InviteRow({ invite, orgId, orgSlug, now, onRevoke }: {
    invite: Invite
    orgId: string
    orgSlug: string
    now: number
    onRevoke: (id: string) => void
}) {
    const [isPending, start] = useTransition()
    const days = daysUntil(invite.expires_at, now)
    if (days === null || (!invite.email && !invite.role)) return null

    return (
        <Tr>
            <Td>
                <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon name="mail" size={14} className="text-muted-foreground" />
                    </span>
                    <span className="truncate">{invite.email}</span>
                </div>
            </Td>
            <Td label="Role"><RoleBadge role={invite.role} /></Td>
            <Td label="Expires" muted>{days === 0 ? 'Today' : `In ${days} ${days === 1 ? 'day' : 'days'}`}</Td>
            <Td align="right" label="Actions">
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => start(async () => { await revokeOrgInvite(invite.id, orgId, orgSlug); onRevoke(invite.id) })}
                >
                    {isPending ? 'Revoking…' : 'Revoke'}
                </Button>
            </Td>
        </Tr>
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
        <Panel title="Invite someone" description="Up to 10 invites per day. Invites expire after 7 days.">
            <form onSubmit={handleSubmit} className="space-y-3">
                <FormGrid className="sm:grid-cols-[1fr_9rem_auto] sm:items-end">
                    <Field label="Email address">
                        <TextInput type="email" placeholder="teammate@example.com" value={email} required onChange={(e) => { setEmail(e.target.value); setError(null) }} />
                    </Field>
                    <Field label="Role">
                        <Select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
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

export default function OrgMembersClient({ orgId, orgSlug, members: initial, invites: initialInvites, currentRole }: Props) {
    const [members, setMembers] = useState<OrgMemberRow[]>(initial)
    const [invites, setInvites] = useState<Invite[]>(initialInvites)
    // One clock per visit, so invite expiry is stable across re-renders.
    const [now] = useState(() => Date.now())

    return (
        <div className="space-y-6">
            <PageHeader title="Members" description="People who can manage this organization and its stores." />

            {canInvite(currentRole) && <InviteForm orgId={orgId} orgSlug={orgSlug} />}

            <Panel title="Members" description={`${members.length} ${members.length === 1 ? 'person' : 'people'}`} flush>
                {members.length === 0 ? (
                    <EmptyState icon="group" title="No members" />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Person</Th>
                                <Th>Role</Th>
                                <Th align="right"><span className="sr-only">Actions</span></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    member={member}
                                    orgId={orgId}
                                    orgSlug={orgSlug}
                                    currentRole={currentRole}
                                    onRemove={(id) => setMembers((prev) => prev.filter((m) => m.id !== id))}
                                />
                            ))}
                        </tbody>
                    </Table>
                )}
            </Panel>

            {invites.length > 0 && (
                <Panel title="Pending invites" description={`${invites.length} waiting to be accepted`} flush>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Email</Th>
                                <Th>Role</Th>
                                <Th>Expires</Th>
                                <Th align="right"><span className="sr-only">Actions</span></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {invites.map((invite) => (
                                <InviteRow
                                    key={invite.id}
                                    invite={invite}
                                    orgId={orgId}
                                    orgSlug={orgSlug}
                                    now={now}
                                    onRevoke={(id) => setInvites((prev) => prev.filter((i) => i.id !== id))}
                                />
                            ))}
                        </tbody>
                    </Table>
                </Panel>
            )}
        </div>
    )
}
