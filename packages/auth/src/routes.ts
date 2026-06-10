// lib/auth/routes.ts
// Auth route URLs in one place so provider-specific paths (Auth0's /auth/* vs
// WorkOS's /callback) stay swappable. Importers must not hardcode these literals.
export const LOGIN_URL = '/auth/login'
export const LOGOUT_URL = '/auth/logout'
export const SIGNUP_URL = '/auth/sign-up'
export const CALLBACK_PATH = '/auth/callback'

/** Prefix the provider's middleware owns (login/logout/callback handshake). */
export const AUTH_ROUTE_PREFIX = '/auth/'
