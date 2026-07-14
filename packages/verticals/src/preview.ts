// @mcloud/verticals/preview
// The Editor renders the merchant's REAL site in an iframe with UNSAVED values.
// That means the storefront accepts (a) a section-config override on the URL and
// (b) theme values over postMessage. Both are containment problems: without them,
// a crafted URL would let anyone hand a merchant's customers a restyled, re-worded
// version of their own site.
//
// It lives here, not in either app, because BOTH ends of the handshake need it:
// the admin MINTS the token (apps/web) and the storefront VERIFIES it
// (apps/storefront). A shared secret verified by two copies of the algorithm is a
// bug waiting to happen.
//
// Exposed as a SUBPATH (@mcloud/verticals/preview), not from the package barrel,
// so that `node:crypto` never enters the module graph of a client component that
// only wanted a type from @mcloud/verticals.
//
// Pure (no Next/DB) so it is unit-testable.

import { createHmac, timingSafeEqual } from 'node:crypto'

/** A short-lived token proving the bearer may preview THIS store. */
export function signPreview(storeId: string, secret: string): string {
  const exp = Date.now() + 30 * 60 * 1000 // 30 minutes
  const payload = `${storeId}.${exp}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return `${exp}.${sig}`
}

export function verifyPreview(token: string, storeId: string, secret: string): boolean {
  if (!token) return false
  const [expStr, sig] = token.split('.')
  if (!expStr || !sig) return false

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false

  const expected = createHmac('sha256', secret).update(`${storeId}.${exp}`).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Is this safe to write into a CSS custom property? Colours, font names, lengths
 * and numbers only. Anything that could break out of the property value, or that
 * smuggles a url()/expression(), is rejected.
 */
export function isSafeCssValue(value: string): boolean {
  if (typeof value !== 'string' || value.length > 60) return false
  if (/[;{}<>()\\"']/.test(value)) return false
  return /^(#[0-9a-fA-F]{3,8}|[A-Za-z0-9 ]{1,60}|\d{1,3}(px|rem|em|%)?|\d(\.\d+)?)$/.test(value)
}
