import type { ReactNode } from 'react'
import { cn } from '../utils'

// Plain building blocks, not a data grid: the caller maps its rows. Right-align numbers, keep
// headers quiet, and let hover do the rest. Used inside <Panel flush>.
//
// Below `md` the table restyles itself into a stack of cards: the header row is hidden, each row
// becomes a block, and each cell with a `label` shows "Label  value" on one line. A cell without a
// label is the card's title and takes the full width. Same markup, so callers write one version.
// (CSS display overrides drop native table semantics for assistive tech on phones; the data is all
// still there as text, each value next to its label.)
//
// While data loads, render <SkeletonRows columns={n} /> (./skeleton) as the body and pass `busy`.
export function Table({ children, busy }: { children: ReactNode; busy?: boolean }) {
    return (
        <div className="overflow-x-auto max-md:[&_table]:block max-md:[&_tbody]:block max-md:[&_thead]:hidden">
            <table aria-busy={busy || undefined} className="w-full text-[13px]">{children}</table>
        </div>
    )
}

export function Th({ children, align = 'left' }: { children?: ReactNode; align?: 'left' | 'right' }) {
    return (
        <th scope="col" className={cn('px-4 py-2 text-[12px] font-medium text-muted-foreground', align === 'right' ? 'text-right' : 'text-left')}>
            {children}
        </th>
    )
}

const ROW = 'border-t border-border transition-colors hover:bg-muted/40 max-md:block max-md:px-4 max-md:py-3'

export function Tr({ children }: { children: ReactNode }) {
    return <tr className={ROW}>{children}</tr>
}

/** Row classes for callers that need their own `<tr>` (clickable or expandable rows). */
export const ROW_CLASS = ROW

export function Td({
    children,
    align = 'left',
    muted,
    label,
    colSpan,
}: {
    children?: ReactNode
    align?: 'left' | 'right'
    muted?: boolean
    /** Shown beside the value on phones. Omit on the cell that identifies the row. */
    label?: string
    colSpan?: number
}) {
    return (
        <td
            colSpan={colSpan}
            data-label={label}
            className={cn(
                'px-4 py-2.5',
                align === 'right' && 'text-right tabular-nums',
                muted ? 'text-muted-foreground' : 'text-foreground',
                // Phone card: a labelled cell is a two-ended line; an unlabelled one is the title.
                'max-md:block max-md:px-0 max-md:py-1 max-md:text-left',
                label &&
                    'max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:text-right ' +
                        'max-md:before:shrink-0 max-md:before:text-left max-md:before:text-[12px] max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]',
            )}
        >
            {label ? <span className="min-w-0 max-md:text-right">{children}</span> : children}
        </td>
    )
}
