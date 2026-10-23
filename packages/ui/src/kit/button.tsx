import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const BASE =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'border border-border bg-card text-foreground hover:bg-muted/60',
    danger: 'border border-red-300/70 bg-card text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10',
    ghost: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
}

/** Class string for anything that should look like a button, e.g. a <Link>. */
export function buttonClass(variant: ButtonVariant = 'secondary', size: 'sm' | 'md' = 'md'): string {
    return cn(BASE, VARIANTS[variant], size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]')
}

export function Button({
    variant = 'secondary',
    size = 'md',
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
    return <button type="button" className={cn(buttonClass(variant, size), className)} {...props} />
}
