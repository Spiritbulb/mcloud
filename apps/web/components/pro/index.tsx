// components/pro/index.tsx
'use client'

import { useState, useEffect } from 'react'
import { cn } from '@mcloud/ui/utils'
import { motion, AnimatePresence } from 'framer-motion'

// Where merchants go to get on Pro now: subscription happens in the mobile app,
// and the beta is the entry point. Absolute so it works from any merchant origin.
const BETA_URL = 'https://menengai.cloud/beta'

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

// ─── SubscribeCard ────────────────────────────────────────────────────────────
// Pure display. Explains that Pro is subscribed via the mobile app and points to
// the beta. No web payment.

const PRO_FEATURES = [
    'Custom domain (bring your own)',
    'Advanced analytics & funnel data',
    'Remove Menengai Cloud branding',
    'Priority support',
    'Blog & content pages',
] as const

export function SubscribeCard() {
    return (
        <div className={cn(
            'rounded-2xl overflow-hidden',
            'border border-[var(--md-sys-color-primary)]/20',
            'bg-[var(--md-sys-color-primary-container)]',
        )}>
            {/* Header */}
            <div className="px-6 pt-6 pb-3">
                <div className="flex items-center gap-2 mb-3">
                    <MSO icon="workspace_premium" className="text-[20px] text-[var(--md-sys-color-primary)]" fill={1} />
                    <p className="text-[15px] font-semibold text-[var(--md-sys-color-on-primary-container)]">
                        Menengai Cloud Pro
                    </p>
                </div>
                <p className="text-[12px] text-[var(--md-sys-color-primary)]/90 leading-relaxed">
                    Pro subscriptions are managed in the Menengai Cloud mobile app. Join the
                    beta to get the app and unlock Pro for your store.
                </p>
            </div>

            {/* Feature list */}
            <div className="px-6 pb-5 space-y-2 mt-1">
                {PRO_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                        <MSO icon="check" className="text-[15px] text-[var(--md-sys-color-primary)] shrink-0" />
                        <p className="text-[12px] text-[var(--md-sys-color-on-primary-container)]">{f}</p>
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 space-y-2">
                <a
                    href={BETA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        'w-full inline-flex items-center justify-center gap-2',
                        'font-semibold rounded-full transition-all duration-150',
                        'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                        'text-[14px] h-10 px-6',
                        'hover:opacity-90 active:scale-[0.98]',
                    )}
                >
                    <MSO icon="rocket_launch" className="text-[18px]" fill={1} />
                    Join the beta
                </a>
                <p className="text-[11px] text-center text-[var(--md-sys-color-primary)]/70">
                    Already in the beta? Subscribe from the app.
                </p>
            </div>
        </div>
    )
}

// ─── SubscribeModal ───────────────────────────────────────────────────────────
// Replaces the old UpgradeModal. Shows the SubscribeCard, no payment logic.

export function SubscribeModal({
    open,
    onClose,
}: {
    open: boolean
    onClose: () => void
}) {
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
                            <SubscribeCard />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// ─── UpgradeButton ────────────────────────────────────────────────────────────
// Opens the subscribe modal. (Name kept for existing call sites.)

export function UpgradeButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
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

            <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}

// ─── UpgradeChip ──────────────────────────────────────────────────────────────
// Compact header chip — opens subscribe modal.

export function UpgradeChip() {
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

            <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}

// ─── ProGate ─────────────────────────────────────────────────────────────────

export function ProGate({
    isPro, feature, description, children,
}: {
    isPro: boolean
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
                                {description ?? 'Subscribe to Menengai Cloud Pro in the mobile app to unlock this feature.'}
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
                            Get Pro
                        </button>
                    </div>
                </div>
            </div>

            <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}

// ─── ProGateInline ────────────────────────────────────────────────────────────

export function ProGateInline({
    isPro, feature, description, children,
}: {
    isPro: boolean
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
                        {description ?? 'This feature is available on Menengai Cloud Pro — subscribe in the mobile app.'}
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
                    Get Pro
                </button>
            </div>

            <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}

// ─── ProLockRow ───────────────────────────────────────────────────────────────

export function ProLockRow({
    isPro, label, children,
}: {
    isPro: boolean
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
                    Get Pro
                </button>
            </div>

            <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    )
}
