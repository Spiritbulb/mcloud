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
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className=""
        >
            {(title || description) && (
                <div className="px-6 py-4 border-b border-light flex items-start justify-between gap-4 rounded-full">
                    <div>
                        {title && (
                            <h3 className="text-[14px] font-montserrat font-bold text-foreground leading-snug tracking-tight">{title}</h3>
                        )}
                        {description && (
                            <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">{description}</p>
                        )}
                    </div>
                    {aside}
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
                        'pointer-events-auto inline-flex items-center gap-2 h-11 px-6 bg-primary text-primary-foreground text-[14px] font-medium rounded-full shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all',
                        saving && 'opacity-70 cursor-not-allowed'
                    )}
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Saving…' : 'Save changes'}
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
                    <div className="flex items-center gap-3 border border-border/50 bg-background/95 backdrop-blur shadow-xl rounded-full px-5 py-3 text-[14px]">
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                <span className="text-muted-foreground font-medium">Saving…</span>
                            </>
                        ) : (
                            <>
                                <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full">
                                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                </div>
                                <span className="text-foreground font-medium">Changes saved</span>
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