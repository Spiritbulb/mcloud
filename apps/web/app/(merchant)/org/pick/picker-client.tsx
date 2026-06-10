'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@mcloud/ui/utils'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@mcloud/ui/dialog'
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@mcloud/ui/dropdown-menu'
import { trackVisit, createOrg, moveStore, deleteStore, type PickerStore, type PickerOrg } from './actions'

// ─── MSO ──────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(iso?: string) {
    if (!iso) return null
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d === 1) return 'yesterday'
    if (d < 7) return `${d} days ago`
    return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

function mostRecent(stores: PickerStore[]) {
    return [...stores].sort((a, b) => {
        if (!a.last_visited_at) return 1
        if (!b.last_visited_at) return -1
        return new Date(b.last_visited_at).getTime() - new Date(a.last_visited_at).getTime()
    })[0]
}

function M3CircularIndicator({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" className="animate-spin"
            style={{ animationDuration: '1000ms', animationTimingFunction: 'linear' }}>
            <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray="47.1" strokeDashoffset="11.8"
                className="text-[var(--md-sys-color-primary)]" />
        </svg>
    )
}

// ─── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ name, logo_url, size, rounded }: { name: string; logo_url?: string; size: number; rounded: string }) {
    return (
        <div
            className={cn('shrink-0 flex items-center justify-center font-semibold overflow-hidden', rounded,
                !logo_url && 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]')}
            style={{ width: size, height: size, fontSize: size * 0.32 }}
        >
            {logo_url ? <img src={logo_url} alt={name} className="w-full h-full object-cover" /> : getInitials(name)}
        </div>
    )
}

// ─── Hero card ───────────────────────────────────────────────────────────────────

function HeroStoreCard({ store, picking, onPick }: {
    store: PickerStore; picking: string | null; onPick: (s: PickerStore) => void
}) {
    const isPicking = picking === store.slug
    const isDisabled = picking !== null && !isPicking
    const ago = timeAgo(store.last_visited_at)

    return (
        <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={() => !isDisabled && onPick(store)}
            disabled={isDisabled}
            className={cn(
                'group w-full text-left rounded-2xl border transition-all duration-200',
                'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)]/20',
                'p-5 flex items-center gap-4',
                !isDisabled && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
                isPicking && 'scale-[0.99]',
                isDisabled && 'opacity-40 cursor-not-allowed'
            )}
        >
            <Avatar name={store.name} logo_url={store.logo_url} size={48} rounded="rounded-xl" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[15px] font-semibold text-[var(--md-sys-color-on-primary-container)] truncate">{store.name}</p>
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)] shrink-0">
                        <MSO icon="history" className="text-[11px]" />
                        Last visited
                    </span>
                </div>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] truncate">
                    menengai.cloud/s/{store.slug}{ago && <span className="opacity-60"> · {ago}</span>}
                </p>
            </div>
            <div className={cn('shrink-0 transition-transform duration-150', !isDisabled && 'group-hover:translate-x-1')}>
                {isPicking ? <M3CircularIndicator /> : <MSO icon="arrow_forward" className="text-[20px] text-[var(--md-sys-color-primary)]" />}
            </div>
        </motion.button>
    )
}

// ─── Store card (compact, with manage menu) ──────────────────────────────────────

