// lib/auth/index.ts
// Selects the active auth provider. Flip this single line to switch providers.
//   Auth0:  export { auth0Provider as provider } from './providers/auth0'
//   WorkOS: export { workosProvider as provider } from './providers/workos'
export { workosProvider as provider } from './providers/workos'
export type { AuthUser, AuthSession, LoginEvent } from './types'
