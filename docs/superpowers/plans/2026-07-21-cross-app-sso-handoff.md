# Cross-App SSO Handoff (SSO PR 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an already-authenticated user carry their session across origins without re-login: spiritb.uk to mcloud.co.ke, and mobile to mcloud.co.ke web. MCloud mints a short-lived single-use ticket that seals the WorkOS token pair; the destination redeems it and calls `saveSession`.

**Architecture:** MCloud stays the sole identity authority. Two mint routes (partner-secret for spiritbulb, bearer for mobile) verify the caller and seal `{accessToken, refreshToken}` into an `auth_handoff_tickets` row keyed by a random id. The `/auth/handoff` redeem route atomically consumes the ticket, opens the sealed pair, and calls a new provider method `createSessionFromTokens` (which wraps `getUser` + `ensureLinked` + `saveSession`, keeping all WorkOS coupling in `workos.ts`). Tokens never appear in a URL. The spiritbulb side adds a mint-and-redirect handler and wires `ProductPage` launch links through it when authed.

**Tech Stack:** Next 16 (App Router), MCloud web on Vercel, Supabase (service-role), WorkOS AuthKit (`saveSession`, `getSessionFromToken`), `node:test`/`node:assert` for MCloud tests, Vitest for spiritbulb tests, Node `crypto.webcrypto` AES-GCM (no new dependency).

## Global Constraints

- **Two repos.** MCloud = `c:\Users\busie\mcloud-1` (branch `feat/cross-app-sso`). Spiritbulb = `c:\Users\busie\spiritbulb` (new branch `feat/sso-handoff`, off `main` which now has PR 1's session rework — confirm PR 1 is merged/available before Tasks 8-9).
- **MCloud tests use `node:test` + `node:assert/strict`** (see `apps/web/app/api/auth/_return-to.test.ts`), NOT vitest. Import with explicit `.ts` in test files per that example.
- **Spiritbulb tests use Vitest** (`describe/it/expect`, `@/` alias, `global.fetch` mock).
- **No new runtime dependency.** AES-GCM via Node `crypto.webcrypto`.
- **Reuse, do not reinvent:** `sanitizeReturnTo` from `apps/web/app/api/auth/_return-to.ts` is the open-redirect guard (pass a `/` fallback). `requirePartnerSecret`/`fail` from `apps/web/app/api/partner/_lib.ts`. `requireMobileUser`/`fail` from `apps/web/app/api/mobile/_lib.ts`. `createClient` from `@mcloud/db/server` (service role). `getSessionFromToken` via the provider.
- **Ticket rules:** id = 32 random bytes base64url; TTL 60s; single-use via atomic conditional UPDATE; `sealed_tokens` AES-GCM-encrypted with `HANDOFF_ENC_KEY`; service-role only.
- **Fail closed:** missing `HANDOFF_ENC_KEY` throws (no plaintext ticket). Every redeem failure redirects to the MCloud login page with no diagnostic and no ticket echo.
- **No em dashes in user-facing copy.**
- **Migrations:** plain SQL at repo-root `migrations/`, named `YYYYMMDD_name.sql`, with an explanatory header comment (match `20260718_backfill_home_pages.sql`). Idempotent.

## Migration application note

The migration in Task 1 is applied via the Supabase MCP `apply_migration` tool (or the dashboard) at execution time, since this repo applies migrations to the remote project. The SQL file in `migrations/` is the source of record.

---

## File Structure

**MCloud (`c:\Users\busie\mcloud-1`):**
- **Create** `migrations/20260721_auth_handoff_tickets.sql` — the ticket table.
- **Create** `apps/web/app/api/_handoff/crypto.ts` — `sealTokens()`/`openTokens()` AES-GCM over the pair. (`_`-prefixed dir so Next does not route it; per the memory note Next ignores `_`-prefixed route dirs.)
- **Create** `apps/web/app/api/_handoff/crypto.test.ts`
- **Create** `apps/web/app/api/_handoff/tickets.ts` — `mintTicket()` / `redeemTicket()` DB helpers (service-role, atomic redeem, sweep-on-write).
- **Create** `apps/web/app/api/_handoff/tickets.test.ts` — validation-level tests (the atomic SQL is integration-verified in Task 7, not unit-mocked).
- **Modify** `apps/web/app/api/_auth-ratelimit.ts` — add `allowHandoffMint(key, ip)`.
- **Create** `apps/web/app/api/partner/auth/handoff/route.ts` — spiritbulb mint.
- **Create** `apps/web/app/api/mobile/auth/handoff/route.ts` — mobile mint.
- **Create** `apps/web/app/auth/handoff/route.ts` — redeem (a Route Handler `GET`, not a page).
- **Modify** `packages/auth/src/providers/workos.ts` — add `createSessionFromTokens`.
- **Modify** `packages/auth/src/types.ts` — add the method to `AuthProviderAdapter`.
- **Modify** `packages/auth/src/server.ts` — export `createSessionFromTokens` passthrough.
- **Modify** `.env.example` (or MCloud env docs) — document `HANDOFF_ENC_KEY`.

**Spiritbulb (`c:\Users\busie\spiritbulb`):**
- **Modify** `lib/auth/mcloud-client.ts` — add `requestHandoff(tokens, redirectTo)` calling the partner mint.
- **Modify** `lib/auth/mcloud-client.test.ts`
- **Create** `app/go/mcloud/route.ts` — reads the session, requests a handoff, 302s to the returned MCloud url (or to MCloud login if not signed in).
- **Create** `app/go/mcloud/route.test.ts`
- **Modify** `components/ProductPage.tsx` — MCloud launch link points at `/go/mcloud?to=...` when authed.

---

## Task 1: Ticket table migration

**Files:**
- Create: `migrations/20260721_auth_handoff_tickets.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Cross-app SSO handoff tickets (SSO PR 2).
--
-- A short-lived, single-use ticket that carries an already-authenticated user's
-- session from one origin (spiritb.uk, or the mobile app's in-app browser) into
-- mcloud.co.ke web without re-login. The mint routes (partner-secret / bearer)
-- verify the caller, then seal the WorkOS {accessToken, refreshToken} pair into
-- `sealed_tokens` (AES-GCM, HANDOFF_ENC_KEY) and insert a row. The /auth/handoff
-- redeem route atomically consumes the row and calls saveSession. The ticket id
-- is the only thing that ever appears in a URL; the tokens never do.
--
-- Why sealed tokens and not a bare user_id: saveSession needs a full WorkOS
-- session triple from an auth event; there is no primitive to mint a cookie
-- session from a user_id alone. The mint side already holds real tokens.
--
-- Service-role only (no RLS policies added => with RLS enabled, anon/auth roles
-- get nothing; the service-role key used by the API bypasses RLS). Rows are tiny
-- and expire in 60s; a sweep runs opportunistically on insert.

create table if not exists public.auth_handoff_tickets (
  id            text primary key,
  sealed_tokens text        not null,
  redirect_to   text        not null default '/',
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- Redeem looks up by id (PK, already indexed). This index supports the sweep.
create index if not exists auth_handoff_tickets_expires_at_idx
  on public.auth_handoff_tickets (expires_at);

alter table public.auth_handoff_tickets enable row level security;
-- No policies: anon and authenticated get zero rows. The API uses the
-- service-role key, which bypasses RLS.
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase MCP `apply_migration` tool (name `auth_handoff_tickets`, the SQL above) or the dashboard. Then confirm with `list_tables` that `auth_handoff_tickets` exists with the six columns.
Expected: table present; RLS enabled; no policies.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/busie/mcloud-1
git add migrations/20260721_auth_handoff_tickets.sql
git commit -m "feat(sso): auth_handoff_tickets table"
```

---

## Task 2: Handoff token crypto

**Files:**
- Create: `apps/web/app/api/_handoff/crypto.ts`
- Test: `apps/web/app/api/_handoff/crypto.test.ts`

**Interfaces:**
- Produces:
  - `type HandoffTokens = { accessToken: string; refreshToken: string }`
  - `sealTokens(t: HandoffTokens): Promise<string>` — `base64url(iv).base64url(ct)`; throws if `HANDOFF_ENC_KEY` unset/not 32 bytes.
  - `openTokens(sealed: string): Promise<HandoffTokens | null>` — null on tamper/format; throws if key unset.

- [ ] **Step 1: Write the failing test**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sealTokens, openTokens } from './crypto.ts'

