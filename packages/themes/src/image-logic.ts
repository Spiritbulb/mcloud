// Product and service images. There is no placeholder image route: `/api/placeholder/*` never
// existed and 404'd for every product without a photo. A missing image is null, and the
// component draws an empty tile instead. Carts saved in shoppers' browsers before this change
// still hold `/api/placeholder/...` strings, so those count as missing too.

const DEAD_PLACEHOLDER = /^\/api\/placeholder\//

export function imageOrNull(src: string | null | undefined): string | null {
    if (!src) return null
    const trimmed = src.trim()
    if (!trimmed || DEAD_PLACEHOLDER.test(trimmed)) return null
    return trimmed
}

export function firstImage(images: unknown): string | null {
    return Array.isArray(images) ? imageOrNull(images[0] as string | undefined) : null
}
