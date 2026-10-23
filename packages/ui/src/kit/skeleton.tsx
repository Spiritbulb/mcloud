import type { CSSProperties } from 'react'
import { cn } from '../utils'
import { skeletonWidth } from './ui-logic'

// Loading placeholders. Screens fetch on the client, and the kit owns what "loading" looks like,
// so a page passes `loading` (or renders these) instead of drawing its own grey boxes.

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
    return <span aria-hidden className={cn('block animate-pulse rounded bg-muted/70', className)} style={style} />
}

/**
 * Placeholder rows for a `<Table>` body while its data loads. Pass the real column count so the
 * layout does not jump when rows arrive; put `busy` on the Table so assistive tech knows.
 */
export function SkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }, (_, r) => (
                <tr key={r} aria-hidden className="border-t border-border max-md:block max-md:px-4 max-md:py-3">
                    {Array.from({ length: columns }, (_, c) => (
                        <td key={c} className="px-4 py-3 max-md:block max-md:px-0 max-md:py-1">
                            <Skeleton className="h-3" style={{ width: `${skeletonWidth(r, c)}%` }} />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}

/** A few lines of text-shaped placeholder, for a panel body or a form that is still loading. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div aria-hidden className={cn('space-y-2.5', className)}>
            {Array.from({ length: lines }, (_, i) => (
                <Skeleton key={i} className="h-3" style={{ width: `${skeletonWidth(i, 1)}%` }} />
            ))}
        </div>
    )
}

/** Inline spinner for buttons and status text. Inherits the text colour. */
export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
    return (
        <span
            aria-hidden
            className={cn('inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
            style={{ width: size, height: size }}
        />
    )
}
