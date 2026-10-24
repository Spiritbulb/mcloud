import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../utils'

// Form building blocks for settings screens. A section is a <Panel> (title, description, footer);
// inside it, Fields in a FormGrid. Controls are plain elements with the kit's look, so callers keep
// their own state and handlers.

const CONTROL =
    'w-full rounded-md border bg-card px-2.5 text-[13px] text-foreground placeholder:text-muted-foreground ' +
    'transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground'

function controlClass(invalid?: boolean) {
    return cn(
        CONTROL,
        invalid
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 dark:border-red-500/60'
            : 'border-input focus:border-ring focus:ring-ring/30',
    )
}

/**
 * Label, control, then a hint or an error under it. Wraps the control in a <label> so clicking the
 * text focuses it; for a control that is not a single input (a switch, a group), pass `htmlFor`
 * to the control's id instead, or use `as="div"` to drop the label element.
 */
export function Field({
    label,
    hint,
    error,
    htmlFor,
    as,
    className,
    children,
}: {
    label: ReactNode
    hint?: ReactNode
    error?: ReactNode
    htmlFor?: string
    as?: 'div'
    className?: string
    children: ReactNode
}) {
    const text = <span className="mb-1.5 block text-[12px] font-medium text-foreground">{label}</span>
    const below = error ? (
        <span role="alert" className="mt-1.5 block text-[12px] text-red-700 dark:text-red-300">{error}</span>
    ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-muted-foreground">{hint}</span>
    ) : null

    if (htmlFor || as === 'div') {
        return (
            <div className={cn('block min-w-0', className)}>
                {htmlFor ? <label htmlFor={htmlFor}>{text}</label> : text}
                {children}
                {below}
            </div>
        )
    }
    return (
        <label className={cn('block min-w-0', className)}>
            {text}
            {children}
            {below}
        </label>
    )
}

/** Fields side by side on wide screens, stacked below `sm`. `span` on a child is not needed: use `className="sm:col-span-2"`. */
export function FormGrid({ columns = 2, className, children }: { columns?: 1 | 2 | 3; className?: string; children: ReactNode }) {
    return (
        <div
            className={cn(
                'grid gap-x-4 gap-y-4',
                columns === 2 && 'sm:grid-cols-2',
                columns === 3 && 'sm:grid-cols-3',
                className,
            )}
        >
            {children}
        </div>
    )
}

export function TextInput({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
    return <input aria-invalid={invalid || undefined} className={cn(controlClass(invalid), 'h-9', className)} {...props} />
}

export function TextArea({ invalid, className, rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
    return <textarea rows={rows} aria-invalid={invalid || undefined} className={cn(controlClass(invalid), 'py-2 leading-relaxed', className)} {...props} />
}

export function Select({ invalid, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
    return (
        <select aria-invalid={invalid || undefined} className={cn(controlClass(invalid), 'h-9 pr-7', className)} {...props}>
            {children}
        </select>
    )
}

/** On/off control. With `label`, renders as a full row: text on the left, switch on the right. */
export function Switch({
    checked,
    onChange,
    label,
    description,
    disabled,
    id,
}: {
    checked: boolean
    onChange: (checked: boolean) => void
    label?: ReactNode
    description?: ReactNode
    disabled?: boolean
    id?: string
}) {
    const control = (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
        >
            <span className="sr-only">{typeof label === 'string' ? label : 'Toggle'}</span>
            <span
                aria-hidden
                className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')}
            />
        </button>
    )
    if (!label) return control
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">{label}</p>
                {description && <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>}
            </div>
            {control}
        </div>
    )
}

/** Right-aligned row of buttons, for a Panel footer or the end of a form. */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>{children}</div>
}