const KEY = Buffer.alloc(32, 9).toString('base64')
const sample = { accessToken: 'at_1', refreshToken: 'rt_1' }

test('round-trips a token pair', async () => {
  process.env.HANDOFF_ENC_KEY = KEY
  const sealed = await sealTokens(sample)
  assert.ok(!sealed.includes('at_1')) // opaque
  assert.deepEqual(await openTokens(sealed), sample)
})

test('returns null on a tampered blob', async () => {
  process.env.HANDOFF_ENC_KEY = KEY
  const sealed = await sealTokens(sample)
  const tampered = sealed.slice(0, -2) + (sealed.endsWith('AA') ? 'BB' : 'AA')
  assert.equal(await openTokens(tampered), null)
})

test('returns null on garbage', async () => {
  process.env.HANDOFF_ENC_KEY = KEY
  assert.equal(await openTokens('nope'), null)
})

test('throws when the key is missing', async () => {
  delete process.env.HANDOFF_ENC_KEY
  await assert.rejects(() => sealTokens(sample))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/busie/mcloud-1 && node --test --experimental-strip-types apps/web/app/api/_handoff/crypto.test.ts`
Expected: FAIL — cannot find `./crypto.ts`.
(If `--experimental-strip-types` is unavailable on the installed Node, use the repo's existing test invocation — check `package.json` `scripts.test` and mirror it. The `_return-to.test.ts` file runs the same way, so whatever runs that runs this.)

- [ ] **Step 3: Write the implementation**

```ts
// AES-256-GCM seal/open for the handoff ticket's WorkOS token pair. Mirrors the
// spiritbulb session-crypto approach; encrypts at rest so a DB read alone does
// not yield usable credentials. Node webcrypto, no dependency.
import { webcrypto as crypto } from 'node:crypto'

export type HandoffTokens = { accessToken: string; refreshToken: string }

function b64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}
function b64urlDecode(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, 'base64url'))
}

