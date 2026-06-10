'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Loader2, ShieldCheck, Trash2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    updateDisplayName,
    updateAvatar,
    deleteAccount,
    getSessions
} from './actions'
import { useEffect } from 'react'

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

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({
    title,
    description,
    children,
    danger,
}: {
    title: string
    description?: string
    children: React.ReactNode
    danger?: boolean
}) {
    return (
        <div className={cn(
            'py-8 border-b border-border last:border-0',
            danger && 'border-destructive/20'
        )}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
                <div>
                    <h3 className={cn(
                        'text-sm font-semibold',
                        danger ? 'text-destructive' : 'text-foreground'
                    )}>
                        {title}
                    </h3>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
                <div>{children}</div>
            </div>
        </div>
    )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function useToast() {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const show = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }
    return { toast, show }
}

// ─── Avatar Section ────────────────────────────────────────────────────────────

function AvatarSection({ user, onUpdate }: { user: User; onUpdate: (url: string) => void }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(user.avatar_url)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Optimistic preview
        const objectUrl = URL.createObjectURL(file)
        setPreview(objectUrl)
        setError(null)

        const formData = new FormData()
        formData.append('avatar', file)

        startTransition(async () => {
            const result = await updateAvatar(formData)
            if (result.error) {
                setError(result.error)
                setPreview(user.avatar_url) // revert
            } else if (result.avatar_url) {
                onUpdate(result.avatar_url)
            }
        })
    }

    const initials = user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    return (
        <Section
            title="Profile photo"
            description="Your photo appears in your store dashboard and team views."
        >
            <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border border-border">
                        {preview ? (
                            <img
                                src={preview}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                                {initials}
                            </div>
                        )}
                    </div>
                    {/* Overlay on hover */}
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={isPending}
                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Change photo"
                    >
                        {isPending
                            ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                            : <Camera className="w-4 h-4 text-white" />
                        }
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFile}
                    />
                </div>

                <div className="space-y-1">
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={isPending}
                        className="text-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
                    >
                        {isPending ? 'Uploading…' : 'Change photo'}
                    </button>
                    <p className="text-xs text-muted-foreground">
                        JPG, PNG or WebP · max 2MB
                    </p>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
            </div>
        </Section>
    )
}

// ─── Name Section ──────────────────────────────────────────────────────────────

function NameSection({ user }: { user: User }) {
    const [name, setName] = useState(user.name)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const isDirty = name.trim() !== user.name

    const handleSave = () => {
        setError(null)
        const formData = new FormData()
        formData.append('name', name)
        startTransition(async () => {
            const result = await updateDisplayName(formData)
            if (result.error) {
                setError(result.error)
            } else {
                setSaved(true)
                setTimeout(() => setSaved(false), 2500)
            }
        })
    }

    return (
        <Section
            title="Display name"
            description="This is how you appear across your stores and to your team."
        >
            <div className="space-y-3 max-w-sm">
                <div className="grid gap-1.5">
                    <Label htmlFor="name" className="text-xs text-muted-foreground">
                        Full name
                    </Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setSaved(false) }}
                        onKeyDown={(e) => e.key === 'Enter' && isDirty && handleSave()}
                        className="h-9"
                    />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!isDirty || isPending}
                    className="rounded-lg"
                >
                    {isPending
                        ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Saving…</>
                        : saved ? '✓ Saved' : 'Save changes'
                    }
                </Button>
            </div>
        </Section>
    )
}

// ─── Email Section ─────────────────────────────────────────────────────────────

function EmailSection({ user }: { user: User }) {
    return (
        <Section
            title="Email address"
            description="Your email is managed by Auth0 and tied to your login method."
        >
            <div className="space-y-2 max-w-sm">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="h-9 px-3 flex items-center rounded-md border border-border bg-muted/40 text-sm text-muted-foreground select-all">
                        {user.email}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    To change your email, update it directly in your{' '}
                    <a
                        href="https://auth0.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                        Auth0 account
                    </a>
                    .
                </p>
            </div>
        </Section>
    )
}

// ─── Sessions Section ──────────────────────────────────────────────────────────

function SessionsSection() {
    const [sessions, setSessions] = useState<SessionEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getSessions()
            .then(({ sessions, error }) => {
                if (error) console.error('getSessions error:', error)
                setSessions(sessions ?? [])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return (
        <Section
            title="Recent login activity"
            description="Devices and locations that recently signed in to your account. If you see something you don't recognise, change your password."
        >
            {loading ? (
                <div className="space-y-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent login activity found.</p>
            ) : (
                <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                    {sessions.map((s) => (
                        <div
                            key={s.id}
                            className="flex items-center justify-between px-4 py-3 bg-background"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <ShieldCheck className={cn(
                                    'w-4 h-4 shrink-0',
                                    s.current ? 'text-green-500' : 'text-muted-foreground/40'
                                )} />
                                <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-foreground truncate">
                                        {s.device}
                                        {s.current && (
                                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                                                most recent
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-[12px] text-muted-foreground">
                                        {s.location} · {s.lastActive}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Section>
    )
}

// ─── Delete Section ────────────────────────────────────────────────────────────

function DeleteSection() {
    const [confirm, setConfirm] = useState('')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleDelete = () => {
        setError(null)
        startTransition(async () => {
            try {
                const result = await deleteAccount()
                if (result?.error) setError(result.error)
            } catch (e: any) {
                if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
                setError('Something went wrong. Please try again.')
            }
        })
    }

    return (
        <Section
            title="Delete account"
            description="Permanently deletes your account and all stores you own, including their products, orders, and customer data. This cannot be undone."
            danger
        >
            <div className="space-y-3 max-w-sm">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                        Type{' '}
                        <span className="font-semibold text-foreground">
                            delete my account
                        </span>{' '}
                        to confirm
                    </Label>
                    <Input
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="delete my account"
                        className="h-9"
                    />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={confirm !== 'delete my account' || isPending}
                    onClick={handleDelete}
                    className="rounded-lg gap-1.5"
                >
                    {isPending
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Deleting…</>
                        : <><Trash2 className="w-3 h-3" /> Delete my account</>
                    }
                </Button>
            </div>
        </Section>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AccountPage({ user }: { user: User }) {
    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url)

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-lg font-semibold text-foreground">Account</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage your profile, security, and account settings.
                </p>
            </div>

            {/* Sections */}
            <div>
                <AvatarSection
                    user={{ ...user, avatar_url: avatarUrl }}
                    onUpdate={setAvatarUrl}
                />
                <NameSection user={user} />
                <EmailSection user={user} />
                <SessionsSection />
                <DeleteSection />
            </div>
        </div>
    )
}