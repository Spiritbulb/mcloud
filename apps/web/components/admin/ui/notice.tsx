import type { ReactNode } from 'react'
import { cn } from '@mcloud/ui/utils'

const TONES = {
    error: 'border-red-300/70 bg-red-50/60 text-red-800 dark:border-red-500/30 dark:bg-red-500/[0.06] dark:text-red-300',
    warning: 'border-amber-300/70 bg-amber-50/60 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/[0.06] dark:text-amber-300',
    info: 'border-border bg-muted/40 text-muted-foreground',
} as const

/** Inline message under a page header or inside a dialog. Announced to screen readers. */
export function Notice({ tone = 'info', children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
    return (
        <p role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-lg border px-3.5 py-2.5 text-[13px]', TONES[tone], className)}>
            {children}
        </p>
    )
}
