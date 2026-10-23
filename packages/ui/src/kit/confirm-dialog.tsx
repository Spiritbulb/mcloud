'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './button'
import { Spinner } from './skeleton'

/**
 * Asks before a destructive or costly action. A native <dialog>, so focus trapping, Escape and the
 * backdrop come from the browser. Controlled: the caller owns `open` and closes it in `onCancel`
 * or after `onConfirm` settles. While `busy`, neither button nor Escape can dismiss it.
 */
export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    tone = 'danger',
    busy,
    onConfirm,
    onCancel,
    children,
}: {
    open: boolean
    title: string
    description?: ReactNode
    confirmLabel?: string
    tone?: 'danger' | 'primary'
    busy?: boolean
    onConfirm: () => void
    onCancel: () => void
    /** Extra content between the text and the buttons, such as a "type the name to confirm" field. */
    children?: ReactNode
}) {
    const ref = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const d = ref.current
        if (!d) return
        if (open && !d.open) d.showModal()
        if (!open && d.open) d.close()
    }, [open])

    return (
        <dialog
            ref={ref}
            aria-labelledby="confirm-dialog-title"
            onCancel={(e) => {
                e.preventDefault()
                if (!busy) onCancel()
            }}
            className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
        >
            <div className="p-5">
                <h2 id="confirm-dialog-title" className="font-sans text-[15px] font-semibold">{title}</h2>
                {description && <div className="mt-1.5 text-[13px] text-muted-foreground">{description}</div>}
                {children && <div className="mt-4">{children}</div>}
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
                <Button onClick={onCancel} disabled={busy}>Cancel</Button>
                <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
                    {busy && <Spinner size={13} />}
                    {confirmLabel}
                </Button>
            </div>
        </dialog>
    )
}
