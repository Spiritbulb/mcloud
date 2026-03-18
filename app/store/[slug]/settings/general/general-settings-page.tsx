'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Store {
    id: string
    name: string
    slug: string
    description?: string | null
    currency: string
    timezone: any
    is_active: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = [
    { value: 'KES', label: 'KES — Kenyan Shilling' },
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'GBP', label: 'GBP — British Pound' },
    { value: 'UGX', label: 'UGX — Ugandan Shilling' },
    { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
]

const TIMEZONES = [
    { value: 'Africa/Nairobi', label: 'Africa/Nairobi (UTC+3)' },
    { value: 'Africa/Lagos', label: 'Africa/Lagos (UTC+1)' },
    { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (UTC+2)' },
    { value: 'Africa/Cairo', label: 'Africa/Cairo (UTC+2)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
    { value: 'America/New_York', label: 'America/New_York (UTC−5)' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="mb-4 sm:mb-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-foreground">
                {title}
            </h2>
            <p className="text-[12px] text-on-surface-muted mt-1">{description}</p>
        </div>
    )
}

function FieldLabel({
    children,
    hint,
}: {
    children: React.ReactNode
    hint?: string
}) {
    return (
        <label className="block text-[12px] font-medium text-on-surface-muted tracking-wide mb-1.5">
            {children}
            {hint && (
                <span className="ml-2 font-normal opacity-60 normal-case tracking-normal">
                    {hint}
                </span>
            )}
        </label>
    )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={[
                'w-full h-10 px-3 bg-background border border-outline text-foreground',
                'text-[13px] font-[Montserrat,sans-serif] outline-none',
                'transition-colors duration-150',
                'focus:border-[#425e7b]',
                'disabled:bg-surface disabled:text-on-surface-muted disabled:cursor-not-allowed',
                // Prevent iOS zoom on focus (font-size >= 16px equivalent via touch target)
                'text-base sm:text-[13px]',
                props.className ?? '',
            ].join(' ')}
        />
    )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative">
            <select
                {...props}
                className={[
                    'w-full h-10 pl-3 pr-8 bg-background border border-outline text-foreground',
                    'text-base sm:text-[13px] font-[Montserrat,sans-serif] outline-none appearance-none cursor-pointer',
                    'transition-colors duration-150 focus:border-[#425e7b]',
                    props.className ?? '',
                ].join(' ')}
            />
            <svg
                width="12" height="12" viewBox="0 0 12 12"
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"
                fill="none"
            >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        </div>
    )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange(!on)}
            style={{ borderRadius: 0 }}
            // Slightly larger hit target on mobile
            className={[
                'relative inline-flex w-11 sm:w-10 h-6 sm:h-[22px] flex-shrink-0 cursor-pointer border-none',
                'transition-colors duration-200 outline-none',
                on ? 'bg-[#425e7b]' : 'bg-outline',
            ].join(' ')}
        >
            <span
                style={{ borderRadius: 0 }}
                className={[
                    'absolute top-[3px] w-[18px] sm:w-4 h-[18px] sm:h-4 bg-white shadow-sm',
                    'transition-[left] duration-150',
                    on ? 'left-[22px] sm:left-[20px]' : 'left-[3px]',
                ].join(' ')}
            />
        </button>
    )
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function StickyBar({
    saveState,
    onSave,
}: {
    saveState: SaveState
    onSave: () => void
}) {
    const label = {
        idle: 'Save changes',
        saving: 'Saving…',
        saved: 'Saved',
        error: 'Try again',
    }[saveState]

    const hint = {
        idle: 'You have unsaved changes',
        saving: 'Saving…',
        saved: 'All changes saved',
        error: 'Something went wrong',
    }[saveState]

    return (
        // On mobile: full-width stacked; on sm+: side-by-side
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#fff] dark:bg-[#000] border-t border-outline flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 z-10">
            <span
                className={[
                    'text-[12px] transition-colors duration-300 text-center sm:text-left',
                    saveState === 'saved' ? 'text-[#1D9E75]' : 'text-on-surface-muted',
                    saveState === 'error' ? 'text-red-500' : '',
                ].join(' ')}
            >
                {hint}
            </span>

            <button
                onClick={onSave}
                disabled={saveState === 'saving' || saveState === 'saved'}
                className={[
                    // Full width on mobile, auto on desktop
                    'w-full sm:w-auto h-10 sm:h-9 px-5 text-white text-[13px] font-semibold tracking-wide border-none cursor-pointer',
                    'transition-all duration-200 disabled:cursor-not-allowed',
                    saveState === 'saved'
                        ? 'bg-[#1D9E75]'
                        : saveState === 'error'
                            ? 'bg-red-500'
                            : 'bg-[#425e7b] hover:bg-[#425e7b]/90',
                ].join(' ')}
            >
                {label}
            </button>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GeneralSettingsPage({ store }: { store: Store }) {
    const [name, setName] = useState(store.name)
    const [description, setDescription] = useState(store.description ?? '')
    const [currency, setCurrency] = useState(store.currency)
    const [timezone, setTimezone] = useState(store.timezone)
    const [isActive, setIsActive] = useState(store.is_active)
    const [saveState, setSaveState] = useState<SaveState>('idle')

    const handleSave = async () => {
        setSaveState('saving')
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('stores')
                .update({
                    name,
                    description: description || null,
                    currency,
                    timezone,
                    is_active: isActive,
                })
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
        // Padding: tighter on mobile, normal on sm+
        <div className="w-full max-w-7xl px-0 sm:px-0">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-light">
                <p className="text-[11px] uppercase tracking-widest text-on-surface-muted mb-1">
                    Settings
                </p>
                <h1 className="text-xl sm:text-2xl font-montserrat font-bold text-foreground tracking-tight">
                    General
                </h1>
                <p className="text-[13px] text-on-surface-muted mt-1">
                    Manage your store's identity, locale, and visibility.
                </p>
            </div>

            {/* ── Store identity ───────────────────────────────────────────── */}
            <section className="mb-6 sm:mb-8">
                <SectionHeader
                    title="Store identity"
                    description="Basic information shown to your customers"
                />

                {/* Stacked on mobile, 2-col on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div>
                        <FieldLabel>Store name</FieldLabel>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Store"
                        />
                    </div>

                    <div>
                        <FieldLabel hint="contact support to change">Slug</FieldLabel>
                        <div className="relative">
                            <Input value={store.slug} disabled />
                            <div className="absolute right-0 top-0 h-full w-[3px] bg-[#425e7b] opacity-40" />
                        </div>
                        <p className="text-[11px] text-on-surface-muted mt-1.5 opacity-70">
                            {store.slug}.menengai.cloud
                        </p>
                    </div>
                </div>

                <div>
                    <FieldLabel>Description</FieldLabel>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell customers what you sell…"
                        rows={3}
                        className={[
                            'w-full px-3 py-2.5 bg-background border border-outline text-foreground',
                            'text-base sm:text-[13px] leading-relaxed outline-none resize-y',
                            'transition-colors duration-150 focus:border-[#425e7b]',
                        ].join(' ')}
                    />
                </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-outline mb-6 sm:mb-8" />

            {/* ── Locale ───────────────────────────────────────────────────── */}
            <section className="mb-6 sm:mb-8">
                <SectionHeader
                    title="Locale"
                    description="Currency and timezone for your storefront"
                />

                {/* Stacked on mobile, 2-col on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <FieldLabel>Currency</FieldLabel>
                        <Select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <FieldLabel>Timezone</FieldLabel>
                        <Select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-outline mb-6 sm:mb-8" />

            {/* ── Visibility ───────────────────────────────────────────────── */}
            <section className="mb-6 sm:mb-8">
                <SectionHeader
                    title="Visibility"
                    description="Control whether your store is open for business"
                />

                <div className="flex items-center justify-between gap-4 p-4 bg-surface border border-outline">
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground">Store active</p>
                        <p className="text-[12px] text-on-surface-muted mt-0.5 leading-snug">
                            When off, visitors see a coming soon page instead of your store
                        </p>
                    </div>
                    {/* flex-shrink-0 ensures toggle never gets squished */}
                    <div className="flex-shrink-0">
                        <Toggle on={isActive} onChange={setIsActive} />
                    </div>
                </div>

                {/* Live status indicator */}
                <div className="flex items-start gap-2 mt-2.5">
                    <span
                        className={[
                            'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[3px]',
                            isActive ? 'bg-[#1D9E75]' : 'bg-red-400',
                        ].join(' ')}
                    />
                    <span className="text-[11px] text-on-surface-muted tracking-wide leading-snug">
                        {isActive ? (
                            <>
                                Your store is live at{' '}
                                <a
                                    href={`https://${store.slug}.menengai.cloud`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#425e7b] underline underline-offset-2 break-all"
                                >
                                    {store.slug}.menengai.cloud
                                </a>
                            </>
                        ) : (
                            <>
                                Your store is <strong>hidden</strong> — visitors see a coming soon page
                            </>
                        )}
                    </span>
                </div>
            </section>

            {/* ── Sticky save bar ──────────────────────────────────────────── */}
            <StickyBar saveState={saveState} onSave={handleSave} />
        </div>
    )
}