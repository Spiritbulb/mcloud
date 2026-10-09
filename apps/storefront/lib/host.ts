/**
 * Host classification shared by the middleware (proxy.ts) and server components.
 *
 * A "platform host" is the menengai.cloud family or local dev. Anything else is a
 * merchant's own custom domain, where the storefront is white-labelled: the
 * internal store slug must never appear in a URL, so in-store links are bare
 * ("/cart") rather than slug-prefixed ("/store/{slug}/cart").
 */
/**
 * Platform apex domains. Migrating menengai.cloud → mcloud.co.ke; both point at
 * prod during the transition, so either (and any subdomain) counts as a platform
 * host. Drop menengai.cloud here once the migration completes.
 */
const PLATFORM_APEX_DOMAINS = ['mcloud.co.ke'] as const

export function isPlatformHost(host: string): boolean {
    return (
        PLATFORM_APEX_DOMAINS.some(
            (apex) => host === apex || host.endsWith(`.${apex}`),
        ) ||
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

/**
 * Absolute origin of the merchant web app (where /org/* lives). The storefront
 * runs on its own / custom domains, so any link into merchant settings must be
 * absolute — a relative redirect would stay on the storefront host. Derived from
 * the API base URL by dropping the trailing "/api". No trailing slash.
 */
export function webAppOrigin(): string {
    // Explicit origin wins. NEXT_PUBLIC_API_BASE_URL is only a fallback: on the web app
    // it is a relative "/api", which has no origin and made new URL() throw (a 500 in
    // the proxy for every unauthenticated /org request).
    const explicit = process.env.NEXT_PUBLIC_WEB_ORIGIN
    if (explicit) return new URL(explicit).origin
    const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
    if (/^https?:\/\//.test(api)) return new URL(api).origin
    return 'https://mcloud.co.ke'
}

/**
 * Absolute URL on the web app for a path that only it serves (login/logout, the org
 * hub, billing, the marketing site). Settings pages run on the platform host, so a
 * bare "/auth/logout" would 404 here. Client-safe: reads only NEXT_PUBLIC_* config.
 */
export function webUrl(path: string): string {
    return new URL(path, webAppOrigin()).toString()
}

/** Origin of the platform host that serves /org/* (settings). Not a merchant custom domain. */
export function platformOrigin(): string {
    return process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://app.mcloud.co.ke'
}
