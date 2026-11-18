import { cn } from '../utils'
import { Panel } from './panel'
import { Skeleton, SkeletonLines } from './skeleton'
import { Stat, StatStrip } from './stat-strip'

// The loading state of a whole admin page, drawn with the same kit pieces a page is made of
// (StatStrip, Panel, and PageHeader's title spacing) so the swap to real content does not shift or restyle.
// Like BrandLoader it fades in after a short delay, so a fast navigation never flashes it.

const css = `
@keyframes mc-page-sk-in { from { opacity: 0 } to { opacity: 1 } }
.mc-page-sk { opacity: 0; animation: mc-page-sk-in .25s ease-out .12s forwards }
@media (prefers-reduced-motion: reduce) { .mc-page-sk { animation-duration: 0s } }
`

export function PageSkeleton({
    stats = 0,
    panels = 2,
    className,
}: {
    /** Number of headline tiles to draw above the panels (0 for none). */
    stats?: number
    panels?: number
    className?: string
}) {
    return (
        <div role="status" aria-busy className={cn('mc-page-sk space-y-6', className)}>
            <style>{css}</style>
            <div aria-hidden>
                {/* Same box as PageHeader's title + description, so the heading does not jump. */}
                <Skeleton className="h-7 w-48" />
                <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            </div>
            {stats > 0 && (
                <StatStrip className={stats === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}>
                    {Array.from({ length: stats }, (_, i) => (
                        <Stat key={i} label={' '} value="" loading />
                    ))}
                </StatStrip>
            )}
            {Array.from({ length: panels }, (_, i) => (
                <Panel key={i}>
                    <Skeleton className="mb-4 h-4 w-32" />
                    <SkeletonLines lines={i === 0 ? 4 : 3} />
                </Panel>
            ))}
            <span className="sr-only">Loading…</span>
        </div>
    )
}
