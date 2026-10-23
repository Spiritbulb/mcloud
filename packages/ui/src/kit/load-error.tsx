'use client'

import type { ReactNode } from 'react'
import { Button } from './button'
import { Icon } from './icon'

/** What a panel or table shows when its client-side fetch failed. Offers a retry when it can. */
export function LoadError({
    title = "Couldn't load this",
    message,
    onRetry,
}: {
    title?: string
    message?: ReactNode
    onRetry?: () => void
}) {
    return (
        <div role="alert" className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Icon name="error" size={22} className="text-red-600 dark:text-red-400" />
            <p className="text-[13px] font-medium text-foreground">{title}</p>
            {message && <p className="max-w-sm text-[12px] text-muted-foreground">{message}</p>}
            {onRetry && (
                <Button size="sm" onClick={onRetry} className="mt-1">
                    <Icon name="refresh" size={14} />
                    Try again
                </Button>
            )}
        </div>
    )
}
