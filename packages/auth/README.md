# @mcloud/auth

Provider-agnostic authentication for both apps. The only adapter is WorkOS AuthKit
(`src/providers/workos.ts`); apps import the wrapper, never the provider SDK.

| Import | Gives you |
|---|---|
| `@mcloud/auth/server` | `getSession(req?)`, `getMobileSession(req)` (bearer), `prepareMiddleware`, `authMiddleware` |
| `@mcloud/auth/callback` | `ensureUserRow` (mirror the identity into `users`), post-login redirect logic |
| `@mcloud/auth/routes` | `LOGIN_URL`, `loginUrlWithReturn()`: never hard-code auth paths |
| `@mcloud/auth/management` | Account/session management used by the account pages |
| `@mcloud/auth/provider` | Client `<AuthProvider>` |
| `@mcloud/auth/types` | `AuthUser`, `AuthSession`, `AuthProviderAdapter` |

Notes: `AuthUser.id` is the WorkOS `externalId` when present (the legacy `auth0|…` id) so
existing foreign keys keep matching; do not remove that mapping (`mapUser`, `ensureLinked`)
before every user is linked. See [docs/architecture.md](../../docs/architecture.md#authentication).
