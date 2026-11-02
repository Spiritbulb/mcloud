// lib/auth/index.ts
// Selects the active auth provider (WorkOS AuthKit). To swap providers, implement
// AuthProviderAdapter (./types) and change this single export.
// Web and storefront: legacy Auth0 linking on, externalId-first ids (AGENTS.md "Identity").
import { createWorkosProvider } from './providers/workos'
import { ensureLinked } from './legacy-link'

export const provider = createWorkosProvider({ link: ensureLinked, canonicalId: 'external' })
export type { AuthUser, AuthSession, LoginEvent } from './types'