async function importKey(): Promise<CryptoKey> {
  const raw = process.env.HANDOFF_ENC_KEY
  if (!raw) throw new Error('HANDOFF_ENC_KEY is not set')
  const keyBytes = new Uint8Array(Buffer.from(raw, 'base64'))
  if (keyBytes.byteLength !== 32) throw new Error('HANDOFF_ENC_KEY must be 32 bytes (base64)')
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function sealTokens(t: HandoffTokens): Promise<string> {
  const key = await importKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const pt = new TextEncoder().encode(JSON.stringify(t))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt))
  return `${b64urlEncode(iv)}.${b64urlEncode(ct)}`
}

export async function openTokens(sealed: string): Promise<HandoffTokens | null> {
  const key = await importKey()
  try {
    const [ivPart, ctPart] = sealed.split('.')
    if (!ivPart || !ctPart) return null
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64urlDecode(ivPart) },
      key,
      b64urlDecode(ctPart),
    )
    return JSON.parse(new TextDecoder().decode(pt)) as HandoffTokens
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run the same command as Step 2.
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/busie/mcloud-1
git add apps/web/app/api/_handoff/crypto.ts apps/web/app/api/_handoff/crypto.test.ts
git commit -m "feat(sso): AES-GCM seal/open for handoff token pair"
```

---

## Task 3: Ticket mint/redeem DB helpers

**Files:**
- Create: `apps/web/app/api/_handoff/tickets.ts`
- Test: `apps/web/app/api/_handoff/tickets.test.ts`

**Interfaces:**
- Consumes: `sealTokens`/`openTokens`/`HandoffTokens` (Task 2); `createClient` from `@mcloud/db/server`; `sanitizeReturnTo` from `../auth/_return-to.ts`.
- Produces:
  - `mintTicket(tokens: HandoffTokens, redirectTo: unknown): Promise<string>` — sanitizes `redirectTo` (fallback `/`), seals tokens, inserts a row with a random id + `expires_at = now()+60s`, sweeps expired rows opportunistically, returns the id.
  - `redeemTicket(id: string): Promise<{ tokens: HandoffTokens; redirectTo: string } | null>` — atomic conditional consume; null when unknown/expired/used or the sealed pair fails to open.

- [ ] **Step 1: Write the failing test** (validation-level; DB is exercised in Task 7)

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newTicketId, safeRedirect } from './tickets.ts'

test('ticket id is url-safe and long', () => {
  const id = newTicketId()
  assert.match(id, /^[A-Za-z0-9_-]+$/)
  assert.ok(id.length >= 40) // 32 bytes base64url
  assert.notEqual(newTicketId(), newTicketId())
})

test('safeRedirect keeps a relative path', () => {
  assert.equal(safeRedirect('/stores/acme/orders/1'), '/stores/acme/orders/1')
})

test('safeRedirect rejects open-redirect attempts to /', () => {
  assert.equal(safeRedirect('//evil.com'), '/')
  assert.equal(safeRedirect('https://evil.com'), '/')
  assert.equal(safeRedirect('/\\evil.com'), '/')
  assert.equal(safeRedirect(undefined), '/')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/busie/mcloud-1 && node --test --experimental-strip-types apps/web/app/api/_handoff/tickets.test.ts`
Expected: FAIL — cannot find `./tickets.ts`.

- [ ] **Step 3: Write the implementation**

```ts
// Service-role DB helpers for the handoff tickets. mintTicket seals the token
// pair and inserts a 60s single-use row; redeemTicket atomically consumes it.
import { randomBytes } from 'node:crypto'
import { createClient } from '@mcloud/db/server'
import { sealTokens, openTokens, type HandoffTokens } from './crypto.ts'
import { sanitizeReturnTo } from '../auth/_return-to.ts'

const TTL_MS = 60_000

export function newTicketId(): string {
  return randomBytes(32).toString('base64url')
}

/** Sanitize an untrusted redirect to a same-origin relative path (fallback '/'). */
export function safeRedirect(value: unknown): string {
  return sanitizeReturnTo(value, '/')
}

export async function mintTicket(tokens: HandoffTokens, redirectTo: unknown): Promise<string> {
  const supabase = await createClient()
  const id = newTicketId()
  const sealed = await sealTokens(tokens)
  const now = Date.now()
  // Opportunistic sweep of long-expired rows (tiny, short-lived table).
  await supabase.from('auth_handoff_tickets').delete().lt('expires_at', new Date(now - 86_400_000).toISOString())
  const { error } = await supabase.from('auth_handoff_tickets').insert({
    id,
    sealed_tokens: sealed,
    redirect_to: safeRedirect(redirectTo),
    expires_at: new Date(now + TTL_MS).toISOString(),
  })
  if (error) throw new Error(`mintTicket insert failed: ${error.message}`)
  return id
}

export async function redeemTicket(
  id: string,
): Promise<{ tokens: HandoffTokens; redirectTo: string } | null> {
  const supabase = await createClient()
  // Atomic single-use consume: only rows still unused AND unexpired are updated,
  // and the update returns the row. A replay updates 0 rows.
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('auth_handoff_tickets')
    .update({ used_at: nowIso })
    .eq('id', id)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .select('sealed_tokens, redirect_to')
    .maybeSingle()
  if (error || !data) return null
  const tokens = await openTokens(data.sealed_tokens)
  if (!tokens) return null
  return { tokens, redirectTo: data.redirect_to }
}
```

