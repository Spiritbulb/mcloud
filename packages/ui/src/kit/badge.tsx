import type { ReactNode } from 'react'
import { cn } from '../utils'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

// Two shapes, as in most dashboard systems (Geist's status dot vs badge, Primer's StateLabel vs
// Label): a *state* (paid, active, live) is a coloured dot and plain text, so a table of statuses
// reads as text instead of a column of coloured pills; a *label* (featured, a tag, "Soon") is a
// small square chip. One tone map, so every admin screen colours the same state the same way.
const DOTS: Record<BadgeTone, string> = {
    neutral: 'bg-muted-foreground/50',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
}

const TONES: Record<BadgeTone, string> = {
    neutral: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
    danger: 'bg-red-500/10 text-red-700 dark:text-red-300',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

/** A state: dot + text. Use for statuses in tables, lists and headers. */
export function Status({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-foreground">
            <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOTS[tone])} />
            {children}
        </span>
    )
}

/** A label or tag: a small chip. For states, use Status. */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
    return (
        <span className={cn('inline-flex items-center rounded px-1.5 py-px text-[11px] font-medium leading-4', TONES[tone])}>
            {children}
        </span>
    )
}

/** Order lifecycle -> badge tone. Unknown statuses fall back to neutral rather than guessing. */
export function orderStatusTone(status: string | null | undefined): BadgeTone {
    switch (status) {
        case 'paid': return 'success'
        case 'pending': return 'warning'
        case 'partially_paid': return 'info'
        case 'refunded':
        case 'voided':
        case 'cancelled': return 'danger'
        default: return 'neutral'
    }
}

export function fulfillmentTone(status: string | null | undefined): BadgeTone {
    switch (status) {
        case 'fulfilled': return 'success'
        case 'partial':
        case 'partially_fulfilled': return 'info'
        case 'unfulfilled': return 'warning'
        default: return 'neutral'
    }
}

export function subscriptionStatusTone(status: string | null | undefined): BadgeTone {
    switch (status) {
        case 'active': return 'success'
        case 'pending': return 'warning'
        case 'expired': return 'danger'
        default: return 'neutral'
    }
}

/** users.role: admin (platform), client (owns an org or store), customer (everyone else). */
export function roleTone(role: string | null | undefined): BadgeTone {
    switch (role) {
        case 'admin': return 'info'
        case 'client': return 'success'
        default: return 'neutral'
    }
}

export function webhookStatusTone(status: string | null | undefined): BadgeTone {
    switch (status) {
        case 'success': return 'success'
        case 'failed': return 'danger'
        default: return 'neutral'
    }
}
