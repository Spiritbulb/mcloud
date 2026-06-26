/**
 * Storefront link helpers.
 *
 * A storefront is the *customer-facing* site. Inside the merchant TWA we never
 * want it to open in the app shell (it would wear the merchant chrome and sit
 * inside the app's verified scope). These helpers produce the canonical public
 * URL and force the link to open in the real browser / Custom Tab instead.
 *
 * Storefront URLs use the shop.mcloud.co.ke/{slug} structure. The /s/{slug}
 * form is kept as the TWA shortlink because it's out-of-scope for the Android
 * shell, causing it to open in the real browser, which then lands on shop.*.
 */

const SHOP_ORIGIN = "https://shop.mcloud.co.ke"

/** Absolute, canonical public URL for a store's storefront. */
export function storefrontUrl(slug: string): string {
  return `${SHOP_ORIGIN}/${slug}`
}

/** Display form (no scheme) for showing the link in the UI. */
export function storefrontDisplayUrl(slug: string): string {
  return `shop.mcloud.co.ke/${slug}`
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
