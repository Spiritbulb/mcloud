'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@mcloud/db/client'
import type { Tables } from '@mcloud/db/types'
import { Switch } from '@mcloud/ui/switch'
import { cn } from '@mcloud/ui/utils'
import { motion, AnimatePresence } from 'framer-motion'

type Store = Tables<'stores'>

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

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
    { value: 'KES', label: 'KES — Kenyan Shilling', flag: '🇰🇪' },
    { value: 'USD', label: 'USD — US Dollar', flag: '🇺🇸' },
    { value: 'EUR', label: 'EUR — Euro', flag: '🇪🇺' },
    { value: 'GBP', label: 'GBP — British Pound', flag: '🇬🇧' },
    { value: 'UGX', label: 'UGX — Ugandan Shilling', flag: '🇺🇬' },
    { value: 'TZS', label: 'TZS — Tanzanian Shilling', flag: '🇹🇿' },
    { value: 'NGN', label: 'NGN — Nigerian Naira', flag: '🇳🇬' },
    { value: 'GHS', label: 'GHS — Ghanaian Cedi', flag: '🇬🇭' },
    { value: 'ZAR', label: 'ZAR — South African Rand', flag: '🇿🇦' },
]

const TIMEZONES = [
    { value: 'EAT', label: 'Nairobi (EAT, UTC+3)' },
    { value: 'WAT', label: 'Lagos (WAT, UTC+1)' },
    { value: 'GMT', label: 'Accra (GMT, UTC+0)' },
    { value: 'SAST', label: 'Johannesburg (SAST, UTC+2)' },
    { value: 'EET', label: 'Cairo (EET, UTC+2)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'BST', label: 'London (GMT/BST)' },
    { value: 'CET', label: 'Paris (CET, UTC+1)' },
    { value: 'ET', label: 'New York (ET)' },
    { value: 'PT', label: 'Los Angeles (PT)' },
    { value: 'GST', label: 'Dubai (GST, UTC+4)' },
]

// ─── Field primitives ─────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
            {children}
        </label>
    )
}

const inputCls = cn(
    'w-full h-10 px-3 rounded-xl border border-[var(--md-sys-color-outline-variant)]',
    'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)]',
    'text-base sm:text-[13px] outline-none transition-all duration-150',
    'focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15',
    'disabled:bg-[var(--md-sys-color-surface-variant)] disabled:text-[var(--md-sys-color-on-surface-variant)] disabled:cursor-not-allowed',
    'placeholder:text-[var(--md-sys-color-on-surface-variant)]/40',
)

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn(inputCls, props.className)} />
}

// Plain select — used for timezone (and anything non-geographic)
function FieldSelect({ value, onChange, className, children }: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    className?: string
    children: React.ReactNode
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                className={cn(inputCls, 'appearance-none cursor-pointer pr-9', className)}
            >
                {children}
            </select>
            <MSO
                icon="expand_more"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--md-sys-color-on-surface-variant)] pointer-events-none"
            />
        </div>
    )
}

// Flag select — used for currency
const FLAG_OVERRIDES: Record<string, string> = {
    EUR: 'eu',
    GBP: 'gb',
}

function CurrencySelect({ value, onChange, children }: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    children: React.ReactNode
}) {
    const countryCode = FLAG_OVERRIDES[value] ?? value.slice(0, 2).toLowerCase()

    return (
        <div className="relative">
            <img
                src={`https://flagcdn.com/24x18/${countryCode}.png`}
                alt=""
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-auto rounded-[2px] pointer-events-none"
            />
            <select
                value={value}
                onChange={onChange}
                className={cn(inputCls, 'appearance-none cursor-pointer pl-10 pr-9')}
            >
                {children}
            </select>
            <MSO
                icon="expand_more"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--md-sys-color-on-surface-variant)] pointer-events-none"
            />
        </div>
    )
}

function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={cn(
                'w-full px-3 py-2.5 rounded-xl border border-[var(--md-sys-color-outline-variant)]',
                'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)]',
                'text-base sm:text-[13px] leading-relaxed outline-none resize-y',
                'transition-all duration-150',
                'focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15',
                'placeholder:text-[var(--md-sys-color-on-surface-variant)]/40',
                props.className,
            )}
        />
    )
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, description, children }: {
    title: string
    description: string
    children: React.ReactNode
}) {
    return (
        <section className="space-y-4">
            <div>
                <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">{title}</p>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">{description}</p>
            </div>
            {children}
        </section>
    )
}

