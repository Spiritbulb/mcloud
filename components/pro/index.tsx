// components/pro/index.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ─── MSO ─────────────────────────────────────────────────────────────────────

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

export interface ProConfig {
    isPro: boolean
    slug: string
    onUpgradeSuccess?: () => void
}

// ─── useUpgrade ───────────────────────────────────────────────────────────────

export function useUpgrade(slug: string) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const upgrade = async (plan: 'hobby' | 'pro') => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/${slug}/subscribe`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Failed to start upgrade')
            window.location.href = data.url
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong')
            setLoading(false)
        }
    }

    return { upgrade, loading, error }
}

// ─── ProBadge ────────────────────────────────────────────────────────────────

export function ProBadge({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
    return (
        <span className={cn(
            'inline-flex items-center font-bold uppercase tracking-wider rounded-full',
            'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]',
            size === 'sm' && 'text-[9px] px-1.5 py-0.5',
            size === 'lg' && 'text-[11px] px-2 py-1 gap-1',
        )}>
            {size === 'lg' && <MSO icon="workspace_premium" className="text-[13px]" fill={1} />}
            Pro
        </span>
    )
}

// ─── ProUpgradeCard ───────────────────────────────────────────────────────────
// Pure display — no upgrade logic. Receives onUpgrade + loading + error from parent.

const PLANS = {
    hobby: {
        label: 'Hobby',
        price: 'KES 1,499',
        description: 'For small stores just getting started',
        features: [
            'Custom domain (bring your own)',
            'Basic analytics',
            'Unlimited products',
            'Email support',
        ],
    },
    pro: {
        label: 'Pro',
        price: 'KES 2,499',
        description: 'Everything you need to grow your store',
        features: [
            'Custom domain (bring your own)',
            'Advanced analytics & funnel data',
            'Remove Menengai Cloud branding',
            'Priority support',
            'Unlimited products',
            'Blog & content pages',
        ],
    },
} as const

type PlanKey = keyof typeof PLANS

export function ProUpgradeCard({
    onUpgrade,
    loading,
    error,
}: {
    onUpgrade: (plan: PlanKey) => void
    loading: boolean
    error: string | null
}) {
    const [selected, setSelected] = useState<PlanKey>('pro')
    const plan = PLANS[selected]

    return (
        <div className={cn(
            'rounded-2xl overflow-hidden',
            'border border-[var(--md-sys-color-primary)]/20',
            'bg-[var(--md-sys-color-primary-container)]',
        )}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-2 mb-4">
                    <MSO icon="workspace_premium" className="text-[20px] text-[var(--md-sys-color-primary)]" fill={1} />
                    <p className="text-[15px] font-semibold text-[var(--md-sys-color-on-primary-container)]">
                        Menengai Cloud Pro
                    </p>
                </div>

                {/* Plan toggle */}
                <div className="flex gap-2">
                    {(Object.keys(PLANS) as PlanKey[]).map(key => (
                        <button
                            key={key}
                            onClick={() => setSelected(key)}
                            className={cn(
                                'flex-1 flex flex-col items-start px-3 py-2.5 rounded-xl border transition-all duration-150',
                                selected === key
                                    ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/10'
                                    : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]/40 opacity-70',
                            )}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[13px] font-semibold text-[var(--md-sys-color-on-primary-container)]">
                                    {PLANS[key].label}
                                </span>
                                {selected === key && (
                                    <MSO icon="radio_button_checked" className="text-[14px] text-[var(--md-sys-color-primary)]" fill={1} />
                                )}
                            </div>
                            <span className="text-[12px] font-bold text-[var(--md-sys-color-primary)] tabular-nums">
                                {PLANS[key].price}
                                <span className="font-normal text-[10px] opacity-70">/mo</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Description */}
            <div className="px-6 pb-2">
                <p className="text-[12px] text-[var(--md-sys-color-primary)]/80">{plan.description}</p>
            </div>

            {/* Feature list */}
            <div className="px-6 pb-5 space-y-2 mt-2">
                {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                        <MSO icon="check" className="text-[15px] text-[var(--md-sys-color-primary)] shrink-0" />
                        <p className="text-[12px] text-[var(--md-sys-color-on-primary-container)]">{f}</p>
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 space-y-2">
                {error && (
                    <p className="text-[11px] text-[var(--md-sys-color-error)]">{error}</p>
                )}
                <button
                    onClick={() => onUpgrade(selected)}
                    disabled={loading}
                    className={cn(
                        'w-full inline-flex items-center justify-center gap-2',
                        'font-semibold rounded-full transition-all duration-150',
                        'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                        'text-[14px] h-10 px-6',
                        'hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                >
                    {loading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            Redirecting…
                        </>
                    ) : (
                        <>
                            <MSO icon="workspace_premium" className="text-[18px]" fill={1} />
                            Continue with {plan.label}
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

// ─── UpgradeModal ─────────────────────────────────────────────────────────────
// Owns the upgrade hook — passes it down to ProUpgradeCard.

export function UpgradeModal({
    slug,
    open,
    onClose,
}: {
    slug: string
    open: boolean
    onClose: () => void
}) {
    const { upgrade, loading, error } = useUpgrade(slug)

    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-[var(--md-sys-color-scrim)]/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                        className={cn(
                            'fixed z-50',
                            'bottom-0 left-0 right-0 rounded-t-2xl',
                            'md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
                            'md:w-full md:max-w-sm md:rounded-2xl',
                            'bg-[var(--md-sys-color-surface)] shadow-xl',
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drag handle — mobile only */}
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-8 h-1 rounded-full bg-[var(--md-sys-color-outline-variant)]" />
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 flex items-center justify-center w-7 h-7 rounded-full bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:opacity-80 transition-opacity"
                            aria-label="Close"
                        >
                            <MSO icon="close" className="text-[16px]" />
                        </button>

                        <div className="p-4">
                            <ProUpgradeCard
                                onUpgrade={upgrade}
                                loading={loading}
                                error={error}
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// ─── UpgradeButton ────────────────────────────────────────────────────────────
// Opens the modal. No upgrade logic here.

export function UpgradeButton({
    slug,
    size = 'md',
}: {
    slug: string
    size?: 'md' | 'lg'
}) {
    const [modalOpen, setModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setModalOpen(true)}
                className={cn(
                    'inline-flex items-center gap-2 font-semibold rounded-full transition-all duration-150',
                    'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                    'hover:opacity-90 active:scale-[0.98]',
                    size === 'md' && 'text-[13px] h-9 px-5',
                    size === 'lg' && 'text-[14px] h-10 px-6',
                )}
            >
                <MSO icon="workspace_premium" className={size === 'lg' ? 'text-[18px]' : 'text-[16px]'} fill={1} />
                Upgrade to Pro
            </button>

            <UpgradeModal
                slug={slug}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </>
    )
}

// ─── UpgradeChip ──────────────────────────────────────────────────────────────
// Compact header chip — opens modal.

export function UpgradeChip({ slug }: { slug: string }) {
    const [modalOpen, setModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setModalOpen(true)}
                className={cn(
                    'flex items-center gap-1.5 rounded-full transition-all duration-150',
                    'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]',
                    'hover:opacity-80 active:scale-[0.97]',
                    'w-8 h-8 justify-center',
                    'md:w-auto md:h-7 md:px-3',
                )}
                title="Upgrade to Pro"
            >
                <MSO icon="workspace_premium" className="text-[16px]" fill={1} />
                <span className="hidden md:inline text-[12px] font-semibold">Upgrade</span>
            </button>

            <UpgradeModal
                slug={slug}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </>
    )
}

// ─── ProGate ─────────────────────────────────────────────────────────────────

export function ProGate({
    isPro, slug, feature, description, children,
}: {
    isPro: boolean
    slug: string
    feature: string
    description?: string
    children: React.ReactNode
}) {
    const [modalOpen, setModalOpen] = useState(false)

    if (isPro) return <>{children}</>

    return (
        <>
            <div className="relative rounded-2xl overflow-hidden">
                <div className="pointer-events-none select-none blur-[3px] opacity-50 saturate-50">
                    {children}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--md-sys-color-surface)]/70 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-3 text-center px-6 py-6 max-w-xs">
                        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--md-sys-color-primary-container)]">
                            <MSO icon="workspace_premium" className="text-[22px] text-[var(--md-sys-color-primary)]" fill={1} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[14px] font-semibold text-[var(--md-sys-color-on-surface)]">
                                {feature} is a Pro feature
                            </p>
                            <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                                {description ?? 'Upgrade to Menengai Cloud Pro to unlock this feature.'}
                            </p>
                        </div>
                        <button
                            onClick={() => setModalOpen(true)}
                            className={cn(
                                'inline-flex items-center gap-2 font-semibold rounded-full',
                                'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                                'text-[13px] h-9 px-5 hover:opacity-90 active:scale-[0.98] transition-all',
                            )}
                        >
                            <MSO icon="workspace_premium" className="text-[16px]" fill={1} />
                            Upgrade to Pro
                        </button>
                    </div>
                </div>
            </div>

            <UpgradeModal slug={slug} open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}

// ─── ProGateInline ────────────────────────────────────────────────────────────

export function ProGateInline({
    isPro, slug, feature, description, children,
}: {
    isPro: boolean
    slug: string
    feature: string
    description?: string
    children?: React.ReactNode
}) {
    const [modalOpen, setModalOpen] = useState(false)

    if (isPro) return <>{children}</>

    return (
        <>
            <div className={cn(
                'flex flex-col items-center gap-4 text-center',
                'rounded-2xl border border-[var(--md-sys-color-outline-variant)]',
                'bg-[var(--md-sys-color-surface-container-low)] px-6 py-10',
            )}>
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--md-sys-color-primary-container)]">
                    <MSO icon="workspace_premium" className="text-[24px] text-[var(--md-sys-color-primary)]" fill={1} />
                </div>
                <div className="space-y-1.5 max-w-xs">
                    <p className="text-[15px] font-semibold text-[var(--md-sys-color-on-surface)]">{feature}</p>
                    <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                        {description ?? 'This feature is available on Menengai Cloud Pro.'}
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className={cn(
                        'inline-flex items-center gap-2 font-semibold rounded-full',
                        'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                        'text-[14px] h-10 px-6 hover:opacity-90 active:scale-[0.98] transition-all',
                    )}
                >
                    <MSO icon="workspace_premium" className="text-[18px]" fill={1} />
                    Upgrade to Pro
                </button>
            </div>

            <UpgradeModal slug={slug} open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}

// ─── ProLockRow ───────────────────────────────────────────────────────────────

export function ProLockRow({
    isPro, slug, label, children,
}: {
    isPro: boolean
    slug: string
    label: string
    children?: React.ReactNode
}) {
    const [modalOpen, setModalOpen] = useState(false)

    if (isPro) return <>{children}</>

    return (
        <>
            <div className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'border border-[var(--md-sys-color-outline-variant)]',
                'bg-[var(--md-sys-color-surface-container-low)]',
            )}>
                <MSO icon="lock" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)] shrink-0" />
                <p className="flex-1 text-[13px] text-[var(--md-sys-color-on-surface-variant)] truncate">{label}</p>
                <button
                    onClick={() => setModalOpen(true)}
                    className={cn(
                        'shrink-0 flex items-center gap-1 text-[11px] font-semibold',
                        'px-2.5 py-1 rounded-full',
                        'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]',
                        'hover:opacity-80 transition-opacity',
                    )}
                >
                    <MSO icon="workspace_premium" className="text-[12px]" fill={1} />
                    Upgrade
                </button>
            </div>

            <UpgradeModal slug={slug} open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}