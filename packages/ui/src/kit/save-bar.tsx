import { cn } from '../utils'
import { Button } from './button'
import { Icon } from './icon'
import { Spinner } from './skeleton'

/**
 * Sticky bar at the bottom of a settings form. Hidden until there is something to save (`dirty`,
 * see `isDirty` in ui-logic), so a pristine form has no button competing for attention.
 * `onDiscard` adds a "Discard" that resets the draft.
 */
export function SaveBar({
    dirty = true,
    saving,
    onSave,
    onDiscard,
    label = 'Save changes',
    message = 'You have unsaved changes',
}: {
    dirty?: boolean
    saving: boolean
    onSave: () => void
    onDiscard?: () => void
    label?: string
    message?: string
}) {
    if (!dirty && !saving) return null
    return (
        <div className="sticky bottom-0 z-30 mt-6 border-t border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[12px] text-muted-foreground">{saving ? 'Saving…' : message}</p>
                <div className="flex shrink-0 items-center gap-2">
                    {onDiscard && (
                        <Button variant="ghost" onClick={onDiscard} disabled={saving}>
                            Discard
                        </Button>
                    )}
                    <Button variant="primary" onClick={onSave} disabled={saving}>
                        {saving ? <Spinner size={13} /> : <Icon name="check" size={15} />}
                        {saving ? 'Saving…' : label}
                    </Button>
                </div>
            </div>
        </div>
    )
}

/** Small status pill in the corner after a save: "Saving…", then "Changes saved". */
export function SaveStatus({ saving, saved, className }: { saving: boolean; saved: boolean; className?: string }) {
    if (!saving && !saved) return null
    return (
        <div
            role="status"
            className={cn(
                'pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[12px] shadow-md',
                className,
            )}
        >
            {saving ? (
                <>
                    <Spinner size={12} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Saving…</span>
                </>
            ) : (
                <>
                    <Icon name="check_circle" size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-foreground">Changes saved</span>
                </>
            )}
        </div>
    )
}