// ─── Save bar ─────────────────────────────────────────────────────────────────
// Only visible when there are unsaved changes (isDirty=true) or after a save attempt.

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function SaveBar({
    isDirty,
    saveState,
    onSave,
}: {
    isDirty: boolean
    saveState: SaveState
    onSave: () => void
}) {
    const visible = isDirty || saveState === 'saving' || saveState === 'saved' || saveState === 'error'

    const hint = {
        idle: 'You have unsaved changes',
        saving: 'Saving…',
        saved: 'All changes saved',
        error: 'Something went wrong',
    }[saveState]

    const label = {
        idle: 'Save changes',
        saving: 'Saving…',
        saved: 'Saved',
        error: 'Try again',
    }[saveState]

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                    className={cn(
                        'sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 z-10',
                        'border-t border-[var(--md-sys-color-outline-variant)]',
                        'bg-[var(--md-sys-color-surface)]/90 backdrop-blur-sm',
                        'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between',
                    )}
                >
                    <span className={cn(
                        'text-[12px] flex items-center gap-1.5 text-center sm:text-left transition-colors duration-200',
                        saveState === 'saved' && 'text-[var(--md-sys-color-primary)]',
                        saveState === 'error' && 'text-[var(--md-sys-color-error)]',
                        (saveState === 'idle' || saveState === 'saving') && 'text-[var(--md-sys-color-on-surface-variant)]',
                    )}>
                        {saveState === 'saved' && <MSO icon="check_circle" className="text-[14px]" fill={1} />}
                        {saveState === 'error' && <MSO icon="error" className="text-[14px]" fill={1} />}
                        {hint}
                    </span>

                    <button
                        onClick={onSave}
                        disabled={saveState === 'saving' || saveState === 'saved'}
                        className={cn(
                            'w-full sm:w-auto h-10 sm:h-9 px-5 rounded-full',
                            'text-[13px] font-semibold transition-all duration-150',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            saveState === 'error'
                                ? 'bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]'
                                : saveState === 'saved'
                                    ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]'
                                    : 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 active:scale-[0.98]',
                        )}
                    >
                        {saveState === 'saving' ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                Saving…
                            </span>
                        ) : label}
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GeneralSettingsPage({ store }: { store: Store }) {
    const [name, setName] = useState(store.name)
    const [description, setDescription] = useState(store.description ?? '')
    const [currency, setCurrency] = useState(store.currency)
    const [timezone, setTimezone] = useState(store.timezone ?? 'Africa/Nairobi')
    const [isActive, setIsActive] = useState<boolean>(store.is_active ?? false)
    const [saveState, setSaveState] = useState<SaveState>('idle')

    // Dirty check — compare current state against original store values
    const isDirty = useMemo(() => (
        name !== store.name ||
        description !== (store.description ?? '') ||
        currency !== store.currency ||
        timezone !== (store.timezone ?? 'Africa/Nairobi') ||
        isActive !== (store.is_active ?? false)
    ), [name, description, currency, timezone, isActive, store])

    const handleSave = async () => {
        if (!isDirty && saveState === 'idle') return
        setSaveState('saving')
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('stores')
                .update({ name, description: description || null, currency, timezone, is_active: isActive })
                .eq('id', store.id)
            if (error) throw error
            setSaveState('saved')
            setTimeout(() => setSaveState('idle'), 2500)
        } catch {
            setSaveState('error')
            setTimeout(() => setSaveState('idle'), 3000)
        }
    }

    return (
        <div className="w-full max-w-2xl space-y-8 mx-auto">

            {/* ── Identity ─────────────────────────────────────────────────── */}
            <Section title="Store identity" description="Basic information shown to your customers">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <FieldLabel>Store name</FieldLabel>
                        <FieldInput
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My Store"
                        />
                    </div>
                    <div>
                        <FieldLabel>Store URL</FieldLabel>
                        <div className="relative">
                            <FieldInput value={`menengai.cloud/s/${store.slug}`} disabled />
                            <MSO icon="lock" className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-[var(--md-sys-color-on-surface-variant)]/40" />
                        </div>
                    </div>
                </div>
                <div>
                    <FieldLabel>Description</FieldLabel>
                    <FieldTextarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Tell customers what you sell…"
                        rows={3}
                    />
                </div>
            </Section>

            <div className="h-px bg-[var(--md-sys-color-outline-variant)]" />

            {/* ── Locale ───────────────────────────────────────────────────── */}
            <Section title="Locale" description="Currency and timezone for your storefront and reports">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <FieldLabel>Currency</FieldLabel>
                        <CurrencySelect value={currency} onChange={e => setCurrency(e.target.value)}>
                            {CURRENCIES.map(c => (
                                <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
                            ))}
                        </CurrencySelect>
                    </div>
                    <div>
                        <FieldLabel>Timezone</FieldLabel>
                        <FieldSelect value={timezone} onChange={e => setTimezone(e.target.value)}>
                            {TIMEZONES.map(tz => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </FieldSelect>
                    </div>
                </div>
            </Section>

            <div className="h-px bg-[var(--md-sys-color-outline-variant)]" />

            {/* ── Visibility ───────────────────────────────────────────────── */}
            <Section title="Visibility" description="Control whether your store is open for business">
                <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)]">
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">Store active</p>
                        <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-snug">
                            When off, visitors see a coming soon page
                        </p>
                    </div>
                    <Switch
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        className="shrink-0"
                    />
                </div>

                <div className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium',
                    isActive
                        ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]'
                        : 'bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)]'
                )}>
                    <span className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isActive
                            ? 'bg-[var(--md-sys-color-primary)] animate-pulse'
                            : 'bg-[var(--md-sys-color-on-surface-variant)]/40'
                    )} />
                    {isActive ? (
                        <>
                            Live at{' '}
                            <a
                                href={`/s/${store.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                            >
                                menengai.cloud/s/{store.slug}
                            </a>
                            <MSO icon="open_in_new" className="text-[13px] opacity-60" />
                        </>
                    ) : (
                        'Store is hidden — showing coming soon page'
                    )}
                </div>
            </Section>

            <SaveBar isDirty={isDirty} saveState={saveState} onSave={handleSave} />
        </div>
    )
}