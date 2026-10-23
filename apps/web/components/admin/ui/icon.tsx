import { cn } from '@mcloud/ui/utils'

/**
 * Material Symbols glyph. The size is set inline on purpose: Google's icon stylesheet is unlayered
 * (`font-size: 24px`), so it beats Tailwind's `text-[16px]` utilities, and every icon would render
 * at 24px whatever class it was given.
 */
export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
    return (
        <span
            aria-hidden
            className={cn('material-symbols-outlined shrink-0 select-none leading-none', className)}
            style={{ fontSize: size, width: size, height: size, lineHeight: 1 }}
        >
            {name}
        </span>
    )
}
