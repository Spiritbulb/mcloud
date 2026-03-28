'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Loader2, CheckCircle2, AlertCircle, Trash2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionUser = {
    id: string
    name: string
    email: string
    avatar_url: string | null
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
    title,
    description,
    children,
}: {
    title: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 py-8 border-b border-border last:border-0">
            <div className="space-y-1">
                <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
                {description && (
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{description}</p>
                )}
            </div>
            <div className="space-y-4 max-w-lg">{children}</div>
        </div>
    )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
    label,
    htmlFor,
    hint,
    children,
}: {
    label: string
    htmlFor?: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <label
                htmlFor={htmlFor}
                className="block text-[12px] font-medium text-foreground/70 uppercase tracking-wider"
            >
                {label}
            </label>
            {children}
            {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
        </div>
    )
}

// ─── Input ────────────────────────────────────────────────────────────────────

function Input({
    id,
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled,
    suffix,
}: {
    id?: string
    type?: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    disabled?: boolean
    suffix?: React.ReactNode
}) {
    return (
        <div className="relative flex items-center">
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                    'w-full h-9 rounded-md border border-input bg-background px-3 text-[13px]',
                    'text-foreground placeholder:text-muted-foreground/50',
                    'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    suffix && 'pr-10',
                    'transition-colors'
                )}
            />
            {suffix && (
                <div className="absolute right-3 text-muted-foreground">{suffix}</div>
            )}
        </div>
    )
}

// ─── Feedback banner ──────────────────────────────────────────────────────────

function Feedback({ state }: { state: FeedbackState }) {
    if (!state) return null
    return (
        <div
            className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-[13px]',
                state.type === 'success'
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-destructive/10 text-destructive'
            )}
        >
            {state.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {state.message}
        </div>
    )
}

// ─── Save button ──────────────────────────────────────────────────────────────

function SaveButton({ loading, disabled }: { loading: boolean; disabled?: boolean }) {
    return (
        <button
            type="submit"
            disabled={loading || disabled}
            className={cn(
                'h-9 px-4 rounded-md text-[13px] font-medium transition-colors',
                'bg-[#425E7B] text-white hover:bg-[#425E7B]/85',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2'
            )}
        >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save changes
        </button>
    )
}

// ─── Avatar uploader ──────────────────────────────────────────────────────────

