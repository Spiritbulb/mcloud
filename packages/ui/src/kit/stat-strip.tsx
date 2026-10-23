import type { ReactNode } from 'react'
import { cn } from '../utils'
import { deltaTone, formatDelta, percentChange } from './ui-logic'

/**
 * A row of headline numbers sharing one border, divided by hairlines (the Vercel / Cloudflare
 * pattern), instead of a card per number. `gap-px` over a border-coloured background draws the
 * dividers, so they stay correct however the grid wraps.
 */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('grid gap-px overflow-hidden rounded-lg border border-border bg-border', className)}>
            {children}
        </div>
    )
}

export function Stat({
    label,
    value,
    current,
    previous,
    hint,
}: {
    label: string
    value: string
    /** With `previous`, shows the change between the two. */
    current?: number
    previous?: number
    hint?: ReactNode
}) {
    const pct = current !== undefined && previous !== undefined ? percentChange(current, previous) : undefined
    return (
        <div className="bg-card p-4">
            <p className="text-[12px] text-muted-foreground">{label}</p>
            <div className="mt-1 flex items-baseline gap-2">
                <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
                {pct !== undefined && <Delta pct={pct} />}
            </div>
            {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
        </div>
    )
}

const DELTA_COLOR = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-red-600 dark:text-red-400',
    flat: 'text-muted-foreground',
}

/** "+12%" coloured by direction. `goodWhen="down"` flips it for things like refunds or errors. */
export function Delta({ pct, goodWhen = 'up' }: { pct: number | null; goodWhen?: 'up' | 'down' }) {
    const tone = deltaTone(pct)
    const colour =
        tone === 'flat' ? DELTA_COLOR.flat : (tone === 'up') === (goodWhen === 'up') ? DELTA_COLOR.up : DELTA_COLOR.down
    return <span className={cn('text-[12px] font-medium tabular-nums', colour)}>{formatDelta(pct)}</span>
}
