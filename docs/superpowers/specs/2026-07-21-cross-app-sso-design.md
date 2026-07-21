# Cross-app SSO design

**Date:** 2026-07-21
**Repos:** `mcloud-1` (MCloud, the engine) and `spiritbulb` (spiritb.uk, the parent hub)
**Status:** approved design, ready for implementation plan

## Goal

One real account across the Spiritbulb ecosystem. A user who signs in once should be
authenticated across:

1. **spiritb.uk subdomains** — nuru / reach / tufike / parent hub share a single login.
2. **spiritb.uk → mcloud.co.ke** — clicking through to MCloud lands the user already
   signed in.
3. **mobile → mcloud.co.ke** — the mobile app opens web pages (orders, events) in an
   in-app browser, already signed in, on a hot path used many times per session.

This is **session sharing across origins**, not enterprise IdP SSO (WorkOS Connections).
All three apps already authenticate the same human against the **same WorkOS user** —
spiritbulb has no identity store of its own; it calls MCloud's `/api/partner/auth/verify`
and gets back a real WorkOS token pair. What is not shared is the **session cookie**,
because `spiritb.uk` and `mcloud.co.ke` are different registrable domains.

## Core principle: MCloud is the only identity authority

Nothing but MCloud mints a session. Spiritbulb and mobile are **clients** that can *ask*
MCloud for a short-lived handoff ticket by presenting proof of an already-authenticated
user. MCloud verifies that proof and decides whether to grant a ticket. The ticket is an
opaque random string; **no WorkOS token ever appears in a URL, browser history, or
referrer.**

This bounds the blast radius. A leak of the partner secret lets an attacker *call* the
handoff endpoint, but they still must present a **valid access token for a real user** to
get a session. The secret alone is not enough to conjure a session. (A stateless signed-JWT
handoff was rejected precisely because there the secret alone would be total account
takeover.)

## The three flows collapse into two mechanisms

| Flow | Auth at the mint | Where the work is |
|---|---|---|
| subdomain SSO | none — it's a cookie `Domain` attribute | §1 (cookie rework) |
| spiritb.uk → mcloud | partner secret + user's access token | new partner mint route |
| mobile → mcloud | bearer access token (no secret) | new mobile mint route |

The two cross-domain flows differ **only at the mint**. Both produce a ticket in the same
table and are redeemed by the same MCloud route. Mobile cannot use the partner secret
(anything in an app binary is public), so it authenticates the way it already does on every
`/api/mobile/*` route: with its bearer access token.

---

## §1 — Spiritbulb session rework (prerequisite)

This is strictly a fix, not the SSO feature, but SSO cannot work without it.

### Current state (the problem)

- `app/api/auth/verify-code/route.ts` sets `sb_session` = the **raw WorkOS access token**,
  `maxAge` **30 days**. The `refreshToken` and `expiresIn` returned by
  `verifyCode` are **discarded**.
- A WorkOS access token lives ~5 minutes. The cookie claims 30 days and cannot be
  refreshed (no refresh token kept). So the cookie outlives its token by orders of
  magnitude.
- `proxy.ts` gates `/home` on `hasSession()` — a **non-empty-string check**, not
  verification. Today `document.cookie = "sb_session=x"` would pass the gate.

This is tolerable only while `/home` is a static tile page. It becomes a real hole the
moment `/home` is a dock surfacing org data (the confirmed direction), and MCloud would
**reject the stale access token at handoff** anyway (MCloud verifies signatures via JWKS),
so nearly every handoff would fail for a cookie more than a few minutes old.

### Target state

Match the pattern AuthKit already uses for MCloud web (`saveSession` sealing the token pair
into a cookie):

- **One** `httpOnly`, `Secure`, `SameSite=Lax`, **AES-GCM-encrypted** cookie holding
  `{ accessToken, refreshToken, expiresAt }`. Encrypted, not merely signed, because it holds
  a refresh token (a long-lived bearer credential).
- `Domain=.spiritb.uk` so nuru / reach / tufike / parent all read it. **This is flow #1
  (subdomain SSO), done in the same change.**
