import type { ReactNode } from 'react'
import { cn } from '@mcloud/ui/utils'

// Plain building blocks, not a data grid: the caller maps its rows. Right-align numbers, keep
// headers quiet, and let hover do the rest. Used inside <Panel flush>.
export function Table({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">{children}</table>
        </div>
    )
}

export function Th({ children, align = 'left' }: { children?: ReactNode; align?: 'left' | 'right' }) {
    return (
        <th scope="col" className={cn('px-4 py-2 text-[12px] font-medium text-muted-foreground', align === 'right' ? 'text-right' : 'text-left')}>
            {children}
        </th>
    )
}

export function Tr({ children }: { children: ReactNode }) {
    return <tr className="border-t border-border transition-colors hover:bg-muted/40">{children}</tr>
}

export function Td({ children, align = 'left', muted }: { children?: ReactNode; align?: 'left' | 'right'; muted?: boolean }) {
    return (
        <td className={cn('px-4 py-2.5', align === 'right' && 'text-right tabular-nums', muted ? 'text-muted-foreground' : 'text-foreground')}>
            {children}
        </td>
    )
}
