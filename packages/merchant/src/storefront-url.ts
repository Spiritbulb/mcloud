/**
 * Storefront link helpers.
 *
 * A storefront is the *customer-facing* site. Inside the merchant TWA we never
 * want it to open in the app shell (it would wear the merchant chrome and sit
 * inside the app's verified scope). These helpers produce the canonical public
 * URL and force the link to open in the real browser / Custom Tab instead.
 *
 * Sites live at app.mcloud.co.ke/{slug}. The /s/{slug} form is kept as the TWA
 * shortlink because it's out-of-scope for the Android shell, causing it to open
 * in the real browser, which then lands on the canonical host.
 *
 * It used to be shop.mcloud.co.ke — retail-flavoured, and wrong for the NGOs and
 * portfolios the platform now hosts. `shop.` STILL RESOLVES and must keep doing
 * so: it is a live production origin, and every merchant link, QR code and shared
 * URL already out in the world points at it. Nothing is being turned off; `app.`
 * is simply what we mint and display from now on.
 *
 * THIS IS THE ONLY PLACE THE HOST IS NAMED. It was hardcoded in eight files, which
 * is how a rename becomes a search-and-replace across the UI with a decent chance
 * of breaking a merchant's link to their own site. Import from here.
 */

// storefront-links.ts — stays 100% sync, safe for client components
import { subdomainOf } from './custom-domain'

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://app.mcloud.co.ke"

/**
 * The host a custom domain is served on. An apex (locdessence.com) is linked as www., which is how
 * it has always been linked; a subdomain (shop.example.com) as itself, since www.shop.example.com
 * does not exist.
 */
function customHost(customDomain: string): string {
  return subdomainOf(customDomain) ? customDomain : `www.${customDomain}`
}

export function storefrontUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customHost(customDomain)}`
  return`${SITE_ORIGIN}/${slug}`
}

/** The same address without the scheme, for showing to people. */
export function storefrontDisplayUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return customHost(customDomain)
  return `${SITE_ORIGIN.replace(/^https?:\/\//, "")}/${slug}`
}

/**
 * Absolute URL of a store's merchant settings. Settings are served by the storefront
 * app on the platform host (never a custom domain, where /org/* is a 404), so links
 * from the web app must point here directly instead of relying on the proxy forward.
 */
export function storeSettingsUrl(orgSlug: string, storeSlug: string, sub = ''): string {
  return `${SITE_ORIGIN}/org/${orgSlug}/${storeSlug}/settings${sub}`
}

/**
 * Absolute URL of a page the storefront serves itself (marketing, /start, /moving) on the
 * platform host. For links from the web app; never a merchant's custom domain.
 */
export function storefrontSiteUrl(path = '/'): string {
  return `${SITE_ORIGIN}${path}`
}

/** Display form for the host alone, e.g. in placeholder or prefix text. */
export function siteHost(): string {
  return SITE_ORIGIN.replace(/^https?:\/\//, "")
}

/**
 * Open a URL outside the current app shell. In a TWA an absolute, out-of-scope
 * URL with `noopener` is the reliable signal to hand off to the browser; the
 * `window.open` fallback covers cases where the anchor default is swallowed.
 */
export function openExternal(url: string): void {
  const win = window.open(url, "_blank", "noopener,noreferrer")
  // If the popup was blocked or returned null (some webviews), fall back to a
  // top-level navigation, which the TWA also delegates for out-of-scope URLs.
  if (!win) {
    window.location.href = url
  }
}
