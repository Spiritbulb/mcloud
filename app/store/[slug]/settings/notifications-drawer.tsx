'use client'

// components/getting-started-drawer.tsx
// Fixed overlay drawer — lives outside the shell's flex layout intentionally.
// Triggered from SettingsHeader via onOpen prop passed down from SettingsShell.

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Circle, ChevronRight, Rocket, Sparkles } from 'lucide-react'
import type { TabId } from './settings-shell'

// ─── Step definitions ─────────────────────────────────────────────────────────

export type WizardStep = {
    id: string
    title: string
    description: string
    tab: TabId
    /** Given the store object, returns true if this step is done */
    isDone: (store: any) => boolean
}

export const WIZARD_STEPS: WizardStep[] = [
    {
        id: 'store-name',
        title: 'Name your store',
        description: 'Set your store name and upload a logo so customers recognise you.',
        tab: 'general',
        isDone: (s) => !!(s?.name?.trim()),
    },
    {
        id: 'appearance',
        title: 'Customise appearance',
        description: 'Choose a theme, set your brand colours and fonts.',
        tab: 'appearance',
        isDone: (s) => !!(s?.primary_color || s?.theme),
    },
    {
        id: 'first-product',
        title: 'Add your first product',
        description: 'Create a product listing with images, price and inventory.',
        tab: 'products',
        isDone: (s) => !!(s?.product_count && s.product_count > 0),
    },
    {
        id: 'payments',
        title: 'Set up payments',
        description: 'Connect M-Pesa, PayPal or another payment method.',
        tab: 'integrations',
        isDone: (s) => !!(s?.payments_enabled || s?.mpesa_enabled || s?.paypal_enabled),
    },
    {
        id: 'domain',
        title: 'Connect your domain',
        description: 'Replace your .menengai.cloud URL with your own branded domain.',
        tab: 'domain',
        isDone: (s) => !!(s?.custom_domain_verified),
    },
    {
        id: 'go-live',
        title: 'Go live',
        description: 'Toggle your store active so customers can start browsing.',
        tab: 'general',
        isDone: (s) => !!(s?.active),
    },
]

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ done, total }: { done: number; total: number }) {
    const r = 20
    const circ = 2 * Math.PI * r
    const offset = circ - (done / total) * circ
    return (
        <svg width="48" height="48" className="-rotate-90">
            <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor"
                className="text-border" strokeWidth="3" />
            <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor"
                className="text-[#425e7b] transition-all duration-700"
                strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round" />
        </svg>
    )
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function GettingStartedDrawer({
    open,
    onClose,
    store,
    onNavigate,
}: {
    open: boolean
    onClose: () => void
    store: any
    onNavigate: (tab: TabId) => void
}) {
    const steps = WIZARD_STEPS
    const doneCount = steps.filter(s => s.isDone(store)).length
    const allDone = doneCount === steps.length

    function handleStep(tab: TabId) {
        onClose()
        // Small delay so the drawer closes before navigation feels instant
        setTimeout(() => onNavigate(tab), 150)
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
                    />

                    {/* Drawer panel */}
                    <motion.div
                        key="drawer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#f8f9fa] dark:bg-[#1a1a1a] border-l border-border flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                        <ProgressRing done={doneCount} total={steps.length} />
                                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-foreground">
                                            {doneCount}/{steps.length}
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-foreground leading-tight">
                                            {allDone ? 'All done! 🎉' : 'Getting started'}
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {allDone
                                                ? 'Your store is fully set up.'
                                                : `${steps.length - doneCount} step${steps.length - doneCount !== 1 ? 's' : ''} remaining`
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4 h-1.5 rounded-full bg-border overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-[#425e7b]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                />
                            </div>
                        </div>

                        {/* Steps list */}
                        <div className="flex-1 overflow-y-auto py-3">
                            {steps.map((step, i) => {
                                const done = step.isDone(store)
                                return (
                                    <motion.button
                                        key={step.id}
                                        initial={{ opacity: 0, x: 16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05, duration: 0.25 }}
                                        onClick={() => handleStep(step.tab)}
                                        className={`w-full flex items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-secondary/50 group ${done ? 'opacity-60' : ''}`}
                                    >
                                        {/* Icon */}
                                        <div className="flex-shrink-0 mt-0.5">
                                            {done
                                                ? <CheckCircle2 className="w-5 h-5 text-[#425e7b]" />
                                                : <Circle className="w-5 h-5 text-border group-hover:text-muted-foreground transition-colors" />
                                            }
                                        </div>

                                        {/* Text */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                {step.title}
                                            </p>
                                            {!done && (
                                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                    {step.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Arrow */}
                                        {!done && (
                                            <ChevronRight className="flex-shrink-0 w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                                        )}
                                    </motion.button>
                                )
                            })}
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 px-6 py-4 border-t border-border">
                            {allDone ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Sparkles className="w-4 h-4 text-[#425e7b]" />
                                    Your store is live and ready to sell.
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Click any step to jump to that settings section.
                                </p>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// ─── Trigger button (used in SettingsHeader) ──────────────────────────────────

export function GettingStartedButton({
    store,
    onClick,
}: {
    store: any
    onClick: () => void
}) {
    const doneCount = WIZARD_STEPS.filter(s => s.isDone(store)).length
    const total = WIZARD_STEPS.length
    const allDone = doneCount === total

    if (allDone) return null // hide once everything is complete

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
            <Rocket className="w-3.5 h-3.5 text-[#425e7b]" />
            <span className="hidden sm:inline">Getting started</span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#425e7b] text-white text-[10px] font-bold">
                {total - doneCount}
            </span>
        </button>
    )
}