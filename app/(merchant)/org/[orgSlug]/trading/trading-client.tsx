'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createTradingApp } from './actions'

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span
            className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
        >
            {icon}
        </span>
    )
}

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

type TradingApp = {
    id: string
    slug: string
    brand_name: string
    logo_url: string | null
    custom_domain: string | null
    primary_color: string | null
    is_active: boolean
    created_at: string | null
}

interface Props {
    orgId: string
    orgSlug: string
    apps: TradingApp[]
    role: string | null
}

// ─── Create dialog ─────────────────────────────────────────────────────────────

function CreateDialog({ orgId, orgSlug, onCreated, onClose }: {
    orgId: string
    orgSlug: string
    onCreated: (app: TradingApp) => void
    onClose: () => void
}) {
    const [brandName, setBrandName] = useState('')
    const [slug, setSlug] = useState('')
    const [derivAppId, setDerivAppId] = useState('')
    const [derivRedirectUri, setDerivRedirectUri] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, start] = useTransition()
    const router = useRouter()

    const handleBrandNameChange = (v: string) => {
        setBrandName(v)
        setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const fd = new FormData()
        fd.append('orgId', orgId)
        fd.append('brandName', brandName)
        fd.append('slug', slug)
        fd.append('derivAppId', derivAppId)
        fd.append('derivRedirectUri', derivRedirectUri)
        start(async () => {
            const res = await createTradingApp(fd)
            if (res.error) { setError(res.error); return }
            onCreated({ ...res.app!, is_active: res.app!.is_active ?? false })
            router.push(`/org/${orgSlug}/trading/${res.slug}`)
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] p-6 shadow-xl space-y-5 mx-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold text-[var(--md-sys-color-on-surface)]">Create trading app</h2>
                    <button onClick={onClose} className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]">
                        <MSO icon="close" className="text-[20px]" />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Brand name</label>
                        <input
                            autoFocus
                            value={brandName}
                            onChange={e => handleBrandNameChange(e.target.value)}
                            placeholder="Binary Matix"
                            required
                            className="w-full h-11 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Slug</label>
                        <input
                            value={slug}
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="binary-matix"
                            required
                            className="w-full h-11 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Deriv App ID</label>
                        <input
                            value={derivAppId}
                            onChange={e => setDerivAppId(e.target.value)}
                            placeholder="12345"
                            required
                            className="w-full h-11 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                        />
                        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Register at app.deriv.com</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Deriv redirect URI</label>
                        <input
                            value={derivRedirectUri}
                            onChange={e => setDerivRedirectUri(e.target.value)}
                            placeholder="https://yourdomain.com/callback"
                            required
                            type="url"
                            className="w-full h-11 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                        />
                    </div>

                    {error && <p className="text-[12px] text-[var(--md-sys-color-error)]">{error}</p>}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 h-10 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[13px] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !brandName || !slug || !derivAppId || !derivRedirectUri}
                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all"
                        >
                            {isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                            Create app
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── App card ──────────────────────────────────────────────────────────────────

function AppCard({ app, orgSlug }: { app: TradingApp; orgSlug: string }) {
    return (
        <div className="group flex items-center gap-4 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-4 py-4 hover:bg-[var(--md-sys-color-surface-variant)]/40 transition-colors">
            <div
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold overflow-hidden"
                style={{ background: app.primary_color ?? '#0051ff', color: '#fff' }}
            >
                {app.logo_url
                    ? <img src={app.logo_url} alt={app.brand_name} className="w-full h-full object-cover rounded-xl" />
                    : getInitials(app.brand_name)
                }
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{app.brand_name}</p>
                    {!app.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] font-medium">
                            inactive
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">
                    {app.custom_domain ?? `no domain — ${app.slug}`}
                </p>
            </div>
            <Link
                href={`/org/${orgSlug}/trading/${app.slug}`}
                className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] text-[var(--md-sys-color-on-surface-variant)] border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
            >
                <MSO icon="settings" className="text-[14px]" />
                Manage
            </Link>
        </div>
    )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function TradingClient({ orgId, orgSlug, apps: initial, role }: Props) {
    const [apps, setApps] = useState<TradingApp[]>(initial)
    const [createOpen, setCreateOpen] = useState(false)

    const canManage = role === 'owner' || role === 'admin'

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Trading Apps</h1>
                    <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                        {apps.length} {apps.length === 1 ? 'app' : 'apps'}
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 h-9 px-4 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-medium hover:opacity-90 transition-opacity"
                    >
                        <MSO icon="add" className="text-[16px]" />
                        New app
                    </button>
                )}
            </div>

            {apps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--md-sys-color-outline-variant)] p-12 text-center space-y-3">
                    <MSO icon="candlestick_chart" className="text-[40px] text-[var(--md-sys-color-on-surface-variant)] opacity-30" />
                    <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">No trading apps yet.</p>
                    {canManage && (
                        <button onClick={() => setCreateOpen(true)} className="text-[13px] text-[var(--md-sys-color-primary)] hover:underline">
                            Create your first trading app
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {apps.map(app => (
                        <AppCard key={app.id} app={app} orgSlug={orgSlug} />
                    ))}
                </div>
            )}

            {createOpen && (
                <CreateDialog
                    orgId={orgId}
                    orgSlug={orgSlug}
                    onCreated={(app) => setApps(prev => [app, ...prev])}
                    onClose={() => setCreateOpen(false)}
                />
            )}
        </div>
    )
}
