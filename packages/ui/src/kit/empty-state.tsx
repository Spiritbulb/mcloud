import type { ReactNode } from 'react'
import { Icon } from './icon'

/** Centered "nothing here yet" block. `illustration` (an <Illustration>) replaces the icon. */
export function EmptyState({ icon = 'inbox', illustration, title, description, action }: {
    icon?: string
    illustration?: ReactNode
    title: string
    description?: ReactNode
    action?: ReactNode
}) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            {illustration ?? <Icon name={icon} size={22} className="text-muted-foreground" />}
            <p className="text-[14px] font-medium text-foreground">{title}</p>
            {description && <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>}
            {action && <div className="mt-1">{action}</div>}
        </div>
    )
}
