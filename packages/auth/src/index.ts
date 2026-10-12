// lib/auth/index.ts
// Selects the active auth provider (WorkOS AuthKit). To swap providers, implement
// AuthProviderAdapter (./types) and change this single export.
export { workosProvider as provider } from './providers/workos'
export type { AuthUser, AuthSession, LoginEvent } from './types'
