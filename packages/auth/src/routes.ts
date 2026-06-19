// lib/auth/routes.ts
// Auth route URLs in one place so provider-specific paths (Auth0's /auth/* vs
// WorkOS's /callback) stay swappable. Importers must not hardcode these literals.
export const LOGIN_URL = '/auth/login'
export const LOGOUT_URL = '/auth/logout'
export const SIGNUP_URL = '/auth/sign-up'
export const CALLBACK_PATH = '/auth/callback'

/** Prefix the provider's middleware owns (login/logout/callback handshake). */
export const AUTH_ROUTE_PREFIX = '/auth/'

/**
 * Login URL that returns the user to `returnTo` after authenticating. The auth
 * middleware reads ?returnTo and threads it through the provider handshake, so
 * any gate that wants the user back where they started must use this rather than
 * a bare LOGIN_URL redirect. `returnTo` must be an app-relative path.
 */
export function loginUrlWithReturn(returnTo: string): string {
    return `${LOGIN_URL}?returnTo=${encodeURIComponent(returnTo)}`
}
