'use client'

import Link from 'next/link'
import { cn } from '../utils'

export type TabItem = { id: string; label: string; count?: number; href?: string }

/**
 * Underlined tabs for switching views of one page (filters, sub-sections). Items with `href` are
 * links (sub-routes, back-button friendly); without, they call `onChange`. Scrolls sideways on
 * narrow screens instead of wrapping.
 */
export function Tabs({
    items,
    value,
    onChange,
    label,
    className,
}: {
    items: TabItem[]
    value: string
    onChange?: (id: string) => void
    /** Accessible name for the tab list. */
    label: string
    className?: string
}) {
    return (
        <div role="tablist" aria-label={label} className={cn('flex gap-4 overflow-x-auto border-b border-border', className)}>
            {items.map((t) => {
                const active = t.id === value
                const cls = cn(
                    'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 pb-2 pt-1 text-[13px] transition-colors',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )
                const inner = (
                    <>
                        {t.label}
                        {t.count !== undefined && (
                            <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-muted text-foreground' : 'bg-muted/60')}>
                                {t.count}
                            </span>
                        )}
                    </>
                )
                return t.href ? (
                    <Link key={t.id} href={t.href} role="tab" aria-selected={active} className={cls}>
                        {inner}
                    </Link>
                ) : (
                    <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => onChange?.(t.id)} className={cls}>
                        {inner}
                    </button>
                )
            })}
        </div>
    )
}
