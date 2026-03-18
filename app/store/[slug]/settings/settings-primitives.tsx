'use client'

import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
        <section className="">
            {(title || description) && (
                <div className="px-6 py-4 border-b border-light flex items-start justify-between gap-4">
                    <div>
                        {title && (
                            <h3 className="text-[13px] font-semibold text-foreground leading-snug">{title}</h3>
                        )}
                        {description && (
                            <p className="text-[12px] text-on-surface-muted mt-0.5 leading-snug">{description}</p>
                        )}
                    </div>
                    {aside}
                </div>
            )}
            <div className={noPadding ? '' : 'px-6 py-5'}>
                {children}
            </div>
        </section>
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
            <label className="block text-[11px] font-semibold text-on-surface-muted uppercase tracking-[0.06em]">
                {label}
            </label>
            {children}
            {hint && (
                <p className="text-[11px] text-on-surface-muted/70 leading-snug">{hint}</p>
            )}
        </div>
    )
}

// ─── SaveBar — sticky bottom save button for each settings page ───────────────

export function SaveBar({
    onSave,
    saving,
}: {
    onSave: () => void
    saving: boolean
}) {
    return (
        <div className="sticky bottom-32 md:bottom-0 left-0 right-0 flex justify-end pt-4 pb-2 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
            <button
                onClick={onSave}
                disabled={saving}
                className={cn(
                    'btn-primary pointer-events-auto inline-flex items-center gap-1.5 h-9 px-5 text-[13px] font-medium !rounded-none',
                    saving && 'opacity-50 cursor-not-allowed'
                )}
            >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Saving…' : 'Save changes'}
            </button>
        </div>
    )
}

// ─── SaveToast ────────────────────────────────────────────────────────────────

export function SaveToast({ saving, saved }: { saving: boolean; saved: boolean }) {
    return (
        <AnimatePresence>
            {(saving || saved) && (
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="fixed bottom-6 right-6 z-50 pointer-events-none"
                >
                    <div className="flex items-center gap-2.5 border border-outline bg-surface shadow-lg px-4 py-2.5 text-[13px]">
                        {saving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-on-surface-muted" />
                                <span className="text-on-surface-muted">Saving…</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <span className="text-foreground font-medium">Saved</span>
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
            <div className="py-16 text-center space-y-4">
                <p className="text-[13px] text-on-surface-muted max-w-sm mx-auto leading-relaxed">
                    {feature} isn't available yet — check back soon.
                </p>
            </div>
        </SettingsSection>
    )
}