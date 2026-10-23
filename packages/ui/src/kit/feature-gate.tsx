import type { ReactNode } from 'react'
import { Icon } from './icon'

/**
 * Stands in for a feature the store cannot use yet: not built ("coming soon"), not on its plan,
 * or not set up. Says why and, when there is one, offers the way forward as `action`.
 */
export function FeatureGate({
    title,
    description,
    icon = 'lock',
    action,
}: {
    title: string
    description?: ReactNode
    icon?: string
    action?: ReactNode
}) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <Icon name={icon} size={18} className="text-muted-foreground" />
            </span>
            <p className="mt-1 text-[13px] font-medium text-foreground">{title}</p>
            {description && <p className="max-w-sm text-[12px] text-muted-foreground">{description}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    )
}