- A server-side `getSession()` helper: decrypt the cookie; if `expiresAt` has passed,
  refresh against WorkOS and re-seal the cookie; return the verified session. The `/home`
  gate verifies a session instead of noticing a cookie exists.
  - **Refresh mechanism:** there is no server-side refresh path in MCloud's
    `packages/auth` today — mobile refreshes client-side via `AuthSession.refreshAsync`,
    which spiritbulb (a server) cannot reuse. So spiritbulb refreshes by POSTing its stored
    refresh token to WorkOS's token endpoint
    (`https://api.workos.com/user_management/authenticate`, `grant_type=refresh_token`,
    with `WORKOS_CLIENT_ID`). This is a spiritbulb-local helper; it does **not** touch
    MCloud. It needs `WORKOS_CLIENT_ID` available to spiritbulb (add to env). Verifying the
    *access* token's signature is not required on spiritbulb — MCloud re-verifies it at
    handoff via JWKS — so spiritbulb can treat a non-expired `expiresAt` as valid and only
    call WorkOS when it lapses.
- If refresh fails, **clear the cookie** and send the user to re-login rather than leaving a
  half-state.
- Cookie life drops from 30 days to **7 days**. With an encrypted-cookie model there is no
  instant server-side revocation; a shorter window is the accepted tradeoff, and the access
  token's own short expiry is the real gate.

### Encryption key

A new spiritbulb env var (e.g. `SESSION_ENC_KEY`, 32 bytes base64) for AES-GCM. Fails
closed if unset — no plaintext-cookie fallback.

---

## §2 — The handoff ticket (MCloud)

New Supabase table in MCloud, `auth_handoff_tickets`:

| column | type | purpose |
|---|---|---|
| `id` | text (PK) | opaque random token, 32 bytes base64url — the value in the URL |
| `user_id` | text | canonical `AuthUser.id` (survives the `externalId` continuity seam) |
| `redirect_to` | text | relative path to land on, e.g. `/stores/acme/orders/123` |
| `expires_at` | timestamptz | `now() + 60 seconds` |
| `used_at` | timestamptz \| null | null until redeemed — **single-use** |
| `created_at` | timestamptz | default `now()`, for sweeping |

- **Must be a table, not an in-memory map.** On Vercel the mint and the redeem can land on
  different serverless instances; an in-process store would lose the ticket between the two
  calls.
- **Redemption is an atomic conditional update:**
  `UPDATE ... SET used_at = now() WHERE id = $1 AND used_at IS NULL AND expires_at > now()
  RETURNING user_id, redirect_to`. A replay races and loses (0 rows) rather than
  double-redeeming.
- **Service-role access only** — consistent with the route-everything / no-anon-table
  direction. No RLS-exposed anon path.
- **Sweeping:** delete `where expires_at < now() - interval '1 day'` opportunistically on
  write (or a scheduled job). Rows are tiny and short-lived.

---

## §3 — Routes (MCloud)

Three new routes.

### `POST /api/partner/auth/handoff` — spiritbulb mint

- Auth: existing `requirePartnerSecret(req)` **plus** the user's access token in the body.
- MCloud verifies the token with the existing `getSessionFromToken` (JWKS path) to resolve
  `user_id`. Only then mints. The secret alone is insufficient.
- Body: `{ accessToken, redirectTo }`.
- Rate-limited like the other partner auth routes (hot path once orders/events open on web).

### `POST /api/mobile/auth/handoff` — mobile mint

- Auth: existing `requireMobileUser(req)` (bearer access token). **No secret.**
- Body: `{ redirectTo }` — `user_id` comes from the bearer identity.
- Rate-limited like the other mobile auth routes.

Both mint routes:

- **Validate `redirectTo`** is a safe relative path: must start with a single `/`, reject
  `//` (protocol-relative), reject any `scheme:` and backslashes, reject `/../` traversal.
  This is the open-redirect guard — a fresh MCloud session cookie is a valuable place to be
  redirected from. Default to `/` if absent or invalid.
- Return `{ url }` = `https://mcloud.co.ke/auth/handoff?ticket=<id>`.

