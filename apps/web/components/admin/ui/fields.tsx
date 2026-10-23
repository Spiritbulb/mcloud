import type { ChangeEvent, ReactNode } from 'react'
import { cn } from '@mcloud/ui/utils'
import { Icon } from './icon'

const CONTROL =
    'h-8 rounded-md border border-border bg-card px-2.5 text-[13px] text-foreground placeholder:text-muted-foreground ' +
    'transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30'

/** Filter row above a table: search on the left, selects after it, wrapping on small screens. */
export function Toolbar({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

export function SearchField({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string
    onChange: (value: string) => void
    placeholder: string
    className?: string
}) {
    return (
        <div className={cn('relative w-full max-w-xs', className)}>
            <Icon name="search" size={16} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
                type="search"
                value={value}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className={cn(CONTROL, 'w-full pl-8')}
            />
        </div>
    )
}

export function SelectField({
    value,
    onChange,
    label,
    children,
}: {
    value: string
    onChange: (value: string) => void
    /** Accessible name; there is no visible label in a toolbar. */
    label: string
    children: ReactNode
}) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cn(CONTROL, 'pr-7')}>
            {children}
        </select>
    )
}
