/**
 * Where the storefront sends people to sign in or up, in ONE place.
 *
 * Today sign-in lives on the web app and the session cookie is shared over
 * WORKOS_COOKIE_DOMAIN, so every login/signup link points at the web origin and returns
 * with an app-relative path (web forwards `/start` and store settings URLs back here; see
 * apps/web/proxy.ts). When the storefront moves to its own domain the cookie is no longer
 * shared and this file is the seam: point NEXT_PUBLIC_AUTH_ORIGIN at the storefront's own
 * origin once it hosts /auth/* itself. See docs/storefront-domain-move.md.
 */
import { LOGIN_URL, SIGNUP_URL, sanitizeRelativePath } from '@mcloud/auth/routes'
import { webAppOrigin } from '@/lib/host'

/** Origin that hosts the sign-in screens. Defaults to the web app. */
export function authOrigin(): string {
    const explicit = process.env.NEXT_PUBLIC_AUTH_ORIGIN
    if (explicit) return new URL(explicit).origin
    return webAppOrigin()
}

/** Default landing page after sign-in: the store picker / onboarding decision. */
export const AFTER_LOGIN = '/start'

/** Safe app-relative return path from untrusted input (e.g. a ?next= param). */
export function safeNext(value: unknown, fallback: string = AFTER_LOGIN): string {
    return sanitizeRelativePath(value, fallback)
}

function withReturn(path: string, returnTo: string): string {
    const url = new URL(path, authOrigin())
    url.searchParams.set('returnTo', safeNext(returnTo))
    return url.toString()
}

export function loginHref(returnTo: string = AFTER_LOGIN): string {
    return withReturn(LOGIN_URL, returnTo)
}

export function signupHref(returnTo: string = AFTER_LOGIN): string {
    return withReturn(SIGNUP_URL, returnTo)
}
