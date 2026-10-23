import type { ReactNode } from 'react'

export function EmptyState({ icon = 'inbox', title, description, action }: { icon?: string; title: string; description?: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="material-symbols-outlined select-none text-[22px] text-muted-foreground" aria-hidden>{icon}</span>
            <p className="text-[13px] font-medium text-foreground">{title}</p>
            {description && <p className="max-w-sm text-[12px] text-muted-foreground">{description}</p>}
            {action && <div className="mt-1">{action}</div>}
        </div>
    )
}