function StoreCard({ store, index, picking, orgs, onPick, onMove, onDelete }: {
    store: PickerStore
    index: number
    picking: string | null
    orgs: PickerOrg[]
    onPick: (s: PickerStore) => void
    onMove: (store: PickerStore, orgId: string | null) => void
    onDelete: (store: PickerStore) => void
}) {
    const isPicking = picking === store.slug
    const isDisabled = picking !== null && !isPicking
    const moveTargets = orgs.filter(o => o.canManage && o.id !== store.org_id)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.04 + index * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
                'group relative rounded-2xl border transition-all duration-200',
                'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline-variant)]',
                'flex items-center',
                !isDisabled && 'hover:shadow-sm hover:border-[var(--md-sys-color-primary)]/30',
                isPicking && 'scale-[0.99]',
                isDisabled && 'opacity-40'
            )}
        >
            <button
                onClick={() => !isDisabled && onPick(store)}
                disabled={isDisabled}
                className="flex-1 min-w-0 text-left p-4 flex items-center gap-3 cursor-pointer disabled:cursor-not-allowed"
            >
                <Avatar name={store.name} logo_url={store.logo_url} size={32} rounded="rounded-lg" />
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] truncate">{store.name}</p>
                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">menengai.cloud/s/{store.slug}</p>
                </div>
                {isPicking && <M3CircularIndicator size={18} />}
            </button>

            {store.canManage && !isPicking && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="shrink-0 mr-2 flex items-center justify-center w-7 h-7 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
                            aria-label="Store options"
                        >
                            <MSO icon="more_vert" className="text-[18px]" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] shadow-lg rounded-xl p-1">
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="rounded-lg text-[13px] gap-2">
                                <MSO icon="drive_file_move" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />
                                Move to
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-44 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] shadow-lg rounded-xl p-1">
                                {store.org_id && (
                                    <DropdownMenuItem className="rounded-lg text-[13px] gap-2" onSelect={() => onMove(store, null)}>
                                        <MSO icon="person" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />
                                        Personal
                                    </DropdownMenuItem>
                                )}
                                {moveTargets.map(o => (
                                    <DropdownMenuItem key={o.id} className="rounded-lg text-[13px] gap-2" onSelect={() => onMove(store, o.id)}>
                                        <MSO icon="domain" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />
                                        <span className="truncate">{o.name}</span>
                                    </DropdownMenuItem>
                                ))}
                                {!store.org_id && moveTargets.length === 0 && (
                                    <DropdownMenuItem disabled className="rounded-lg text-[13px] opacity-60">No organizations</DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator className="my-1 bg-[var(--md-sys-color-outline-variant)]" />
                        <DropdownMenuItem
                            className="rounded-lg text-[13px] gap-2 text-[var(--md-sys-color-error)] focus:text-[var(--md-sys-color-error)]"
                            onSelect={() => onDelete(store)}
                        >
                            <MSO icon="delete" className="text-[16px]" />
                            Delete store
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </motion.div>
    )
}

// ─── Add tile ────────────────────────────────────────────────────────────────────

function AddTile({ label, sub, icon = 'add', onClick }: { label: string; sub?: string; icon?: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-3 p-4 rounded-2xl text-left',
                'border border-dashed border-[var(--md-sys-color-outline-variant)]',
                'hover:border-[var(--md-sys-color-primary)]/40 hover:bg-[var(--md-sys-color-primary-container)]/20',
                'transition-all duration-150 group'
            )}
        >
            <div className="w-8 h-8 rounded-lg bg-[var(--md-sys-color-surface-variant)] flex items-center justify-center group-hover:bg-[var(--md-sys-color-primary-container)] transition-colors shrink-0">
                <MSO icon={icon} className="text-[18px] text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-primary)] transition-colors" />
            </div>
            <div>
                <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">{label}</p>
                {sub && <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{sub}</p>}
            </div>
        </button>
    )
}

// ─── Section ─────────────────────────────────────────────────────────────────────

