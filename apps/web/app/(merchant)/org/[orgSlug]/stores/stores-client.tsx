'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@mcloud/ui/utils'
import { createStore, deleteStore } from './actions'

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>
            {icon}
        </span>
    )
}

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

type Store = {
    id: string
    name: string
    slug: string
    logo_url: string | null
    is_pro: boolean
    created_at: string
}

interface Props {
    orgId: string
    orgSlug: string
    stores: Store[]
    role: string | null
}

// ─── Create store dialog ────────────────────────────────────────────────────────

function CreateStoreDialog({ orgId, orgSlug, onCreated, onClose }: {
    orgId: string
    orgSlug: string
    onCreated: (store: Store) => void
    onClose: () => void
}) {
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, start] = useTransition()
    const router = useRouter()

    const handleNameChange = (v: string) => {
        setName(v)
        setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const fd = new FormData()
        fd.append('orgId', orgId)
        fd.append('orgSlug', orgSlug)
        fd.append('name', name)
        fd.append('slug', slug)
        start(async () => {
            const res = await createStore(fd)
            if (res.error) { setError(res.error); return }
            router.push(`/org/${orgSlug}/${res.slug}/settings`)
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] p-6 shadow-xl space-y-5 mx-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold text-[var(--md-sys-color-on-surface)]">Create site</h2>
                    <button onClick={onClose} className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]">
                        <MSO icon="close" className="text-[20px]" />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Site name</label>
                        <input
                            autoFocus
                            value={name}
                            onChange={e => handleNameChange(e.target.value)}
                            placeholder="My Awesome Site"
                            required
                            className="w-full h-11 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/40 focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Slug</label>
                        <input
                            value={slug}
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="my-awesome-site"
                            required
                            className="w-full h-11 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/40 focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                        />
                        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">shop.mcloud.co.ke/{slug || '…'}</p>
                    </div>

                    {error && (
                        <p className="text-[12px] text-[var(--md-sys-color-error)]">{error}</p>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 h-10 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[13px] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !name || !slug}
                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all"
                        >
                            {isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                            Create store
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Delete confirmation ────────────────────────────────────────────────────────

function DeleteDialog({ store, orgSlug, onDeleted, onClose }: {
    store: Store
    orgSlug: string
    onDeleted: (id: string) => void
    onClose: () => void
}) {
    const [isPending, start] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const confirm = () => {
        start(async () => {
            const res = await deleteStore(store.id, orgSlug)
            if (res.error) { setError(res.error); return }
            onDeleted(store.id)
            onClose()
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] p-6 shadow-xl space-y-4 mx-4">
                <h2 className="text-[15px] font-semibold text-[var(--md-sys-color-on-surface)]">Delete {store.name}?</h2>
                <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">This will permanently delete the site and all its data. This cannot be undone.</p>
                {error && <p className="text-[12px] text-[var(--md-sys-color-error)]">{error}</p>}
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 h-10 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[13px] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={confirm}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all"
                    >
                        {isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Store card ─────────────────────────────────────────────────────────────────

function StoreCard({ store, orgSlug, canDelete, onDeleteClick }: {
    store: Store
    orgSlug: string
    canDelete: boolean
    onDeleteClick: () => void
}) {
    return (
        <div className="group relative flex items-center gap-4 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-4 py-4 hover:bg-[var(--md-sys-color-surface-variant)]/40 transition-colors">
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold overflow-hidden store-avatar-fallback">
                {store.logo_url
                    ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-xl" />
                    : getInitials(store.name)
                }
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{store.name}</p>
                    {store.is_pro && <MSO icon="workspace_premium" className="text-[14px] text-[var(--md-sys-color-primary)] shrink-0" fill={1} />}
                </div>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">shop.mcloud.co.ke/{store.slug}</p>
            </div>
            <div className="flex items-center gap-1">
                <Link
                    href={`/org/${orgSlug}/${store.slug}/settings`}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] text-[var(--md-sys-color-on-surface-variant)] border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                >
                    <MSO icon="settings" className="text-[14px]" />
                    Manage
                </Link>
                {canDelete && (
                    <button
                        onClick={onDeleteClick}
                        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error)]/10 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Delete site"
                    >
                        <MSO icon="delete" className="text-[16px]" />
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function StoresClient({ orgId, orgSlug, stores: initial, role }: Props) {
    const [stores, setStores] = useState<Store[]>(initial)
    const [createOpen, setCreateOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Store | null>(null)

    const canManage = role === 'owner' || role === 'admin'

    // Allow the org dashboard CTA to deep-link straight into the create flow (?new=1)
    const searchParams = useSearchParams()
    useEffect(() => {
        if (canManage && searchParams.get('new') === '1') setCreateOpen(true)
    }, [canManage, searchParams])

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Sites</h1>
                    <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">{stores.length} {stores.length === 1 ? 'site' : 'sites'}</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-2 h-9 px-4 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-medium hover:opacity-90 transition-opacity"
                    >
                        <MSO icon="add" className="text-[16px]" />
                        New store
                    </button>
                )}
            </div>

            {stores.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--md-sys-color-outline-variant)] p-12 text-center space-y-3">
                    <MSO icon="storefront" className="text-[40px] text-[var(--md-sys-color-on-surface-variant)] opacity-30" />
                    <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">No stores yet.</p>
                    {canManage && (
                        <button onClick={() => setCreateOpen(true)} className="text-[13px] text-[var(--md-sys-color-primary)] hover:underline">
                            Create your first store
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {stores.map(store => (
                        <StoreCard
                            key={store.id}
                            store={store}
                            orgSlug={orgSlug}
                            canDelete={role === 'owner'}
                            onDeleteClick={() => setDeleteTarget(store)}
                        />
                    ))}
                </div>
            )}

            {createOpen && (
                <CreateStoreDialog
                    orgId={orgId}
                    orgSlug={orgSlug}
                    onCreated={(s) => setStores(prev => [s, ...prev])}
                    onClose={() => setCreateOpen(false)}
                />
            )}

            {deleteTarget && (
                <DeleteDialog
                    store={deleteTarget}
                    orgSlug={orgSlug}
                    onDeleted={(id) => setStores(prev => prev.filter(s => s.id !== id))}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    )
}
