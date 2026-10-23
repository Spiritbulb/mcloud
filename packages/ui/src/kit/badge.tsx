import type { ReactNode } from 'react'
import { cn } from '../utils'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

// Tinted, never solid: status should be readable at a glance without shouting. One map, so every
// admin screen colours the same state the same way.
const TONES: Record<BadgeTone, string> = {
    neutral: 'bg-muted/60 text-muted-foreground',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4', TONES[tone])}>
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
