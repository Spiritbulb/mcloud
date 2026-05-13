'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { trackVisit } from './actions'

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingStore {
    id: string
    name: string
    slug: string
    last_visited_at?: string
    logo_url?: string
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

function sortByRecent(stores: ExistingStore[]) {
    return [...stores].sort((a, b) => {
        if (!a.last_visited_at) return 1
        if (!b.last_visited_at) return -1
        return new Date(b.last_visited_at).getTime() - new Date(a.last_visited_at).getTime()
    })
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

// ─── HeroStoreCard ─────────────────────────────────────────────────────────────

function HeroStoreCard({ store, picking, onPick }: {
    store: ExistingStore; picking: string | null; onPick: (store: ExistingStore) => void
}) {
    const isPicking = picking === store.slug
    const isDisabled = picking !== null && !isPicking
    const ago = timeAgo(store.last_visited_at)

    return (
        <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
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
            <div className={cn(
                'w-12 h-12 shrink-0 flex items-center justify-center rounded-xl font-semibold text-sm overflow-hidden',
                !store.logo_url && 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
            )}>
                {store.logo_url
                    ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                    : getInitials(store.name)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[15px] font-semibold text-[var(--md-sys-color-on-primary-container)] truncate">
                        {store.name}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)] shrink-0">
                        <MSO icon="history" className="text-[11px]" />
                        Last visited
                    </span>
                </div>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] truncate">
                    {store.slug}.menengai.cloud
                    {ago && <span className="opacity-60"> · {ago}</span>}
                </p>
            </div>
            <div className={cn('shrink-0 transition-transform duration-150', !isDisabled && 'group-hover:translate-x-1')}>
                {isPicking
                    ? <div className="w-4 h-4 border-2 border-[var(--md-sys-color-primary)] border-t-transparent rounded-full animate-spin" />
                    : <MSO icon="arrow_forward" className="text-[20px] text-[var(--md-sys-color-primary)]" />}
            </div>
        </motion.button>
    )
}

// ─── CompactStoreCard ──────────────────────────────────────────────────────────

function CompactStoreCard({ store, index, picking, onPick }: {
    store: ExistingStore; index: number; picking: string | null; onPick: (store: ExistingStore) => void
}) {
    const isPicking = picking === store.slug
    const isDisabled = picking !== null && !isPicking

    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.08 + index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={() => !isDisabled && onPick(store)}
            disabled={isDisabled}
            className={cn(
                'group text-left rounded-2xl border transition-all duration-200',
                'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline-variant)]',
                'p-4 flex items-center gap-3',
                !isDisabled && 'hover:shadow-sm hover:border-[var(--md-sys-color-primary)]/30 cursor-pointer',
                isPicking && 'scale-[0.99]',
                isDisabled && 'opacity-40 cursor-not-allowed'
            )}
        >
            <div className={cn(
                'w-8 h-8 shrink-0 flex items-center justify-center rounded-lg font-semibold text-xs overflow-hidden',
                !store.logo_url && 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
            )}>
                {store.logo_url
                    ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                    : getInitials(store.name)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] truncate">{store.name}</p>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">{store.slug}.menengai.cloud</p>
            </div>
            <div className={cn('shrink-0 transition-transform duration-150', !isDisabled && 'group-hover:translate-x-0.5')}>
                {isPicking
                    ? <div className="w-3.5 h-3.5 border-2 border-[var(--md-sys-color-primary)] border-t-transparent rounded-full animate-spin" />
                    : <MSO icon="arrow_forward" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />}
            </div>
        </motion.button>
    )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function PickerClient({
    stores,
    userName,
}: {
    stores: ExistingStore[]
    userName: string | null
}) {
    const router = useRouter()
    const sorted = sortByRecent(stores)
    const [picking, setPicking] = useState<string | null>(null)

    const handlePick = async (store: ExistingStore) => {
        setPicking(store.slug)
        await trackVisit(store.id)
        // Set active store cookie — shared across *.menengai.cloud
        document.cookie = `mng_active_store=${store.slug}; domain=.menengai.cloud; path=/; max-age=2592000; SameSite=Lax`
        router.push(`/store/${store.slug}/settings`)
    }

    const greeting = getGreeting()
    const firstName = userName?.split(' ')[0]

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-16 bg-[var(--md-sys-color-surface)]">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26 }}
                className="w-full max-w-2xl space-y-3"
            >
                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.02 }}
                    className="mb-6"
                >
                    <h1 className="text-[22px] font-semibold text-[var(--md-sys-color-on-surface)] tracking-tight">
                        {greeting}{firstName ? `, ${firstName}` : ''} 👋
                    </h1>
                    <p className="mt-1 text-[14px] text-[var(--md-sys-color-on-surface-variant)]">
                        {sorted.length === 1
                            ? 'Jump back into your store, or start a new one.'
                            : `You have ${sorted.length} stores. Pick one to continue.`}
                    </p>
                </motion.div>

                {/* Hero — most recent */}
                <HeroStoreCard store={sorted[0]} picking={picking} onPick={handlePick} />

                {/* Rest of stores + New shop */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {sorted.slice(1).map((store, i) => (
                        <CompactStoreCard
                            key={store.id}
                            store={store}
                            index={i}
                            picking={picking}
                            onPick={handlePick}
                        />
                    ))}

                    {/* New shop — links to onboarding */}
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.26, delay: 0.08 + (sorted.length - 1) * 0.05 }}
                        onClick={() => router.push('/onboarding')}
                        disabled={picking !== null}
                        className={cn(
                            'flex items-center gap-3 p-4 rounded-2xl text-left',
                            'border border-dashed border-[var(--md-sys-color-outline-variant)]',
                            'hover:border-[var(--md-sys-color-primary)]/40 hover:bg-[var(--md-sys-color-primary-container)]/20',
                            'transition-all duration-150 group',
                            picking !== null && 'opacity-40 cursor-not-allowed'
                        )}
                    >
                        <div className="w-8 h-8 rounded-lg bg-[var(--md-sys-color-surface-variant)] flex items-center justify-center group-hover:bg-[var(--md-sys-color-primary-container)] transition-colors shrink-0">
                            <MSO icon="add" className="text-[18px] text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-primary)] transition-colors" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">New shop</p>
                            <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Free forever</p>
                        </div>
                    </motion.button>
                </div>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="mt-12 text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 text-center"
            >
                Menengai Cloud © {new Date().getFullYear()}
            </motion.p>
        </div>
    )
}