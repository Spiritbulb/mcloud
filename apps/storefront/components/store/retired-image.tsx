// Images uploaded before the move to Backblaze B2 sat on Cloudflare R2, which no longer serves
// them. Settings keeps showing where they were and asks the merchant to upload them again; the
// public store leaves them out (see @mcloud/merchant/retired-images).
import { Icon } from '@mcloud/ui/kit/icon'
import { isRetiredImageUrl } from '@mcloud/merchant/retired-images'

export { isRetiredImageUrl }

export const RETIRED_IMAGE_MESSAGE =
    'This image was on our old storage and can no longer be shown. Please upload it again.'

/** A small tile in place of a thumbnail whose image is on the retired storage. */
export function RetiredThumb() {
    return (
        <span
            title={RETIRED_IMAGE_MESSAGE}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10"
        >
            <Icon name="warning" size={16} className="text-amber-600 dark:text-amber-400" />
        </span>
    )
}

/** The one-line notice under or beside an image that needs uploading again. */
export function RetiredImageNotice({ className = '' }: { className?: string }) {
    return (
        <p role="status" className={`flex items-start gap-1.5 text-[12px] text-amber-700 dark:text-amber-400 ${className}`}>
            <Icon name="warning" size={14} className="mt-px shrink-0" />
            <span>{RETIRED_IMAGE_MESSAGE}</span>
        </p>
    )
}
