// @mcloud/auth/standalone
// Session API for apps that only need WorkOS identity (nuru). No legacy Auth0
// linking and AuthUser.id is always the WorkOS user id. Never import ./index,
// ./legacy-link or the db package from here: standalone-imports.test.ts pins it.
import { createAuthApi } from './api'
import { createWorkosProvider } from './providers/workos'

const api = createAuthApi(createWorkosProvider({ canonicalId: 'workos' }))

/** Resolve the current session. Pass `req` from API routes / middleware. */
export const getSession = api.getSession

/** Resolve a session from a raw provider access token (bearer). */
export const getSessionFromToken = api.getSessionFromToken

/** Resolve a session from the `Authorization: Bearer <token>` header; null when missing or invalid. */
export const getMobileSession = api.getMobileSession

/** Resolve session + middleware headers once per request, for the app middleware. */
export const prepareMiddleware = api.prepareMiddleware
