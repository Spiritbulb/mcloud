'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@mcloud/ui/utils'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@mcloud/ui/dialog'
import { updateOrg, deleteOrg } from '@/app/(merchant)/org/actions'

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>
            {icon}
        </span>
    )
}

interface Org {
    id: string
    name: string
    slug: string
    logo_url: string | null
}

const inputCls = cn(
    'w-full h-11 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30',
    'px-4 text-[14px] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/40',
    'focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all'
)

export default function OrgSettingsClient({ org, isOwner, storeCount }: {
    org: Org
    isOwner: boolean
    storeCount: number
}) {
    const router = useRouter()
    const [name, setName] = useState(org.name)
    const [slug, setSlug] = useState(org.slug)
    const [logoUrl, setLogoUrl] = useState(org.logo_url ?? '')
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [saving, startSave] = useTransition()
    const [deleteOpen, setDeleteOpen] = useState(false)

    const dirty = name !== org.name || slug !== org.slug || (logoUrl || '') !== (org.logo_url ?? '')

    const save = () => {
        setError(null); setSaved(false)
        startSave(async () => {
            const res = await updateOrg(org.id, { name, slug, logo_url: logoUrl.trim() || null })
            if (res.error) { setError(res.error); return }
            setSaved(true)
            if (res.slug && res.slug !== org.slug) {
                router.replace(`/org/${res.slug}/settings`)
            } else {
                router.refresh()
            }
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26 }}
            className="w-full max-w-xl space-y-8"
        >
                {/* General */}
                <section className="space-y-4 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-6">
                    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">General</h2>

                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Slug</label>
                        <input type="text" value={slug} onChange={e => setSlug(e.target.value)} className={inputCls} />
                        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Used in the organization URL.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">Logo URL</label>
                        <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" className={inputCls} />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-[12px] text-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)] px-3 py-2.5 rounded-xl">
                            <MSO icon="error" className="text-[14px] shrink-0" fill={1} />
                            {error}
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={save} disabled={!dirty || saving}
                            className="flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-medium bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {saving && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                            Save changes
                        </button>
                        {saved && !dirty && (
                            <span className="flex items-center gap-1 text-[12px] text-[var(--md-sys-color-primary)]">
                                <MSO icon="check_circle" className="text-[15px]" fill={1} /> Saved
                            </span>
                        )}
                    </div>
                </section>

                {/* Danger zone */}
                {isOwner && (
                    <section className="space-y-3 rounded-2xl border border-[var(--md-sys-color-error)]/30 bg-[var(--md-sys-color-error-container)]/20 p-6">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-error)]">Danger zone</h2>
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">Delete organization</p>
                                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                                    {storeCount > 0
                                        ? `Its ${storeCount} ${storeCount === 1 ? 'store' : 'stores'} will be moved to Personal.`
                                        : 'This organization has no stores.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setDeleteOpen(true)}
                                className="shrink-0 h-9 px-4 rounded-full text-[12px] font-medium border border-[var(--md-sys-color-error)]/40 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error)]/10 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </section>
                )}
            <DeleteOrgDialog open={deleteOpen} onOpenChange={setDeleteOpen} org={org} storeCount={storeCount} />
        </motion.div>
    )
}

function DeleteOrgDialog({ open, onOpenChange, org, storeCount }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    org: Org
    storeCount: number
}) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [pending, start] = useTransition()

    const confirm = () => {
        setError(null)
        start(async () => {
            const res = await deleteOrg(org.id)
            if (res.error) { setError(res.error); return }
            router.push('/org')
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete {org.name}?</DialogTitle>
                    <DialogDescription>
                        {storeCount > 0
                            ? `The ${storeCount} ${storeCount === 1 ? 'store' : 'stores'} in this organization will be moved to Personal. The organization itself will be permanently deleted.`
                            : "This organization will be permanently deleted. This can't be undone."}
                    </DialogDescription>
                </DialogHeader>
                {error && <p className="text-[12px] text-[var(--md-sys-color-error)]">{error}</p>}
                <DialogFooter>
                    <button onClick={() => onOpenChange(false)} className="h-10 px-4 rounded-full text-[13px] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">Cancel</button>
                    <button
                        onClick={confirm} disabled={pending}
                        className="flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-medium bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                        {pending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        Delete organization
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