function Section({ title, org, children }: { title: string; org?: PickerOrg; children: React.ReactNode }) {
    const router = useRouter()
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
                {org
                    ? <Avatar name={org.name} logo_url={org.logo_url} size={20} rounded="rounded-md" />
                    : <MSO icon="person" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />}
                <h2 className="text-[12px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)] truncate">{title}</h2>
                {org?.canManage && (
                    <button
                        onClick={() => router.push(`/org/${org.slug}/settings`)}
                        className="ml-auto flex items-center gap-0.5 text-[11px] font-medium text-[var(--md-sys-color-primary)] hover:underline shrink-0"
                    >
                        Manage <MSO icon="chevron_right" className="text-[14px]" />
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{children}</div>
        </div>
    )
}

// ─── Create-org dialog ───────────────────────────────────────────────────────────

function CreateOrgDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const router = useRouter()
    const [name, setName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [pending, start] = useTransition()

    const submit = () => {
        setError(null)
        start(async () => {
            const res = await createOrg(name)
            if (res.error) { setError(res.error); return }
            setName('')
            onOpenChange(false)
            router.refresh()
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New organization</DialogTitle>
                    <DialogDescription>Group your stores under one workspace. You can add stores after.</DialogDescription>
                </DialogHeader>
                <input
                    type="text" autoFocus placeholder="e.g. Acme Holdings"
                    value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim().length > 1 && submit()}
                    className="w-full h-11 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                />
                {error && <p className="text-[12px] text-[var(--md-sys-color-error)]">{error}</p>}
                <DialogFooter>
                    <button onClick={() => onOpenChange(false)} className="h-10 px-4 rounded-full text-[13px] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">Cancel</button>
                    <button
                        onClick={submit} disabled={pending || name.trim().length < 2}
                        className="flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-medium bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {pending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        Create
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Delete-store dialog ─────────────────────────────────────────────────────────

function DeleteStoreDialog({ store, onClose }: { store: PickerStore | null; onClose: () => void }) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [pending, start] = useTransition()

    const confirm = () => {
        if (!store) return
        setError(null)
        start(async () => {
            const res = await deleteStore(store.id)
            if (res.error) { setError(res.error); return }
            onClose()
            router.refresh()
        })
    }

    return (
        <Dialog open={!!store} onOpenChange={v => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete {store?.name}?</DialogTitle>
                    <DialogDescription>This permanently removes the store and its data. This can’t be undone.</DialogDescription>
                </DialogHeader>
                {error && <p className="text-[12px] text-[var(--md-sys-color-error)]">{error}</p>}
                <DialogFooter>
                    <button onClick={onClose} className="h-10 px-4 rounded-full text-[13px] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">Cancel</button>
                    <button
                        onClick={confirm} disabled={pending}
                        className="flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-medium bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                        {pending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        Delete
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Main ────────────────────────────────────────────────────────────────────────

export default function PickerClient({ stores, orgs, userName }: {
    stores: PickerStore[]
    orgs: PickerOrg[]
    userName: string | null
}) {
    const router = useRouter()
    const [picking, setPicking] = useState<string | null>(null)
    const [createOrgOpen, setCreateOrgOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<PickerStore | null>(null)
    const [, startMove] = useTransition()

    const hero = mostRecent(stores)

    const handlePick = async (store: PickerStore) => {
        setPicking(store.slug)
        await trackVisit(store.id)
        document.cookie = `mng_active_store=${store.slug}; path=/; max-age=2592000; SameSite=Lax`
        const orgSlug = orgs.find(o => o.id === store.org_id)?.slug
        if (orgSlug) {
            router.push(`/org/${orgSlug}/${store.slug}/settings`)
        } else {
            router.push(`/store/${store.slug}/settings`)
        }
    }

    const handleMove = (store: PickerStore, orgId: string | null) => {
        startMove(async () => {
            await moveStore(store.id, orgId)
            router.refresh()
        })
    }

    const personalStores = stores.filter(s => !s.org_id)
    // Show every org the user manages, plus orgs that own one of their stores
    const orgsToShow = orgs

    const greeting = getGreeting()
    const firstName = userName?.split(' ')[0]
    let cardIndex = 0

    return (
        <div className="min-h-[100dvh] flex flex-col items-center px-4 py-16 bg-[var(--md-sys-color-surface)]">
            <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26 }}
                className="w-full max-w-2xl space-y-6"
            >
                {/* Greeting */}
                <div className="mb-2">
                    <h1 className="text-[22px] font-semibold text-[var(--md-sys-color-on-surface)] tracking-tight">
                        {greeting}{firstName ? `, ${firstName}` : ''} 👋
                    </h1>
                    <p className="mt-1 text-[14px] text-[var(--md-sys-color-on-surface-variant)]">
                        Pick a store to manage, or jump into an organization.
                    </p>
                </div>

                {/* Hero — most recent store */}
                {hero && <HeroStoreCard store={hero} picking={picking} onPick={handlePick} />}

                {/* Org sections */}
                {orgsToShow.map(org => {
                    const orgStores = stores.filter(s => s.org_id === org.id)
                    return (
                        <Section key={org.id} title={org.name} org={org}>
                            {orgStores.map(store => (
                                <StoreCard
                                    key={store.id} store={store} index={cardIndex++} picking={picking}
                                    orgs={orgs} onPick={handlePick} onMove={handleMove} onDelete={setDeleteTarget}
                                />
                            ))}
                            {org.canManage && (
                                <AddTile label="Add store" sub="In this org" onClick={() => router.push(`/onboarding?org=${org.id}`)} />
                            )}
                        </Section>
                    )
                })}

                {/* Personal section */}
                {(personalStores.length > 0 || orgsToShow.length === 0) && (
                    <Section title="Personal">
                        {personalStores.map(store => (
                            <StoreCard
                                key={store.id} store={store} index={cardIndex++} picking={picking}
                                orgs={orgs} onPick={handlePick} onMove={handleMove} onDelete={setDeleteTarget}
                            />
                        ))}
                        <AddTile label="New shop" sub="Free forever" onClick={() => router.push('/onboarding')} />
                    </Section>
                )}

                {/* New organization */}
                <div className="pt-2">
                    <button
                        onClick={() => setCreateOrgOpen(true)}
                        className="flex items-center gap-2 text-[13px] font-medium text-[var(--md-sys-color-primary)] hover:underline"
                    >
                        <MSO icon="add_business" className="text-[18px]" />
                        New organization
                    </button>
                </div>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.5 }}
                className="mt-12 text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 text-center"
            >
                Menengai Cloud © {new Date().getFullYear()}
            </motion.p>

            <CreateOrgDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
            <DeleteStoreDialog store={deleteTarget} onClose={() => setDeleteTarget(null)} />
        </div>
    )
}
