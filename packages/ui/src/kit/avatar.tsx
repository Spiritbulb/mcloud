import { cn } from '../utils'
import { initials } from './ui-logic'

/**
 * Logo or initials in a small tile. `shape="circle"` for people, "square" for stores.
 * The image is fitted, not cropped: most store and org logos are wide wordmarks, and cropping one
 * to a square leaves its middle letters. The tile's grey shows around a non-square logo.
 */
export function Avatar({ name, src, shape = 'square' }: { name: string | null; src?: string | null; shape?: 'circle' | 'square' }) {
    return (
        <span
            className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden text-[10px] font-bold',
                src ? 'bg-muted' : 'store-avatar-fallback',
                shape === 'circle' ? 'rounded-full' : 'rounded-md',
            )}
        >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-full w-full object-contain" />
            ) : (
                initials(name)
            )}
        </span>
    )
}
