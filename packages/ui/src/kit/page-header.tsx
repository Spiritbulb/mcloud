import type { ReactNode } from 'react'
import { Icon } from './icon'

/**
 * Title row at the top of every admin page. Actions sit on the right and wrap under on mobile.
 * `help` links to the page's documentation (opens in a new tab).
 */
export function PageHeader({
    title,
    description,
    actions,
    help,
}: {
    title: string
    description?: ReactNode
    actions?: ReactNode
    help?: { href: string; label?: string }
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
                <h1 className="font-sans text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                {(description || help) && (
                    <p className="mt-1 text-[14px] text-muted-foreground">
                        {description}
                        {help && (
                            <a
                                href={help.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 inline-flex items-center gap-1 whitespace-nowrap text-primary hover:underline"
                            >
                                <Icon name="menu_book" size={14} />
                                {help.label ?? 'Help'}
                            </a>
                        )}
                    </p>
                )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    )
}