### `GET /auth/handoff?ticket=…` — redeem (MCloud web)

- Atomically consume the ticket (the conditional update above).
- On success: load the user, call AuthKit `saveSession` to set MCloud's **normal** session
  cookie, then **302 to `redirect_to`**.
- On any failure (unknown / expired / already-used ticket): 302 to the normal MCloud login
  page. **Never** explain why; **never** echo the ticket back.

---

## §4 — End-to-end data flow

**Mobile, tapping "view this order on web":**

1. App: `POST /api/mobile/auth/handoff { redirectTo: "/stores/acme/orders/123" }` with its
   bearer token.
2. MCloud verifies the bearer, mints a ticket, returns
   `https://mcloud.co.ke/auth/handoff?ticket=abc…`.
3. App opens that URL in a Custom Tab / `SFSafariViewController` (**in-app browser** — the
   user stays in the app; the confirmed choice).
4. MCloud atomically consumes the ticket, sets its session cookie, 302s to
   `/stores/acme/orders/123`.
5. User sees the order, authed, in the in-app browser.

**Spiritbulb → MCloud** is identical with the mint swapped: the spiritbulb server calls the
partner route with the user's access token (from the decrypted `sb_session` cookie), then
302s the browser to the returned `url`.

No WorkOS token appears in any URL, history entry, or referrer at any step.

---

## §5 — Error handling

- All redeem failures collapse to "you're not signed in" — a redirect to login, never a
  diagnostic. Expired, used, and unknown tickets are indistinguishable to the caller.
- Mint failures: missing/wrong partner secret → 401; missing/wrong bearer → 401; valid
  secret/bearer but invalid access token → 401; invalid `redirectTo` → coerced to `/`, not
  an error.
- Rate-limit exceeded → 429, matching the existing auth routes.
- Spiritbulb `getSession` refresh failure → clear cookie, force re-login.

---

## §6 — Testing

Following the repos' existing route-test patterns (the auth routes already have tests).

**MCloud — redeem (the critical path):**

- **Replay:** redeem a ticket twice; the second redemption must fail. (Most important test.)
- Expired ticket must fail.
- Unknown ticket must fail.
- Successful redeem sets the session cookie and redirects to `redirect_to`.

**MCloud — `redirectTo` validation (open-redirect guard):**

- `//evil.com`, `https://evil.com`, `/\evil.com`, and `/../foo` must all be rejected/coerced
  to `/`.
- A normal path like `/stores/acme/orders/123` passes through.

**MCloud — mint routes:**

- Partner: missing secret → 401; valid secret + bad access token → 401; both good → ticket.
- Mobile: missing bearer → 401; valid bearer → ticket.

**Spiritbulb — session:**

- Encrypt/decrypt round-trip of `{ accessToken, refreshToken, expiresAt }`.
- Expired `expiresAt` triggers a refresh and re-seals the cookie.
- Failed refresh clears the cookie.
- `/home` gate rejects a missing/undecryptable cookie.

---

## Env vars

| var | repo | purpose |
|---|---|---|
| `SESSION_ENC_KEY` | spiritbulb | 32-byte base64 AES-GCM key for the session cookie. Fails closed if unset. |
| `WORKOS_CLIENT_ID` | spiritbulb | needed by the spiritbulb-local token refresh call to WorkOS. |
| `PARTNER_AUTH_SECRET` | both (existing) | already shared; the partner mint reuses it. |

## Out of scope

- Enterprise IdP SSO (WorkOS Connections / customer Okta/Entra) — a different, paid product
  surface, not session handoff.
- Instant server-side revocation of spiritbulb sessions — deliberately traded away for the
  no-infrastructure encrypted-cookie model; mitigated by the 7-day cookie + short access
  token expiry.
- System-browser handoff on mobile — in-app browser was chosen.

## Related memory

- `project_cross_app_sso` — the original deferred Version A spec this realizes.
- `project_partner_auth_endpoint` — the secret-gated partner route this extends.
- `project_spiritbulb_dashboard` — why `/home` becoming an org-data dock makes §1 load-bearing.
