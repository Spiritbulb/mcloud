import type { ReactNode } from 'react'

/** Title row at the top of every admin page. Actions sit on the right and wrap under on mobile. */
export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string
    description?: ReactNode
    actions?: ReactNode
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
                <h1 className="font-sans text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    )
}