Note on atomicity: Supabase/PostgREST executes the `UPDATE ... WHERE ... RETURNING` as one statement, so two concurrent redeems cannot both match the `used_at IS NULL` predicate — one updates the row, the other matches nothing. This is the single-use guarantee. Verified for real in Task 7.

- [ ] **Step 4: Run test to verify it passes**

Run the same command as Step 2.
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/busie/mcloud-1
git add apps/web/app/api/_handoff/tickets.ts apps/web/app/api/_handoff/tickets.test.ts
git commit -m "feat(sso): ticket mint/redeem DB helpers"
```

---

## Task 4: Provider method `createSessionFromTokens`

**Files:**
- Modify: `packages/auth/src/types.ts`
- Modify: `packages/auth/src/providers/workos.ts`
- Modify: `packages/auth/src/server.ts`

**Interfaces:**
- Produces: `createSessionFromTokens(tokens: { accessToken: string; refreshToken: string }, req: NextRequest): Promise<AuthUser | null>` on the provider and re-exported from `@mcloud/auth/server`. Loads the WorkOS user for the access token, links identity, saves the AuthKit cookie session, returns the mapped user (null on failure). Keeps all `saveSession`/WorkOS coupling inside `workos.ts`.

- [ ] **Step 1: Add the method to the adapter type** (`packages/auth/src/types.ts`)

Find the `AuthProviderAdapter` interface and add:
```ts
  /**
   * Establish a cookie session from an existing WorkOS token pair (SSO handoff).
   * Loads + links the user, saves the AuthKit session, returns the user or null.
   */
  createSessionFromTokens(
    tokens: { accessToken: string; refreshToken: string },
    req: NextRequest,
  ): Promise<AuthUser | null>
```
(If `NextRequest` is not already imported in types.ts, add `import type { NextRequest } from 'next/server'`.)

- [ ] **Step 2: Implement it in the WorkOS provider** (`packages/auth/src/providers/workos.ts`)

Add this method to the `workosProvider` object (mirrors `verifyMagicCodeWeb`, which already does `getUser`-equivalent + `ensureLinked` + `saveSession`):
```ts
    async createSessionFromTokens(
        tokens: { accessToken: string; refreshToken: string },
        req: NextRequest,
    ): Promise<AuthUser | null> {
        try {
            // Verify the access token and resolve the WorkOS user id from it.
            const { payload } = await jwtVerify(tokens.accessToken, jwks)
            const sub = typeof payload.sub === 'string' ? payload.sub : null
            if (!sub) return null
            const raw = (await getWorkOS().userManagement.getUser(sub)) as WorkOSUserish
            if (!raw) return null
            const user = await ensureLinked(raw)
            // Seal into the AuthKit cookie. Pass the RAW WorkOS user (see
            // verifyMagicCodeWeb) so withAuth() decodes the expected shape.
            await saveSession(
                { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: raw },
                req,
            )
            return mapUser(user)
        } catch {
            return null
        }
    },
```

- [ ] **Step 3: Re-export from server.ts** (`packages/auth/src/server.ts`)

```ts
import type { AuthSession, AuthUser, MiddlewarePrep } from './types'
// ...
/** Establish a cookie session from an existing WorkOS token pair (SSO handoff). */
export function createSessionFromTokens(
    tokens: { accessToken: string; refreshToken: string },
    req: NextRequest,
): Promise<AuthUser | null> {
    return provider.createSessionFromTokens(tokens, req)
}
```

- [ ] **Step 4: Typecheck the package**

Run: `cd c:/Users/busie/mcloud-1 && npx tsc --noEmit -p packages/auth/tsconfig.json` (or the repo's typecheck for the package; if none, the app build in Task 8 covers it).
Expected: no errors from the added method. (The other provider, `auth0.ts`, must also implement the method or the type won't be satisfied — add a stub there returning `null` with a comment, since Auth0 is not the active provider.)

- [ ] **Step 5: Add the auth0 stub** (`packages/auth/src/providers/auth0.ts`)

```ts
    // Auth0 is not the active provider; SSO handoff is WorkOS-only. Stub to satisfy
    // the adapter type.
    async createSessionFromTokens(): Promise<null> {
        return null
    },
