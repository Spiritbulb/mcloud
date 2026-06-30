# Web magic-code login (no AuthKit redirect)

**Date:** 2026-06-21
**Status:** Approved, ready for implementation

## Goal

Replace web's AuthKit hosted-login redirect with in-app WorkOS Magic Auth — email →
6-digit code → session — mirroring what mobile already does. Web is its own API; no
bounce to WorkOS's hosted login page.

## Background

- Mobile dropped the AuthKit browser/OAuth redirect for WorkOS Magic Auth. The auth
  provider already exposes `sendMagicCode(email)` and `verifyMagicCode(email, code)`
  (`packages/auth/src/providers/workos.ts`), and mobile drives them via
  `/api/mobile/auth/send-code` and `/api/mobile/auth/verify`.
- Web today redirects `/auth/login` and `/auth/sign-up` to WorkOS via `getSignInUrl` /
  `getSignUpUrl` (in the provider `middleware`), landing back on `/callback`.
- Web uses authkit-nextjs's encrypted **cookie** session (read by `withAuth()` /
  `prepareMiddleware`), whereas mobile uses bearer tokens. The bridge between a
  magic-auth token pair and the web cookie is authkit-nextjs's documented
  `saveSession(sessionOrResponse, request)`, intended for exactly this custom-flow case.

## Architecture

### Session seam

`verifyMagicCode` authenticates with WorkOS and yields the token pair + user. The web
verify route then calls `saveSession(session, req)` to seal that into the same encrypted
cookie `withAuth()` already reads. Nothing downstream changes — gating, `getSession`,
`prepareMiddleware` all continue to work unchanged.

To keep the provider abstraction intact (no WorkOS types leaking into the route), the
verify route constructs the authkit `Session` shape from the provider's returned tokens
+ user. The provider's `verifyMagicCode` already returns `{ accessToken, refreshToken,
expiresIn, user }`; `saveSession` accepts a `Session` (not only a raw
`AuthenticationResponse`).

### New web auth API routes (web-owned, parallel to `/api/mobile/auth/*`)

- `POST /api/auth/send-code` `{ email }`
  - Calls `sendMagicCode(email)`. Always responds `200 { ok: true }` (no enumeration).
  - Rate-limited per email + per IP via the shared limiter.
- `POST /api/auth/verify` `{ email, code, returnTo? }`
  - **Rate-limited** per email + IP (verify-attempt cap) — see Security.
  - Calls `verifyMagicCode(email, code)`. On failure → `400`.
  - On success: `saveSession(session, req)` to set the cookie, then returns
    `{ ok: true, next }` where `next` = sanitized `returnTo` or `/auth/post-login`.
  - User-row provisioning is NOT done here — the client redirects to `/auth/post-login`,
    whose `onAuthenticated` already upserts the users row and routes to org/onboarding.

These routes are same-origin form posts. They set a cookie, so they must not be usable
cross-origin (see Security).

### Shared rate limiter

`apps/web/app/api/mobile/auth/_ratelimit.ts` is moved to a shared location both the
mobile and web auth routes import (e.g. `apps/web/app/api/_auth-ratelimit.ts` or a small
`@mcloud/auth` export). Add a `allowMagicVerify(email, ip)` alongside the existing
`allowMagicSend`, with a tighter cap for verification attempts.

## UI

- **`/auth/login`** becomes a two-step client form (email → code), replacing the current
  "Get back in" redirect button. Uses `@mcloud/ui` components, matches existing styling.
  Reads an optional `returnTo` from the query string and forwards it to `/api/auth/verify`.
  On verify success → `router.push(next)`.
- **`/auth/sign-up`** keeps its own page with "Create account" wording, using the same
  two-step flow (Magic Auth is one flow for sign-in and sign-up). Lands on
  `/auth/post-login` like login.
- **`LoginForm`** (`apps/web/components/login-form.tsx`, used inline e.g. on the homepage)
  is updated to the new two-step flow.

## Removed

- The `LOGIN_URL` / `SIGNUP_URL` redirect branches in the provider `middleware`
  (`getSignInUrl` / `getSignUpUrl` → WorkOS). They no longer redirect off-site.
- `/callback` route stays (harmless; only exercised if any external OAuth remains).

## Security (folded into this work)

1. **Verify brute-force.** A 6-digit code is 10^6 combinations. The new
   `/api/auth/verify` gets a per-email+IP attempt limiter (small cap, e.g. 5/window).
   **Back-port** the same limiter to the existing `/api/mobile/auth/verify` (agreed in
   scope).
2. **CORS / cookie routes.** `proxy.ts` reflects any `Origin` with
   `Allow-Credentials: true` for all `/api/*`. The new cookie-setting web auth routes
   must not be usable cross-origin. Approach: these routes are same-origin posts; ensure
   they do not participate in the permissive credentialed-CORS reflection (e.g. don't
   emit the reflective CORS headers for the web auth routes, or require same-origin).
   Broader CORS allowlisting across `/api/*` is noted but out of scope here.
3. **`returnTo` open redirect.** Sanitize to same-origin relative paths only (must start
   with `/` and not `//` or a scheme). Otherwise fall back to `/auth/post-login`.

### Acceptable, noted (not in scope)

- In-memory rate limiter is per serverless instance (already documented in
  `_ratelimit.ts`); WorkOS limits are the real backstop. Swap to Upstash/Supabase only
  if distributed abuse appears.

### Already good

- Send-code is enumeration-safe (always 200).
- Bearer verification is real JWKS signature verification.
- `requireMobileUser` gates every mobile data route.

## Error handling

- Invalid/expired code → `400`; form shows "That code is invalid or expired. Request a
  new one." and allows resend.
- Rate-limited → `429`; form shows "Too many attempts. Please wait a few minutes."
- Network/server → generic retry message.

## Testing

- Unit: `returnTo` sanitization (relative ok; `//evil`, `https://evil`, etc. rejected);
  verify route maps `verifyMagicCode` → `saveSession` → `next` correctly (provider mocked);
  `allowMagicVerify` cap behavior.
- Manual (run-mcloud): real email → code → lands on org/onboarding; bad code shows error;
  resend works; `returnTo` honored for same-origin, ignored for off-origin.

## Out of scope

- Magic-link (clickable) flow — decided to use code entry, mirroring mobile.
- WorkOS Email Verification flow.
- Broad `/api/*` CORS allowlist redesign.
- Distributed (cross-instance) rate limiting.
