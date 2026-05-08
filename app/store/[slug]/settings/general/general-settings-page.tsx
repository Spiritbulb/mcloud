'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import type { Tables } from '@/app/types/database.types'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

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
]

const TIMEZONES = [
    { value: 'Africa/Nairobi', label: 'Nairobi (EAT, UTC+3)' },
    { value: 'Africa/Lagos', label: 'Lagos (WAT, UTC+1)' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST, UTC+2)' },
    { value: 'Africa/Cairo', label: 'Cairo (EET, UTC+2)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'America/New_York', label: 'New York (ET)' },
]

// ─── Field primitives ─────────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted mb-2">
            {children}
            {hint && (
                <span className="ml-2 normal-case tracking-normal font-normal opacity-60 text-[11px]">
                    {hint}
                </span>
            )}
        </label>
    )
}

const inputCls = cn(
    'w-full h-10 px-3 rounded-lg border border-light bg-background text-foreground',
    'text-[13px] outline-none transition-all duration-150',
    'focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10',
    'disabled:bg-surface disabled:text-on-surface-muted disabled:cursor-not-allowed',
    'placeholder:text-on-surface-muted/40',
    // Prevent iOS zoom
    'text-base sm:text-[13px]',
)

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn(inputCls, props.className)} />
}

function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative">
            <select
                {...props}
                className={cn(
                    inputCls,
                    'appearance-none cursor-pointer pl-3 pr-9',
                    'text-base sm:text-[13px]',
                    props.className,
                )}
            />
            <MSO
                icon="expand_more"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-muted pointer-events-none"
            />
        </div>
    )
}

function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={cn(
                'w-full px-3 py-2.5 rounded-lg border border-light bg-background text-foreground',
                'text-base sm:text-[13px] leading-relaxed outline-none resize-y',
                'transition-all duration-150',
                'focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10',
                'placeholder:text-on-surface-muted/40',
                props.className,
            )}
        />
    )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, children }: {
    title: string
    description: string
    children: React.ReactNode
}) {
    return (
        <section className="space-y-4">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted">
                    {title}
                </p>
                <p className="text-[12px] text-on-surface-muted/70 mt-0.5">{description}</p>
            </div>
            {children}
        </section>
    )
}

// ─── Save bar ─────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function SaveBar({ saveState, onSave }: { saveState: SaveState; onSave: () => void }) {
    const label = { idle: 'Save changes', saving: 'Saving…', saved: 'Saved', error: 'Try again' }[saveState]
    const hint = { idle: 'You have unsaved changes', saving: 'Saving…', saved: 'All changes saved', error: 'Something went wrong' }[saveState]
    const isError = saveState === 'error'
    const isSaved = saveState === 'saved'

    return (
        <div className={cn(
            'sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 z-10',
            'border-t border-light bg-background/90 backdrop-blur-sm',
            'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between',
        )}>
            <span className={cn(
                'text-[12px] transition-colors duration-300 text-center sm:text-left flex items-center gap-1.5',
                isSaved ? 'text-emerald-600' : isError ? 'text-red-500' : 'text-on-surface-muted'
            )}>
                {isSaved && <MSO icon="check_circle" className="text-[14px]" fill={1} />}
                {isError && <MSO icon="error" className="text-[14px]" fill={1} />}
                {hint}
            </span>

            <button
                onClick={onSave}
                disabled={saveState === 'saving' || saveState === 'saved'}
                className={cn(
                    'w-full sm:w-auto h-10 sm:h-9 px-5 rounded-lg',
                    'text-[13px] font-semibold text-background transition-all duration-150',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    isSaved ? 'bg-emerald-600' :
                        isError ? 'bg-red-500' :
                            'bg-foreground hover:opacity-90 active:scale-[0.98]'
                )}
            >
                {saveState === 'saving' ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Saving…
                    </span>
                ) : label}
            </button>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GeneralSettingsPage({ store }: { store: Store }) {
    const [name, setName] = useState(store.name)
    const [description, setDescription] = useState(store.description ?? '')
    const [currency, setCurrency] = useState(store.currency)
    const [timezone, setTimezone] = useState(store.timezone)
    const [isActive, setIsActive] = useState(store.is_active as boolean | undefined)
    const [saveState, setSaveState] = useState<SaveState>('idle')

    const handleSave = async () => {
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
        <div className="w-full max-w-5xl space-y-8 mx-auto">

            {/* ── Identity ── */}
            <Section title="Store identity" description="Basic information shown to your customers">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <FieldLabel>Store name</FieldLabel>
                        <FieldInput
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My Store"
                        />
                    </div>
                    <div>
                        <FieldLabel hint="contact support to change">Slug</FieldLabel>
                        <div className="relative">
                            <FieldInput value={store.slug} disabled />
                            <MSO icon="lock" className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-on-surface-muted/40" />
                        </div>
                        <p className="text-[11px] text-on-surface-muted/60 mt-1.5 flex items-center gap-1">
                            <MSO icon="link" className="text-[13px]" />
                            {store.slug}.menengai.cloud
                        </p>
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

            <div className="h-px bg-light" />

            {/* ── Locale ── */}
            <Section title="Locale" description="Currency and timezone for your storefront">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <FieldLabel>Currency</FieldLabel>
                        <FieldSelect value={currency} onChange={e => setCurrency(e.target.value)}>
                            {CURRENCIES.map(c => (
                                <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
                            ))}
                        </FieldSelect>
                    </div>
                    <div>
                        <FieldLabel>Timezone</FieldLabel>
                        <FieldSelect value={timezone ?? ''} onChange={e => setTimezone(e.target.value)}>
                            {TIMEZONES.map(tz => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </FieldSelect>
                    </div>
                </div>
            </Section>

            <div className="h-px bg-light" />

            {/* ── Visibility ── */}
            <Section title="Visibility" description="Control whether your store is open for business">
                <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border border-light bg-surface">
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground">Store active</p>
                        <p className="text-[12px] text-on-surface-muted mt-0.5 leading-snug">
                            When off, visitors see a coming soon page
                        </p>
                    </div>
                    <Switch
                        checked={isActive ?? false}
                        onCheckedChange={setIsActive}
                        className="shrink-0"
                    />
                </div>

                {/* Status pill */}
                <div className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium border',
                    isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900'
                        : 'bg-surface text-on-surface-muted border-light'
                )}>
                    <span className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isActive ? 'bg-emerald-500 animate-pulse' : 'bg-on-surface-muted/40'
                    )} />
                    {isActive ? (
                        <>
                            Live at{' '}
                            <a
                                href={`https://${store.slug}.menengai.cloud`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                            >
                                {store.slug}.menengai.cloud
                            </a>
                            <MSO icon="open_in_new" className="text-[13px] opacity-60" />
                        </>
                    ) : (
                        'Store is hidden — showing coming soon page'
                    )}
                </div>
            </Section>

            {/* ── Save bar ── */}
            <SaveBar saveState={saveState} onSave={handleSave} />
        </div>
    )
}