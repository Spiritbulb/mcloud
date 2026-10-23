import type { ReactNode } from 'react'
import { cn } from '../utils'

/**
 * The one surface the admin is built from: a hairline-bordered card with an optional header row.
 * `flush` drops the body padding, for tables and lists that run edge to edge.
 */
export function Panel({
    title,
    description,
    action,
    flush,
    className,
    children,
}: {
    title?: string
    description?: ReactNode
    action?: ReactNode
    flush?: boolean
    className?: string
    children: ReactNode
}) {
    return (
        <section className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
            {(title || action) && (
                <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                        {title && <h2 className="font-sans text-[13px] font-medium text-foreground">{title}</h2>}
                        {description && <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>}
                    </div>
                    {action && <div className="shrink-0 text-[12px]">{action}</div>}
                </header>
            )}
            <div className={flush ? undefined : 'p-4'}>{children}</div>
        </section>
    )
}
