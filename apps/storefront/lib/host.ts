/**
 * Host classification shared by the middleware (proxy.ts) and server components.
 *
 * A "platform host" is the menengai.cloud family or local dev. Anything else is a
 * merchant's own custom domain, where the storefront is white-labelled: the
 * internal store slug must never appear in a URL, so in-store links are bare
 * ("/cart") rather than slug-prefixed ("/store/{slug}/cart").
 */
export function isPlatformHost(host: string): boolean {
    return (
        host === 'menengai.cloud' ||
        host.endsWith('.menengai.cloud') ||
        host.includes('localhost') ||
        host.includes('192.168.1.') ||
        host.includes('127.0.0.1')
    )
}

/** Inverse of {@link isPlatformHost}: served from the merchant's own domain. */
export function isCustomDomainHost(host: string): boolean {
    return !isPlatformHost(host)
}

/** Local dev / LAN host — never redirect off of these (no real custom domain exists). */
export function isLocalHost(host: string): boolean {
    return (
        host.includes('localhost') ||
        host.includes('127.0.0.1') ||
        host.includes('192.168.1.')
    )
}

/**
 * URL prefix for in-store links given the current host + slug. Empty on a custom
 * domain; "/store/{slug}" on the platform host. Never has a trailing slash.
 */
export function storeBasePath(host: string, slug: string): string {
    return isCustomDomainHost(host) ? '' : `/store/${slug}`
}