```

- [ ] **Step 6: Commit**

```bash
cd c:/Users/busie/mcloud-1
git add packages/auth/src/types.ts packages/auth/src/providers/workos.ts packages/auth/src/providers/auth0.ts packages/auth/src/server.ts
git commit -m "feat(sso): provider createSessionFromTokens (WorkOS saveSession from a token pair)"
```

---

## Task 5: Rate-limit helper for the mint

**Files:**
- Modify: `apps/web/app/api/_auth-ratelimit.ts`

**Interfaces:**
- Produces: `allowHandoffMint(key: string, ip: string): boolean` — max 10 / 15 min per key and per ip (handoff is a hot path; looser than magic-code but still bounded).

- [ ] **Step 1: Add the export** (append to `_auth-ratelimit.ts`, reusing the existing `allow`/`hit` internals)

```ts
const HANDOFF_MAX = 10

/** True if a handoff mint is allowed (max 10 / 15 min per key and per ip). */
export function allowHandoffMint(key: string, ip: string): boolean {
  return allow('handoff', key, ip, HANDOFF_MAX)
}
```
(The existing `allow(prefix, email, ip, max)` treats its second arg as an opaque key; pass the user id or token-derived key as `key`. No signature change needed.)

- [ ] **Step 2: Typecheck**

Run: `cd c:/Users/busie/mcloud-1 && npx tsc --noEmit -p apps/web/tsconfig.json` (or rely on the Task 8 build).
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/busie/mcloud-1
git add apps/web/app/api/_auth-ratelimit.ts
git commit -m "feat(sso): rate-limit helper for handoff mint"
```

---

## Task 6: Mint routes (partner + mobile)

**Files:**
- Create: `apps/web/app/api/partner/auth/handoff/route.ts`
- Create: `apps/web/app/api/mobile/auth/handoff/route.ts`

