// Images uploaded before the move to Backblaze B2 point at Cloudflare R2's public host
// (`pub-….r2.dev`). R2 no longer serves them (403), and the objects were not migrated: the
// rows keep their URLs, public pages leave those images out, and settings asks the merchant
// to upload them again. Pure, so both apps and the themes can share it.

/** True for an image URL on the retired R2 storage. */
export function isRetiredImageUrl(url: unknown): boolean {
    if (typeof url !== 'string') return false
    const m = /^https?:\/\/([^/?#]+)/i.exec(url.trim())
    return !!m && /(^|\.)r2\.dev$/i.test(m[1])
}

/**
 * A copy of `value` with retired image URLs removed, at any depth: dropped from arrays,
 * blanked ('') as object fields, so a template's `if image` and a component's `src &&`
 * both skip them. Objects whose `url`/`src` is retired (service media, gallery photos)
 * are dropped from their array too. Anything without a retired URL comes back unchanged.
 */
export function dropRetiredImages<T>(value: T): T {
    return scrub(value) as T
}

function scrub(value: unknown): unknown {
    if (typeof value === 'string') return isRetiredImageUrl(value) ? '' : value
    if (Array.isArray(value)) {
        return value
            .filter((v) => !isRetiredImageUrl(v) && !isRetiredMedia(v))
            .map(scrub)
    }
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value)) out[k] = scrub(v)
        return out
    }
    return value
}

function isRetiredMedia(v: unknown): boolean {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false
    const o = v as Record<string, unknown>
    return isRetiredImageUrl(o.url) || isRetiredImageUrl(o.src)
}
