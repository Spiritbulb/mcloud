import { cn } from '@mcloud/ui/utils'
import { initials } from './ui-logic'

/** Logo or initials in a small tile. `shape="circle"` for people, "square" for stores. */
export function Avatar({ name, src, shape = 'square' }: { name: string | null; src?: string | null; shape?: 'circle' | 'square' }) {
    return (
        <span
            className={cn(
                'store-avatar-fallback flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden text-[10px] font-bold',
                shape === 'circle' ? 'rounded-full' : 'rounded-md',
            )}
        >
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
                initials(name)
            )}
        </span>
    )
}