**Interfaces:**
- Consumes: `requirePartnerSecret`/`fail` (`../../_lib`), `requireMobileUser`/`fail` (`../../_lib`), `mintTicket` (`../../../_handoff/tickets` / adjust depth), `allowHandoffMint`, `getSessionFromToken` via `@mcloud/auth/server` (partner route verifies the pair's access token), `MCLOUD_WEB_ORIGIN` env (or hardcode `https://mcloud.co.ke`).

- [ ] **Step 1: Partner mint route**

```ts
// POST /api/partner/auth/handoff  { accessToken, refreshToken, redirectTo }
//   header: x-partner-secret
// Verifies the caller (partner secret) AND that accessToken is a live WorkOS
// session, then seals the pair into a 60s single-use ticket and returns the
// redeem URL. spiritb.uk -> mcloud.co.ke handoff (flow #2).
import { NextResponse, type NextRequest } from 'next/server'
import { getMobileSession } from '@mcloud/auth/server' // reuses bearer->session? No — see note
import { fail, requirePartnerSecret } from '../../_lib'
import { mintTicket } from '../../../_handoff/tickets'
import { allowHandoffMint } from '../../../_auth-ratelimit'
import { workosProvider } from '@mcloud/auth/providers/workos' // if exported; else via server

const MCLOUD_ORIGIN = process.env.MCLOUD_WEB_ORIGIN ?? 'https://mcloud.co.ke'

export async function POST(req: NextRequest) {
  const denied = requirePartnerSecret(req)
  if (denied) return denied

  let body: { accessToken?: unknown; refreshToken?: unknown; redirectTo?: unknown }
  try { body = await req.json() } catch { return fail(400, 'Invalid request body') }

  const accessToken = typeof body.accessToken === 'string' ? body.accessToken : ''
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''
  if (!accessToken || !refreshToken) return fail(400, 'Tokens are required')

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown'

  // Verify the access token is a real live session before minting.
  const session = await getSessionFromTokenSafe(accessToken)
  if (!session) return fail(401, 'Unauthorized')

  if (!allowHandoffMint(session.user.id, ip)) return fail(429, 'Too many attempts.')

  const id = await mintTicket({ accessToken, refreshToken }, body.redirectTo)
  return NextResponse.json(
    { url: `${MCLOUD_ORIGIN}/auth/handoff?ticket=${id}` },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
```

Resolve `getSessionFromTokenSafe`: add a thin export to `@mcloud/auth/server`:
```ts
// packages/auth/src/server.ts
export function getSessionFromToken(token: string): Promise<AuthSession | null> {
    return provider.getSessionFromToken(token)
}
```
Then import `{ getSessionFromToken }` in the route and use it directly (drop the placeholder `getSessionFromTokenSafe`/`getMobileSession`/`workosProvider` import lines above — they were scaffolding; the final route imports only `fail`, `requirePartnerSecret`, `mintTicket`, `allowHandoffMint`, `getSessionFromToken`, `NextResponse`).

- [ ] **Step 2: Mobile mint route**

```ts
// POST /api/mobile/auth/handoff  { refreshToken, redirectTo }
//   header: Authorization: Bearer <accessToken>
// Bearer-authed (no secret). Seals the access token (from the header) + the
// refresh token (from the body, held on-device) into a ticket. mobile -> web.
import { NextResponse, type NextRequest } from 'next/server'
import { fail, requireMobileUser } from '../../_lib'
import { mintTicket } from '../../../_handoff/tickets'
import { allowHandoffMint } from '../../../_auth-ratelimit'

const MCLOUD_ORIGIN = process.env.MCLOUD_WEB_ORIGIN ?? 'https://mcloud.co.ke'

export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req)
  if (auth instanceof NextResponse) return auth

  const accessToken = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? ''
  let body: { refreshToken?: unknown; redirectTo?: unknown }
  try { body = await req.json() } catch { return fail(400, 'Invalid request body') }
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''
  if (!accessToken || !refreshToken) return fail(400, 'Tokens are required')

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown'
  if (!allowHandoffMint(auth.user.id, ip)) return fail(429, 'Too many attempts.')

  const id = await mintTicket({ accessToken, refreshToken }, body.redirectTo)
  return NextResponse.json(
    { url: `${MCLOUD_ORIGIN}/auth/handoff?ticket=${id}` },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
```

- [ ] **Step 3: Verify both routes compile via the app build**

Deferred to Task 8 (full build). No standalone unit test — the routes are thin wiring over Task 2/3/5 units already tested; end-to-end behavior is verified in Task 8.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/busie/mcloud-1
git add apps/web/app/api/partner/auth/handoff/route.ts apps/web/app/api/mobile/auth/handoff/route.ts packages/auth/src/server.ts
git commit -m "feat(sso): partner + mobile handoff mint routes"
```

---

## Task 7: Redeem route + single-use integration check

**Files:**
- Create: `apps/web/app/auth/handoff/route.ts`

**Interfaces:**
- Consumes: `redeemTicket` (Task 3), `createSessionFromTokens` (Task 4).

- [ ] **Step 1: Write the redeem route**

```ts
// GET /auth/handoff?ticket=... — redeem an SSO handoff ticket.
// Atomically consumes the ticket, opens the sealed WorkOS token pair, establishes
// the normal MCloud cookie session (saveSession), and 302s to redirect_to. Any
// failure (unknown/expired/used ticket, or an unopenable pair) redirects to the
// login page with no diagnostic and no ticket echo.
import { NextResponse, type NextRequest } from 'next/server'
import { redeemTicket } from '../../api/_handoff/tickets'
import { createSessionFromTokens } from '@mcloud/auth/server'

const LOGIN = '/auth/login'

export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get('ticket') ?? ''
  const loginUrl = new URL(LOGIN, req.nextUrl.origin)
  if (!ticket) return NextResponse.redirect(loginUrl)

  const redeemed = await redeemTicket(ticket)
  if (!redeemed) return NextResponse.redirect(loginUrl)

  // Establish the cookie session FIRST. saveSession (inside createSessionFromTokens)
  // writes the authkit cookie via Next's request-scoped cookies() store, exactly as
  // /api/auth/verify does — that route calls verifyMagicCodeWeb (which calls
  // saveSession) and then returns a plain NextResponse with NO manual cookie
  // attach. Next flushes the cookies() writes onto whatever response we return, so
  // the redirect below carries the session cookie automatically.
  const user = await createSessionFromTokens(redeemed.tokens, req)
  if (!user) return NextResponse.redirect(loginUrl)

  // Land on a relative path; redeemTicket already sanitized redirect_to at mint.
  const dest = new URL(redeemed.redirectTo, req.nextUrl.origin)
  return NextResponse.redirect(dest)
}
```

Verified (not a guess): `apps/web/app/api/auth/verify/route.ts` calls `verifyMagicCodeWeb(..., req)` (which calls `saveSession(..., req)`) and then simply returns `NextResponse.json(...)` with no manual `res.cookies.set`. AuthKit writes through the `cookies()` store and Next attaches it to the returned response. So calling `createSessionFromTokens` before returning the redirect is sufficient — no manual cookie flushing.

- [ ] **Step 2: Confirm `/auth/login` is the correct login path**

Grep for the login route: `cd c:/Users/busie/mcloud-1 && ls apps/web/app/auth`. If the login page lives elsewhere, set `LOGIN` to that path.

- [ ] **Step 3: Single-use integration check (real DB)**

After Task 8's server is up (or against a preview), mint a ticket by calling the partner route with a real token pair, then GET `/auth/handoff?ticket=<id>` twice. First redeems (302 to dest with a session cookie set); second redirects to `/auth/login` (already used). This is the critical replay guarantee and is verified live, not mocked.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/busie/mcloud-1
git add apps/web/app/auth/handoff/route.ts
git commit -m "feat(sso): /auth/handoff redeem route (single-use, saveSession)"
```

