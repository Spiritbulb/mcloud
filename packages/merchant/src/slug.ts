// Pure store-slug rules, safe to import from client components (no database access).

/** Normalize a raw slug to the canonical lowercase-hyphen form. */
export function normalizeSlug(raw: string): string {
    return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

/**
 * First path segments the storefront serves itself. The platform host resolves
 * app.mcloud.co.ke/{slug}, so a store with one of these slugs would be unreachable
 * (or shadow a real route). `org` is the merchant settings area; the rest are the
 * storefront's own marketing and sign-in pages.
 */
export const RESERVED_STORE_SLUGS: ReadonlySet<string> = new Set([
    'org', 'store', 'api', 'auth', 'admin', 'settings', 'orders', 'products', 's',
    'start', 'login', 'signup', 'moving', 'pricing', 'logout',
])

export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9][a-z0-9-]{1,}[a-z0-9]$/.test(slug)
}

/** Turn a display name into a candidate slug: "Wanjiru's Crafts!" -> "wanjiru-s-crafts". */
export function slugFromName(name: string): string {
    return normalizeSlug(name).replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

/** Why a slug can't be used, or null when it can. Shape rules only; uniqueness needs the database. */
export function slugProblem(slug: string): string | null {
    if (!slug) return 'Choose an address for your site'
    if (!isValidSlug(slug)) return 'Use 3+ lowercase letters, numbers or hyphens, not starting or ending with a hyphen'
    if (RESERVED_STORE_SLUGS.has(slug)) return 'That address is reserved'
    return null
}
