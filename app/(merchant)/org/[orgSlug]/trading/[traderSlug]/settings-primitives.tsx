'use client'

import { cn } from '@/lib/utils'

export function SettingSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--md-sys-color-on-surface-variant)] opacity-60">
                {label}
            </p>
            <div className="rounded-xl border border-[var(--md-sys-color-outline-variant)] divide-y divide-[var(--md-sys-color-outline-variant)]">
                {children}
            </div>
        </div>
    )
}

export function SettingRow({ label, description, children, fullWidth }: {
    label: string
    description?: string
    children: React.ReactNode
    fullWidth?: boolean
}) {
    return (
        <div className={cn('flex gap-6 px-5 py-4', fullWidth ? 'flex-col' : 'items-start justify-between')}>
            <div className="min-w-0 shrink-0 max-w-[240px]">
                <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">{label}</p>
                {description && (
                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed">{description}</p>
                )}
            </div>
            <div className={cn(fullWidth ? 'w-full' : 'flex-1 min-w-0 max-w-sm')}>{children}</div>
        </div>
    )
}

export function SaveButton({ isPending, saved, label = 'Save changes' }: {
    isPending: boolean
    saved?: boolean
    label?: string
}) {
    return (
        <div className="flex items-center gap-3">
            <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 h-10 px-5 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all"
            >
                {isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {label}
            </button>
            {saved && (
                <span className="flex items-center gap-1.5 text-[12px] text-[var(--md-sys-color-primary)]">
                    <span className="material-symbols-outlined select-none leading-none text-[16px]">check_circle</span>
                    Saved
                </span>
            )}
        </div>
    )
}