---

## Task 8: MCloud build + runtime verification

**Files:** none (verification).

- [ ] **Step 1: Full type/build**

Run: `cd c:/Users/busie/mcloud-1 && npx turbo build --filter=web` (or the repo's build command). 
Expected: build succeeds, all four new routes listed, middleware compiles.

- [ ] **Step 2: Run the MCloud auth test files**

Run the repo's test command (whatever runs `apps/web/app/api/auth/_return-to.test.ts`), confirming the new `_handoff/*.test.ts` pass.
Expected: crypto (4) + tickets (3) green.

- [ ] **Step 3: Runtime drive (invoke the `verify` skill)**

With `HANDOFF_ENC_KEY` set and a valid WorkOS token pair (obtain via a real magic-code login through `/api/mobile/auth/verify` in dev), exercise:
- Partner mint with a valid pair + `redirectTo: '/onboarding'` -> `{ url }`.
- GET that url -> 302 to `/onboarding` with a session cookie set.
- GET the same url again -> 302 to `/auth/login` (single-use holds).
- Mint with `redirectTo: '//evil.com'` -> redeem lands on `/` (open-redirect guard).
- Partner mint with no secret -> 401. Mobile mint with no bearer -> 401.
Kill any dev server started (by port PID; verify freed).

---

## Task 9 (spiritbulb repo): mint-and-redirect + ProductPage wiring

**Prerequisite:** PR 1's session rework is available on spiritbulb `main` (getSession, sealed cookie). Branch: `feat/sso-handoff` off `main`.

**Files:**
- Modify: `lib/auth/mcloud-client.ts` (+ test)
- Create: `app/go/mcloud/route.ts` (+ test)
- Modify: `components/ProductPage.tsx`

**Interfaces:**
- Produces:
  - `requestHandoff(tokens: { accessToken: string; refreshToken: string }, redirectTo: string): Promise<{ ok: boolean; url?: string; error?: string }>` in `mcloud-client.ts` — POSTs the partner handoff route with the secret header.
  - `GET /go/mcloud?to=<relative>` — reads the session; if signed in, requests a handoff and 302s to the returned MCloud url; else 302s to MCloud's public login.

- [ ] **Step 1: Test for `requestHandoff`** (append to `lib/auth/mcloud-client.test.ts`)

```ts
describe("requestHandoff", () => {
  it("returns the handoff url on success", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ url: "https://mcloud.co.ke/auth/handoff?ticket=abc" }), { status: 200 }),
    ) as unknown as typeof fetch;
    const res = await requestHandoff({ accessToken: "at", refreshToken: "rt" }, "/onboarding");
    expect(res.ok).toBe(true);
    expect(res.url).toContain("/auth/handoff?ticket=");
  });

  it("sends the partner secret header", async () => {
    const spy = vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) =>
      new Response(JSON.stringify({ url: "https://x/auth/handoff?ticket=abc" }), { status: 200 }));
    global.fetch = spy as unknown as typeof fetch;
    await requestHandoff({ accessToken: "at", refreshToken: "rt" }, "/x");
    expect((init => (init?.headers as Record<string,string>)["x-partner-secret"])(spy.mock.calls[0][1])).toBeTruthy();
  });

  it("returns not-ok on a non-2xx", async () => {
    global.fetch = vi.fn(async () => new Response("{}", { status: 401 })) as unknown as typeof fetch;
    const res = await requestHandoff({ accessToken: "at", refreshToken: "rt" }, "/x");
    expect(res.ok).toBe(false);
  });
});
```
(Set `MCLOUD_AUTH_BASE`/`PARTNER_AUTH_SECRET` in the existing `beforeEach`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run lib/auth/mcloud-client.test.ts`
Expected: FAIL — `requestHandoff` not exported.

- [ ] **Step 3: Implement `requestHandoff`** (append to `lib/auth/mcloud-client.ts`)

```ts
export async function requestHandoff(
  tokens: { accessToken: string; refreshToken: string },
  redirectTo: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch(`${base()}/handoff`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ ...tokens, redirectTo }),
      redirect: "error",
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.url) return { ok: false, error: d?.error ?? "Handoff failed." };
    return { ok: true, url: d.url };
  } catch {
    return { ok: false, error: "Network error." };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run lib/auth/mcloud-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Test for `/go/mcloud`** (`app/go/mcloud/route.test.ts`)

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE: "sb_session",
  getSession: vi.fn(),
}));
vi.mock("@/lib/auth/mcloud-client", () => ({ requestHandoff: vi.fn() }));

import { GET } from "@/app/go/mcloud/route";
import { getSession } from "@/lib/auth/session";
import { requestHandoff } from "@/lib/auth/mcloud-client";

