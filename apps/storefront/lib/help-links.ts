// Which page of the docs (mcloud.co.ke/docs) explains each settings tab. Settings page headers and
// the Overview setup checklist both read this, so a page and its checklist step never point at
// different docs. Tested in help-links.test.ts.

import { webUrl } from './host'

/** Every doc page and guide on web that a help link may point at. */
export const DOC_PATHS: readonly string[] = [
    '/docs/analytics', '/docs/billing', '/docs/blog', '/docs/customers', '/docs/delivery',
    '/docs/domain', '/docs/editor', '/docs/general', '/docs/members', '/docs/orders',
    '/docs/overview', '/docs/payments', '/docs/products', '/docs/reach', '/docs/services',
    '/docs/socials', '/docs/tracking',
    '/docs/guides/accept-mpesa-payments-on-your-website',
    '/docs/guides/collect-donations-online-for-your-ngo',
    '/docs/guides/custom-domain-for-your-business-website',
    '/docs/guides/start-an-online-shop-in-kenya',
]

/** Settings tab (the URL segment after /settings/) → doc path. */
export const HELP_DOCS: Readonly<Record<string, string>> = {
    products: '/docs/products',
    orders: '/docs/orders',
    customers: '/docs/customers',
    payments: '/docs/payments',
    logistics: '/docs/delivery',
    general: '/docs/general',
    brand: '/docs/general',
    domain: '/docs/domain',
    editor: '/docs/editor',
    analytics: '/docs/analytics',
    blog: '/docs/blog',
    members: '/docs/members',
    services: '/docs/services',
    tracking: '/docs/tracking',
    reach: '/docs/reach',
    social: '/docs/socials',
}

export function helpPath(tab: string): string | null {
    return Object.hasOwn(HELP_DOCS, tab) ? HELP_DOCS[tab] : null
}

/** Absolute docs URL for `path` (docs are served by web, not the storefront). */
export function docUrl(path: string): string {
    return webUrl(path)
}

/** The `help` prop for a settings PageHeader, or undefined when the tab has no doc. */
export function helpFor(tab: string): { href: string; label: string } | undefined {
    const path = helpPath(tab)
    return path ? { href: docUrl(path), label: 'Help' } : undefined
}
