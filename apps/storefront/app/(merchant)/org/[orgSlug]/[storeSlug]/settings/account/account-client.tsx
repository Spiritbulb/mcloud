'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Badge } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { Field, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SkeletonLines, Spinner } from '@mcloud/ui/kit/skeleton'
import { initials } from '@mcloud/ui/kit/ui-logic'
import { deleteAccount, getSessions, updateAvatar, updateDisplayName } from './actions'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface User {
    id: string
    name: string
    email: string
    avatar_url: string | null
    role: string
    created_at: string | null | undefined
}

interface SessionEntry {
    id: string
    device: string
    location: string
    lastActive: string
    current: boolean
}

const DELETE_PHRASE = 'delete my account'

// ─── Photo ─────────────────────────────────────────────────────────────────────

function PhotoPanel({ user, onUpdate }: { user: User; onUpdate: (url: string) => void }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(user.avatar_url)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = '' // so choosing the same file again still fires
        if (!file) return
        if (file.size > 2 * 1024 * 1024) {
            setError('Image must be under 2MB')
            return
        }

        setPreview(URL.createObjectURL(file))
        setError(null)

        const formData = new FormData()
        formData.append('avatar', file)
        startTransition(async () => {
            const result = await updateAvatar(formData)
            if (result.error) {
                setError(result.error)
                setPreview(user.avatar_url)
            } else if (result.avatar_url) {
                onUpdate(result.avatar_url)
            }
        })
    }

    return (
        <Panel title="Profile photo" description="Shown in your dashboards and to your team.">
            <div className="flex items-center gap-4">
                <span className="store-avatar-fallback flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-[15px] font-bold">
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" className="h-full w-full object-cover" />
                    ) : (
                        initials(user.name)
                    )}
                </span>
                <div className="space-y-1.5">
                    <Button size="sm" onClick={() => inputRef.current?.click()} disabled={isPending}>
                        {isPending ? <Spinner size={12} /> : <Icon name="photo_camera" size={14} />}
                        {isPending ? 'Uploading…' : 'Change photo'}
                    </Button>
                    <p className="text-[12px] text-muted-foreground">JPG, PNG or WebP, up to 2MB.</p>
                    {error && <p role="alert" className="text-[12px] text-red-700 dark:text-red-300">{error}</p>}
                </div>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
            </div>
        </Panel>
    )
}

// ─── Profile ───────────────────────────────────────────────────────────────────

function ProfilePanel({ user }: { user: User }) {
    const [savedName, setSavedName] = useState(user.name)
    const [name, setName] = useState(user.name)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [justSaved, setJustSaved] = useState(false)
    const dirty = name.trim() !== savedName

    const handleSave = () => {
        setError(null)
        const formData = new FormData()
        formData.append('name', name)
        startTransition(async () => {
            const result = await updateDisplayName(formData)
            if (result.error) {
                setError(result.error)
                return
            }
            setSavedName(name.trim())
            setName(name.trim())
            setJustSaved(true)
            setTimeout(() => setJustSaved(false), 2500)
        })
    }

    return (
        <Panel
            title="Profile"
            description="How you appear across your stores and to your team."
            footer={
                <>
                    {justSaved && <span className="mr-auto text-[12px] text-muted-foreground">Saved</span>}
                    <Button variant="primary" onClick={handleSave} disabled={!dirty || isPending}>
                        {isPending && <Spinner size={13} />}
                        {isPending ? 'Saving…' : 'Save'}
                    </Button>
                </>
            }
        >
            <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                <Field label="Full name" error={error ?? undefined}>
                    <TextInput
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && dirty && !isPending && handleSave()}
                        invalid={!!error}
                        autoComplete="name"
                    />
                </Field>
                <Field label="Email" hint="Your sign-in email. To change it, contact support.">
                    <TextInput value={user.email} disabled readOnly />
                </Field>
            </div>
        </Panel>
    )
}

// ─── Sign-in activity ──────────────────────────────────────────────────────────

function ActivityPanel() {
    const [sessions, setSessions] = useState<SessionEntry[] | null>(null)
    const [failed, setFailed] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        getSessions()
            .then(({ sessions, error }) => {
                if (cancelled) return
                if (error) throw new Error(error)
                setSessions(sessions ?? [])
                setFailed(false)
            })
            .catch((e) => {
                console.error('getSessions error:', e)
                if (!cancelled) setFailed(true)
            })
        return () => {
            cancelled = true
        }
    }, [reloadKey])

    return (
        <Panel
            title="Recent sign-ins"
            description="Devices and places that signed in to your account recently. If one isn't you, sign out and contact support."
            flush
        >
            {failed ? (
                <LoadError
                    title="Couldn't load your sign-ins"
                    onRetry={() => {
                        setFailed(false)
                        setSessions(null)
                        setReloadKey((k) => k + 1)
                    }}
                />
            ) : !sessions ? (
                <div className="p-4"><SkeletonLines lines={2} /></div>
            ) : sessions.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-muted-foreground">No recent sign-ins found.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {sessions.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                            <Icon name="devices" size={16} className="shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2 truncate text-[13px] text-foreground">
                                    <span className="truncate">{s.device}</span>
                                    {s.current && <Badge tone="success">Most recent</Badge>}
                                </p>
                                <p className="text-[12px] text-muted-foreground">{s.location} · {s.lastActive}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}

// ─── Delete ────────────────────────────────────────────────────────────────────

function DeletePanel() {
    const [confirm, setConfirm] = useState('')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleDelete = () => {
        setError(null)
        startTransition(async () => {
            try {
                const result = await deleteAccount()
                if (result?.error) setError(result.error)
            } catch (e) {
                // A successful delete ends in a redirect, which Next throws; let it through.
                if (typeof e === 'object' && e && 'digest' in e && String(e.digest).startsWith('NEXT_REDIRECT')) throw e
                setError('Something went wrong. Please try again.')
            }
        })
    }

    return (
        <Panel
            title="Delete account"
            description="Permanently deletes your account and every store you own, with their products, orders and customers. This can't be undone."
            className="border-red-300/60 dark:border-red-500/30"
            footer={
                <Button variant="danger" disabled={confirm.trim().toLowerCase() !== DELETE_PHRASE || isPending} onClick={handleDelete}>
                    {isPending ? <Spinner size={13} /> : <Icon name="delete" size={14} />}
                    {isPending ? 'Deleting…' : 'Delete my account'}
                </Button>
            }
        >
            <Field
                label={<>Type <span className="font-semibold">{DELETE_PHRASE}</span> to confirm</>}
                error={error ?? undefined}
                className="max-w-sm"
            >
                <TextInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={DELETE_PHRASE} autoComplete="off" />
            </Field>
        </Panel>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AccountPage({ user }: { user: User }) {
    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url)

    return (
        <div className="space-y-6">
            <PageHeader title="Account" description="Your own profile and sign-in, across every store you work on." />
            <PhotoPanel user={{ ...user, avatar_url: avatarUrl }} onUpdate={setAvatarUrl} />
            <ProfilePanel user={user} />
            <ActivityPanel />
            <DeletePanel />
        </div>
    )
}