function AvatarUploader({
    user,
    onUpload,
}: {
    user: SessionUser
    onUpload: (url: string) => void
}) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState<string | null>(user.avatar_url)

    const handleFile = async (file: File) => {
        setUploading(true)
        const localUrl = URL.createObjectURL(file)
        setPreview(localUrl)

        try {
            const form = new FormData()
            form.append('file', file)
            const res = await fetch('/api/account/avatar', { method: 'POST', body: form })
            if (!res.ok) throw new Error()
            const { url } = await res.json()
            onUpload(url)
        } catch {
            setPreview(user.avatar_url)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex items-center gap-4">
            <div className="relative group">
                <Avatar className="w-16 h-16 rounded-full">
                    <AvatarImage src={preview ?? undefined} alt={user.name} />
                    <AvatarFallback className="bg-[#425E7B] text-white text-sm font-semibold rounded-full">
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
                <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                        'absolute inset-0 rounded-full flex items-center justify-center',
                        'bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity',
                        'text-white cursor-pointer disabled:cursor-not-allowed'
                    )}
                    aria-label="Change avatar"
                >
                    {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Camera className="w-4 h-4" />
                    )}
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFile(file)
                    }}
                />
            </div>
            <div className="space-y-0.5">
                <p className="text-[13px] font-medium text-foreground">{user.name}</p>
                <p className="text-[12px] text-muted-foreground">{user.email}</p>
                <button
                    onClick={() => fileRef.current?.click()}
                    className="text-[12px] text-[#425E7B] hover:underline underline-offset-2"
                >
                    Change photo
                </button>
            </div>
        </div>
    )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ user, onUpdate }: { user: SessionUser; onUpdate: (u: Partial<SessionUser>) => void }) {
    const [name, setName] = useState(user.name)
    const [email] = useState(user.email) // email changes require verification — read-only for now
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<FeedbackState>(null)

    const dirty = name.trim() !== user.name

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dirty) return
        setLoading(true)
        setFeedback(null)

        try {
            const res = await fetch('/api/account/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
            })
            if (!res.ok) throw new Error()
            onUpdate({ name: name.trim() })
            setFeedback({ type: 'success', message: 'Profile updated.' })
        } catch {
            setFeedback({ type: 'error', message: 'Failed to update profile. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Section
            title="Profile"
            description="Your name and email address are used across your account and visible to store collaborators."
        >
            <AvatarUploader user={user} onUpload={(url) => onUpdate({ avatar_url: url })} />

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <Field label="Full name" htmlFor="name">
                    <Input
                        id="name"
                        value={name}
                        onChange={setName}
                        placeholder="Your name"
                    />
                </Field>

                <Field
                    label="Email address"
                    htmlFor="email"
                    hint="To change your email address, contact support."
                >
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={() => { }}
                        disabled
                    />
                </Field>

                <Feedback state={feedback} />

                <SaveButton loading={loading} disabled={!dirty} />
            </form>
        </Section>
    )
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection() {
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<FeedbackState>(null)
    const [sent, setSent] = useState(false)

    const handleReset = async () => {
        setLoading(true)
        setFeedback(null)
        try {
            const res = await fetch('/api/account/password', { method: 'POST' })
            if (!res.ok) throw new Error()
            setSent(true)
            setFeedback({ type: 'success', message: 'Check your inbox — we sent you a password reset link.' })
        } catch {
            setFeedback({ type: 'error', message: 'Failed to send reset email. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Section
            title="Password"
            description="We'll send a reset link to your email address. The link expires after 24 hours."
        >
            <Feedback state={feedback} />
            <button
                onClick={handleReset}
                disabled={loading || sent}
                className={cn(
                    'h-9 px-4 rounded-md text-[13px] font-medium transition-colors flex items-center gap-2',
                    'bg-[#425E7B] text-white hover:bg-[#425E7B]/85',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
            >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {sent ? 'Reset email sent' : 'Send password reset email'}
            </button>
        </Section>
    )
}

// ─── Sessions section ─────────────────────────────────────────────────────────

type SessionEntry = {
    id: string
    device: string
    location: string
    lastActive: string
    current: boolean
}

function SessionsSection() {
    const [sessions, setSessions] = useState<SessionEntry[]>([
        { id: '1', device: 'Chrome on macOS', location: 'Nairobi, KE', lastActive: 'Now', current: true },
        { id: '2', device: 'Safari on iPhone', location: 'Nairobi, KE', lastActive: '2 hours ago', current: false },
        { id: '3', device: 'Firefox on Windows', location: 'Unknown', lastActive: '3 days ago', current: false },
    ])
    const [revoking, setRevoking] = useState<string | null>(null)

    const revoke = async (id: string) => {
        setRevoking(id)
        try {
            await fetch(`/api/account/sessions/${id}`, { method: 'DELETE' })
            setSessions((prev) => prev.filter((s) => s.id !== id))
        } finally {
            setRevoking(null)
        }
    }

    return (
        <Section
            title="Active sessions"
            description="Devices currently signed in to your account. Revoke any session you don't recognise."
        >
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                {sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-background">
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
                                            current
                                        </span>
                                    )}
                                </p>
                                <p className="text-[12px] text-muted-foreground">
                                    {s.location} · {s.lastActive}
                                </p>
                            </div>
                        </div>
                        {!s.current && (
                            <button
                                onClick={() => revoke(s.id)}
                                disabled={revoking === s.id}
                                className="ml-4 text-[12px] text-destructive hover:underline underline-offset-2 disabled:opacity-50 shrink-0"
                            >
                                {revoking === s.id ? 'Revoking…' : 'Revoke'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </Section>
    )
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerSection() {
    const [confirming, setConfirming] = useState(false)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (input !== 'delete my account') return
        setLoading(true)
        try {
            await fetch('/api/account', { method: 'DELETE' })
            window.location.href = '/auth/logout'
        } finally {
            setLoading(false)
        }
    }

    return (
        <Section
            title="Danger zone"
            description="Permanently delete your account and all associated data. This cannot be undone."
        >
            {!confirming ? (
                <button
                    onClick={() => setConfirming(true)}
                    className="h-9 px-4 rounded-md text-[13px] font-medium border border-destructive/40 text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-2"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete account
                </button>
            ) : (
                <div className="space-y-3 p-4 rounded-md border border-destructive/30 bg-destructive/5">
                    <p className="text-[13px] text-foreground">
                        This will permanently delete your account, all your stores, products, and orders.{' '}
                        <span className="font-semibold">There is no going back.</span>
                    </p>
                    <Field
                        label='Type "delete my account" to confirm'
                        htmlFor="delete-confirm"
                    >
                        <Input
                            id="delete-confirm"
                            value={input}
                            onChange={setInput}
                            placeholder="delete my account"
                        />
                    </Field>
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={handleDelete}
                            disabled={input !== 'delete my account' || loading}
                            className="h-9 px-4 rounded-md text-[13px] font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            I understand, delete my account
                        </button>
                        <button
                            onClick={() => { setConfirming(false); setInput('') }}
                            className="h-9 px-4 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </Section>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
    const [user, setUser] = useState<SessionUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/account')
            .then((r) => r.json())
            .then((data) => setUser(data))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
    )

    if (!user) return (
        <div className="py-20 text-center text-[13px] text-muted-foreground">
            Failed to load account details.
        </div>
    )

    return (
        <div className="max-w-3xl">
            {/* Page header */}
            <div className="pb-6 border-b border-border mb-0">
                <h1 className="text-[18px] font-semibold text-foreground tracking-tight">Account</h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                    Manage your personal details, password, and security settings.
                </p>
            </div>

            <ProfileSection
                user={user}
                onUpdate={(partial) => setUser((prev) => prev ? { ...prev, ...partial } : prev)}
            />
            <PasswordSection />
            <SessionsSection />
            <DangerSection />
        </div>
    )
}