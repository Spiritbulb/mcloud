import { cn } from '@mcloud/ui/utils'
import { sparklinePaths } from './ui-logic'

/** Inline trend line with a soft fill. Colour comes from `currentColor`, so set a text colour on it. */
export function Sparkline({
    values,
    label,
    height = 64,
    className,
}: {
    values: number[]
    label: string
    height?: number
    className?: string
}) {
    const W = 300
    const { line, area } = sparklinePaths(values, W, height, 3)
    if (!line) return null
    return (
        <svg
            viewBox={`0 0 ${W} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={label}
            className={cn('block w-full', className)}
            style={{ height }}
        >
            <path d={area} fill="currentColor" opacity={0.1} />
            <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
    )
}
