'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import '@material/web/progress/circular-progress.js'

// ─── Material Web declarations ────────────────────────────────────────────────

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'md-circular-progress': React.HTMLAttributes<HTMLElement> & {
                indeterminate?: boolean
                value?: number
            }
        }
    }
}

// ─── SettingsSection ──────────────────────────────────────────────────────────

export function SettingsSection({
    title,
    description,
    aside,
    children,
    noPadding,
}: {
    title?: string
    description?: string
    aside?: React.ReactNode
    children: React.ReactNode
    noPadding?: boolean
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] overflow-hidden"
        >
            {(title || description) && (
                <div className="px-6 py-4 border-b border-[var(--md-sys-color-outline-variant)] flex items-start justify-between gap-4">
                    <div>
                        {title && (
                            <h3 className="text-[14px] font-semibold text-[var(--md-sys-color-on-surface)] leading-snug tracking-tight"
                                style={{ fontFamily: 'var(--font-lato), system-ui, sans-serif' }}>
                                {title}
                            </h3>
                        )}
                        {description && (
                            <p className="text-[12.5px] text-[var(--md-sys-color-on-surface-variant)] mt-1 leading-snug">
                                {description}
                            </p>
                        )}
                    </div>
                    {aside && <div className="shrink-0">{aside}</div>}
                </div>
            )}
            <div className={noPadding ? '' : 'px-6 py-6'}>
                {children}
            </div>
        </motion.section>
    )
}

// ─── SettingsField ────────────────────────────────────────────────────────────

export function SettingsField({
    label,
    hint,
    children,
}: {
    label: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-[0.06em]">
                {label}
            </label>
            {children}
            {hint && (
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-60 leading-snug">
                    {hint}
                </p>
            )}
        </div>
    )
}

// ─── SaveBar ──────────────────────────────────────────────────────────────────

export function SaveBar({
    onSave,
    saving,
}: {
    onSave: () => void
    saving: boolean
}) {
    return (
        <div className="sticky bottom-6 md:bottom-8 left-0 right-0 flex justify-center pointer-events-none z-40">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
                <button
                    onClick={onSave}
                    disabled={saving}
                    className={cn(
                        'pointer-events-auto inline-flex items-center gap-2 h-10 px-6',
                        'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                        'text-[13px] font-medium rounded-full shadow-lg',
                        'hover:opacity-90 hover:shadow-xl transition-all duration-150',
                        saving && 'opacity-60 cursor-not-allowed'
                    )}
                >
                    {saving ? (
                        <>
                            {/* @ts-ignore */}
                            <md-circular-progress
                                indeterminate
                                style={{
                                    '--md-circular-progress-size': '16px',
                                    '--md-circular-progress-active-indicator-color': 'var(--md-sys-color-on-primary)',
                                    '--md-circular-progress-active-indicator-width': '3',
                                }}
                            />
                            Saving…
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[16px]">save</span>
                            Save changes
                        </>
                    )}
                </button>
            </motion.div>
        </div>
    )
}

// ─── SaveToast ────────────────────────────────────────────────────────────────

export function SaveToast({ saving, saved }: { saving: boolean; saved: boolean }) {
    return (
        <AnimatePresence>
            {(saving || saved) && (
                <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="fixed bottom-6 right-6 z-50 pointer-events-none"
                >
                    <div className={cn(
                        'flex items-center gap-3 px-5 py-3 rounded-full text-[13px]',
                        'border border-[var(--md-sys-color-outline-variant)]',
                        'bg-[var(--md-sys-color-surface)]/95 backdrop-blur shadow-xl',
                    )}>
                        {saving ? (
                            <>
                                {/* @ts-ignore */}
                                <md-circular-progress
                                    indeterminate
                                    style={{
                                        '--md-circular-progress-size': '16px',
                                        '--md-circular-progress-active-indicator-color': 'var(--md-sys-color-on-surface-variant)',
                                        '--md-circular-progress-active-indicator-width': '3',
                                    }}
                                />
                                <span className="text-[var(--md-sys-color-on-surface-variant)] font-medium">
                                    Saving…
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--md-sys-color-primary-container)]">
                                    <span className="material-symbols-outlined text-[14px] text-[var(--md-sys-color-primary)]">
                                        check
                                    </span>
                                </div>
                                <span className="text-[var(--md-sys-color-on-surface)] font-medium">
                                    Changes saved
                                </span>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ─── ProGate ──────────────────────────────────────────────────────────────────

export function ProGate({ feature }: { feature: string }) {
    return (
        <SettingsSection>
            <div className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--md-sys-color-primary-container)]">
                    <span className="material-symbols-outlined text-[22px] text-[var(--md-sys-color-primary)]">
                        lock
                    </span>
                </div>
                <div className="space-y-1">
                    <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">
                        {feature} is on its way
                    </p>
                    <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] max-w-xs leading-relaxed">
                        This feature isn't available yet — check back soon.
                    </p>
                </div>
            </div>
        </SettingsSection>
    )
}