function req(url: string) { return new Request(url); }
afterEach(() => vi.restoreAllMocks());

describe("/go/mcloud", () => {
  it("redirects to the handoff url when signed in", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { accessToken: "at", refreshToken: "rt", expiresAt: Date.now() + 1e5 } });
    (requestHandoff as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, url: "https://mcloud.co.ke/auth/handoff?ticket=abc" });
    const res = await GET(req("https://spiritb.uk/go/mcloud?to=/onboarding") as never);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/handoff?ticket=");
  });

  it("redirects to MCloud login when not signed in", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(req("https://spiritb.uk/go/mcloud?to=/onboarding") as never);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("mcloud.co.ke");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run app/go/mcloud/route.test.ts`
Expected: FAIL — route missing.

- [ ] **Step 7: Implement `/go/mcloud`** (`app/go/mcloud/route.ts`)

```ts
// GET /go/mcloud?to=<relative> — hand the spiritbulb session over to MCloud web.
// Signed in: request a single-use handoff ticket and 302 to MCloud's redeem URL.
// Signed out: 302 to MCloud's public login. `to` is passed through to MCloud,
// which sanitizes it at mint; we only forward it.
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getSession } from "@/lib/auth/session";
import { requestHandoff } from "@/lib/auth/mcloud-client";

const MCLOUD_LOGIN = "https://mcloud.co.ke/auth/login";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") ?? "/";
  const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(MCLOUD_LOGIN);

  const handoff = await requestHandoff(
    { accessToken: session.data.accessToken, refreshToken: session.data.refreshToken },
    to,
  );
  if (!handoff.ok || !handoff.url) return NextResponse.redirect(MCLOUD_LOGIN);
  return NextResponse.redirect(handoff.url);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run app/go/mcloud/route.test.ts`
Expected: PASS.

- [ ] **Step 9: Wire ProductPage's MCloud launch link**

In `components/ProductPage.tsx`, the MCloud product's `external.href` (raw `https://mcloud.co.ke...`) becomes `/go/mcloud?to=/` **for the MCloud product only**, so an authed visitor is handed over. Keep the raw external link as the fallback for other products and when the concept of "authed" is unknown at render. Minimal change: where `product.external` is rendered, if `product.slug === 'mcloud'`, point the `href` at `/go/mcloud?to=/` (a normal same-tab link, not `target="_blank"`, since it needs cookies). Verify against the current `ProductPage.tsx` structure (product config lives in `lib/products.ts`).

- [ ] **Step 10: Full spiritbulb suite + build + commit**

Run: `cd c:/Users/busie/spiritbulb && npx vitest run && npx tsc --noEmit`
Expected: all pass.
```bash
git add lib/auth/mcloud-client.ts lib/auth/mcloud-client.test.ts app/go/mcloud/ components/ProductPage.tsx
git commit -m "feat(sso): mint-and-redirect /go/mcloud + ProductPage handoff link"
```

---

## Self-Review Notes

- **Spec coverage:** §2 table (Task 1) with the corrected `sealed_tokens` model; crypto (Task 2); mint/redeem helpers incl. atomic single-use + sweep (Task 3); `saveSession`-from-pair behind the provider (Task 4); rate limit (Task 5); both mint routes with `redirectTo` guard via reused `sanitizeReturnTo` (Task 6); redeem route (Task 7); spiritbulb mint-and-redirect + ProductPage wiring, i.e. flow #2's UI surface (Task 9). Flow #3 (subdomain SSO) shipped in PR 1. Mobile mint (Task 6) is the server side of the mobile flow; the app-side in-app-browser call is a mobile-app change tracked separately.
- **Type consistency:** `HandoffTokens {accessToken, refreshToken}` defined in Task 2, consumed unchanged in Tasks 3, 4, 6, 7. `mintTicket`/`redeemTicket` shapes from Task 3 consumed in Tasks 6/7. `createSessionFromTokens` signature identical in types.ts, workos.ts, server.ts (Task 4) and its caller (Task 7).
- **Known executor judgment calls (flagged inline, not placeholders):** (a) the exact way `saveSession`'s cookie is flushed onto the redeem redirect response — Task 7 says mirror `/api/auth/verify`; (b) the repo's precise test-run and build commands — Tasks 2/8 say mirror `_return-to.test.ts` and the existing build; (c) `ProductPage.tsx`'s exact render structure — Task 9 says verify against current code. These are "match the existing working pattern" instructions, deliberately not guessed.
- **Cross-repo boundary:** Tasks 1-8 are MCloud and fully buildable/verifiable there. Task 9 is spiritbulb and depends on PR 1. The true end-to-end (spiritbulb browser -> MCloud redeem) requires both deployed with a shared `PARTNER_AUTH_SECRET` and is a live post-deploy check.
- **Mobile app change (out of this plan):** the RN app calling `/api/mobile/auth/handoff` and opening the url in an in-app browser is a change in `apps/mobile`, deferred to when mobile feature screens are built.
