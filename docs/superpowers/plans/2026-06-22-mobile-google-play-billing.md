# Mobile Google Play Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let store owners subscribe to Pro via Google Play Billing in the mobile app, with the backend verifying the purchase token against the Google Play Developer API before granting `is_pro`.

**Architecture:** Mobile (expo-iap) drives the native Play purchase, then POSTs the purchase token to `/api/mobile/stores/[slug]/subscribe`. The backend verifies the token with Google (service-account JWT, reused from the beta-group SA), upserts `store_subscriptions` (Play-only), sets `stores.is_pro`, and returns success — only then does the client acknowledge the purchase. Google Play becomes the sole Pro provider; Paystack/IntaSend subscription code is removed.

**Tech Stack:** Next.js (web API), Supabase (Postgres, via MCP `apply_migration`), Expo SDK 56 / React Native 0.85, expo-iap, Google Play Android Developer API.

## Global Constraints

- Android package name: `cloud.menengai.twa` (verbatim, used as Play `packageName`).
- Credentials reused (no new SA): `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`.
- Play scope: `https://www.googleapis.com/auth/androidpublisher`, **no `sub` impersonation**.
- New env: `GOOGLE_PLAY_PRO_SKU` (backend), `EXPO_PUBLIC_PLAY_PRO_SKU` (mobile).
- Subscription status vocabulary: `active` | `cancelled` | `expired` | `pending`.
- `provider` is always `'google_play'`.
- Acknowledge a Play purchase ONLY after the backend confirms the grant (else Play auto-refunds in 3 days — which is the desired safety behavior on failure).
- No test framework exists in this repo, and no `tsx`/`ts-node` is installed. "Tests" = standalone verification scripts run with `node --experimental-strip-types` (Node 24 strips TS types natively; importing `.ts` pure modules works for dependency-light functions) + `tsc --noEmit` + build gates. Scripts use `.ts` extension so type-stripping applies.
- Migrations run via Supabase MCP `apply_migration`; types regenerated via MCP `generate_typescript_types` into `packages/db/src/database.types.ts`.
- Manual checkpoints: prod migration and first commit require explicit user go-ahead.

---

## File Structure

- `apps/web/lib/google-jwt.ts` (create) — shared SA-JWT → access-token helper (scope + optional subject).
- `apps/web/lib/google-group.ts` (modify) — consume the shared helper; no behavior change.
- `apps/web/app/api/mobile/_google-play.ts` (create) — Play `subscriptionsv2` verification wrapper.
- `apps/web/app/api/mobile/stores/[slug]/subscribe/route.ts` (rewrite) — verify token → grant Pro.
- `apps/web/app/api/webhooks/paystack/route.ts` (delete).
- `apps/web/app/api/webhooks/intasend/route.ts` (delete).
- `apps/web/app/admin/page.tsx`, `apps/web/app/admin/subs/page.tsx` (modify) — drop `paystack_*` display.
- `packages/db/src/database.types.ts` (regenerate).
- `apps/mobile/src/lib/iap.ts` (create) — expo-iap wrapper + `purchasePro`.
- `apps/mobile/src/lib/api.ts` (modify) — `subscribePro`.
- `apps/mobile/app.json` (modify) — expo-iap plugin.
- `apps/mobile/app/(app)/store/[storeSlug]/index.tsx` (modify) — Upgrade entry point.
- `apps/mobile/app/(app)/store/[storeSlug]/more.tsx` (modify) — Subscription row.
- `apps/mobile/src/components/ProSheet.tsx` (create) — purchase bottom sheet.

---

## Task 0 (USER PREREQUISITE — not code)

Before end-to-end testing, the user must:
- Add `GOOGLE_SA_EMAIL` to Play Console → Users & permissions (financial data / manage orders) on `cloud.menengai.twa`.
- Enable the Google Play Android Developer API in the SA's GCP project.
- Create the Pro subscription product in Play Console; set `GOOGLE_PLAY_PRO_SKU` + `EXPO_PUBLIC_PLAY_PRO_SKU`.

Tasks 1–4 (backend) can be built and unit-verified without this. Tasks 5–7 (native) need an EAS build + this setup to test on a device.

---

## Task 1: Extract shared Google SA-JWT helper

**Files:**
- Create: `apps/web/lib/google-jwt.ts`
- Modify: `apps/web/lib/google-group.ts`
- Test: `apps/web/scripts/verify-google-jwt.ts`

**Interfaces:**
- Produces: `getGoogleAccessToken({ saEmail, privateKey, scope, subject? }): Promise<string>` and `normalizePrivateKey(raw: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/scripts/verify-google-jwt.ts
// Run with: node --experimental-strip-types scripts/verify-google-jwt.ts
import { normalizePrivateKey } from '../lib/google-jwt.ts'
import assert from 'node:assert'

const escaped = 'line1\\nline2'
assert.equal(normalizePrivateKey(escaped), 'line1\nline2', 'single-escaped newlines')
const doubled = 'line1\\\\nline2'
assert.equal(normalizePrivateKey(doubled), 'line1\nline2', 'double-escaped newlines')
console.log('OK')
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && node --experimental-strip-types scripts/verify-google-jwt.ts`
Expected: FAIL (module `lib/google-jwt.ts` not found).

- [ ] **Step 3: Create the helper**

```ts
// apps/web/lib/google-jwt.ts
import 'server-only'
import { createSign } from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

function base64url(input: Buffer | string): string {
    return Buffer.from(input).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Collapse \\n then \n so a PEM pasted into .env ends up with real newlines. */
export function normalizePrivateKey(raw: string): string {
    return raw.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n')
}

/** Mint a signed JWT and exchange it for an access token. `subject` is only for
 *  domain-wide-delegation APIs (e.g. Directory); omit it for service-account-as-self
 *  APIs (e.g. Android Publisher). */
export async function getGoogleAccessToken(cfg: {
    saEmail: string
    privateKey: string
    scope: string
    subject?: string
}): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claims = base64url(JSON.stringify({
        iss: cfg.saEmail,
        ...(cfg.subject ? { sub: cfg.subject } : {}),
        scope: cfg.scope,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
    }))
    const signingInput = `${header}.${claims}`
    const signature = base64url(createSign('RSA-SHA256').update(signingInput).sign(cfg.privateKey))
    const assertion = `${signingInput}.${signature}`

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    })
    if (!res.ok) throw new Error(`token exchange failed (${res.status}): ${await res.text()}`)
    const json = (await res.json()) as { access_token?: string }
    if (!json.access_token) throw new Error('token exchange returned no access_token')
    return json.access_token
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && node --experimental-strip-types scripts/verify-google-jwt.ts`
Expected: `OK`.

- [ ] **Step 5: Refactor `google-group.ts` to use the helper**

Replace its inline `base64url`, key-normalization, and `getAccessToken` with the shared helper. Keep `addToBetaGroup` behavior identical (scope `admin.directory.group.member`, `subject: GOOGLE_ADMIN_SUBJECT`):

```ts
// in apps/web/lib/google-group.ts — replace getAccessToken usage:
import { getGoogleAccessToken, normalizePrivateKey } from './google-jwt'
// getConfig(): use normalizePrivateKey(rawKey)
// addToBetaGroup(): const token = await getGoogleAccessToken({
//   saEmail: cfg.saEmail, privateKey: cfg.privateKey,
//   scope: 'https://www.googleapis.com/auth/admin.directory.group.member',
//   subject: cfg.subject,
// })
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors (clear stale `.next/types` if it complains about unrelated generated files).

- [ ] **Step 7: Commit** (after user go-ahead on first commit)

```bash
git add apps/web/lib/google-jwt.ts apps/web/lib/google-group.ts apps/web/scripts/verify-google-jwt.mjs
git commit -m "refactor(web): extract shared Google SA-JWT helper"
```

---

## Task 2: Play subscription verification module

**Files:**
- Create: `apps/web/app/api/mobile/_google-play.ts`
- Test: `apps/web/scripts/verify-google-play.ts`

**Interfaces:**
- Consumes: `getGoogleAccessToken`, `normalizePrivateKey` (Task 1).
- Produces: `verifyPlaySubscription(purchaseToken: string): Promise<PlayVerifyResult>` where
  `type PlayVerifyResult = { ok: true; active: boolean; productId: string; orderId: string | null; expiryTime: string | null } | { ok: false; error: string }`.

- [ ] **Step 1: Write the failing test** (pure parsing logic, no network)

```ts
// apps/web/scripts/verify-google-play.ts
// Run with: node --experimental-strip-types scripts/verify-google-play.ts
// NOTE: import only the pure parser to avoid pulling 'server-only'. If strip-types
// balks at the server-only import chain, move parseSubscriptionResponse into a
// sibling pure module (_google-play-parse.ts) and import that here + re-export it
// from _google-play.ts.
import { parseSubscriptionResponse } from '../app/api/mobile/_google-play.ts'
import assert from 'node:assert'

const active = {
  subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
  latestOrderId: 'GPA.1234',
  lineItems: [{ productId: 'pro_monthly', expiryTime: '2026-07-22T00:00:00Z' }],
}
let r = parseSubscriptionResponse(active)
assert.deepEqual(r, { ok: true, active: true, productId: 'pro_monthly', orderId: 'GPA.1234', expiryTime: '2026-07-22T00:00:00Z' })

const cancelled = { subscriptionState: 'SUBSCRIPTION_STATE_CANCELED', lineItems: [{ productId: 'pro_monthly' }] }
r = parseSubscriptionResponse(cancelled)
assert.equal(r.ok, true); assert.equal(r.active, false)

const grace = { subscriptionState: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', lineItems: [{ productId: 'pro_monthly' }] }
assert.equal(parseSubscriptionResponse(grace).active, true, 'grace counts as active')
console.log('OK')
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && node --experimental-strip-types scripts/verify-google-play.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the module**

```ts
// apps/web/app/api/mobile/_google-play.ts
import 'server-only'
import { getGoogleAccessToken, normalizePrivateKey } from '@/lib/google-jwt'

const PACKAGE_NAME = 'cloud.menengai.twa'
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher'

export type PlayVerifyResult =
    | { ok: true; active: boolean; productId: string; orderId: string | null; expiryTime: string | null }
    | { ok: false; error: string }

const ACTIVE_STATES = new Set([
    'SUBSCRIPTION_STATE_ACTIVE',
    'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
])

/** Pure: turn a subscriptionsv2 response into our result shape. Exported for tests. */
export function parseSubscriptionResponse(data: any): PlayVerifyResult {
    const state = data?.subscriptionState
    const line = Array.isArray(data?.lineItems) ? data.lineItems[0] : undefined
    const productId = line?.productId
    if (!state || !productId) return { ok: false, error: 'Malformed Play response' }
    return {
        ok: true,
        active: ACTIVE_STATES.has(state),
        productId,
        orderId: data?.latestOrderId ?? null,
        expiryTime: line?.expiryTime ?? null,
    }
}

export async function verifyPlaySubscription(purchaseToken: string): Promise<PlayVerifyResult> {
    const saEmail = process.env.GOOGLE_SA_EMAIL
    const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY
    if (!saEmail || !rawKey) return { ok: false, error: 'Google Play credentials not configured' }

    let token: string
    try {
        token = await getGoogleAccessToken({
            saEmail,
            privateKey: normalizePrivateKey(rawKey),
            scope: SCOPE,
        })
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'token error' }
    }

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return { ok: false, error: `Play verify failed (${res.status}): ${await res.text()}` }
    return parseSubscriptionResponse(await res.json())
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && node --experimental-strip-types scripts/verify-google-play.ts`
Expected: `OK`.

- [ ] **Step 5: Commit** (after go-ahead)

```bash
git add apps/web/app/api/mobile/_google-play.ts apps/web/scripts/verify-google-play.mjs
git commit -m "feat(web): Google Play subscription verification module"
```

---

## Task 3: Schema migration (Play-only store_subscriptions)

**Files:**
- Modify (regenerate): `packages/db/src/database.types.ts`

**MANUAL CHECKPOINT: do not run the migration without explicit user go-ahead.**

- [ ] **Step 1: Safety check (read-only) via Supabase MCP `execute_sql`**

```sql
SELECT count(*) AS live FROM store_subscriptions WHERE paystack_reference IS NOT NULL;
```
Expected: `0`. If non-zero, STOP and report — do not migrate.

- [ ] **Step 2: Apply migration via Supabase MCP `apply_migration`** (name: `play_only_subscriptions`)

```sql
ALTER TABLE store_subscriptions
  DROP COLUMN IF EXISTS paystack_reference,
  DROP COLUMN IF EXISTS paystack_subscription_code,
  DROP COLUMN IF EXISTS paystack_email_token,
  DROP COLUMN IF EXISTS paystack_customer_code,
  DROP COLUMN IF EXISTS paystack_paid_at;

ALTER TABLE store_subscriptions
  ADD COLUMN IF NOT EXISTS google_play_purchase_token text,
  ADD COLUMN IF NOT EXISTS google_play_order_id text,
  ADD COLUMN IF NOT EXISTS google_play_product_id text;

CREATE UNIQUE INDEX IF NOT EXISTS store_subscriptions_play_token_uniq
  ON store_subscriptions (google_play_purchase_token)
  WHERE google_play_purchase_token IS NOT NULL;
```

- [ ] **Step 3: Verify columns** via MCP `execute_sql`

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'store_subscriptions' ORDER BY ordinal_position;
```
Expected: no `paystack_*`; `google_play_purchase_token/order_id/product_id` present.

- [ ] **Step 4: Regenerate types** via MCP `generate_typescript_types`; write output to `packages/db/src/database.types.ts`.

- [ ] **Step 5: Typecheck the db package consumers**

Run: `cd apps/web && npx tsc --noEmit`
Expected: errors ONLY in files that reference dropped `paystack_*` columns (the paystack/intasend webhooks + admin pages) — these are fixed in Task 4. Note them.

- [ ] **Step 6: Commit** (after go-ahead)

```bash
git add packages/db/src/database.types.ts
git commit -m "feat(db): make store_subscriptions Google-Play-only"
```

---

## Task 4: Rewrite subscribe route + remove Paystack/IntaSend consumers

**Files:**
- Rewrite: `apps/web/app/api/mobile/stores/[slug]/subscribe/route.ts`
- Delete: `apps/web/app/api/webhooks/paystack/route.ts`, `apps/web/app/api/webhooks/intasend/route.ts`
- Modify: `apps/web/app/admin/page.tsx`, `apps/web/app/admin/subs/page.tsx`

**Interfaces:**
- Consumes: `verifyPlaySubscription` (Task 2), `requireMobileUser`/`fail` (`apps/web/app/api/mobile/_lib.ts`).
- Produces: `POST /api/mobile/stores/[slug]/subscribe` accepting `{ purchaseToken, productId }`, returning `{ ok: true, pro: true, expiresAt: string | null }` or a 4xx error.

- [ ] **Step 1: Rewrite the subscribe route**

```ts
// apps/web/app/api/mobile/stores/[slug]/subscribe/route.ts
import { createClient } from '@mcloud/db/server'
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser, fail } from '../../../_lib'
import { verifyPlaySubscription } from '../../../_google-play'

const PRO_SKU = process.env.GOOGLE_PLAY_PRO_SKU

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    const { slug } = await params

    let purchaseToken = '', productId = ''
    try {
        const body = await req.json()
        purchaseToken = body?.purchaseToken ?? ''
        productId = body?.productId ?? ''
    } catch { /* fall through to validation */ }
    if (!purchaseToken) return fail(400, 'purchaseToken required')
    if (!PRO_SKU) return fail(500, 'GOOGLE_PLAY_PRO_SKU not configured')

    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores').select('id, name, slug, is_pro').eq('slug', slug).single()
    if (!store) return fail(404, 'Store not found')

    const { data: membership } = await supabase
        .from('store_members').select('role')
        .eq('store_id', store.id).eq('user_id', user.id)
        .in('role', ['owner', 'admin']).single()
    if (!membership) return fail(403, 'Forbidden')

    // Token must not already belong to a different store.
    const { data: existing } = await supabase
        .from('store_subscriptions').select('store_id')
        .eq('google_play_purchase_token', purchaseToken).maybeSingle()
    if (existing && existing.store_id !== store.id) return fail(409, 'Purchase already linked to another store')

    const result = await verifyPlaySubscription(purchaseToken)
    if (!result.ok) return fail(502, result.error)
    if (!result.active) return fail(400, 'Subscription is not active')
    if (result.productId !== PRO_SKU) return fail(400, 'Unexpected product')

    // Idempotent upsert keyed on the unique purchase token.
    await supabase.from('store_subscriptions').upsert({
        store_id: store.id,
        provider: 'google_play',
        google_play_purchase_token: purchaseToken,
        google_play_order_id: result.orderId,
        google_play_product_id: result.productId,
        plan: 'pro',
        amount: 0,
        currency: 'KES',
        status: 'active',
        period_end: result.expiryTime,
    }, { onConflict: 'google_play_purchase_token' })

    await supabase.from('stores').update({ is_pro: true }).eq('id', store.id)

    return NextResponse.json({ ok: true, pro: true, expiresAt: result.expiryTime })
}
```

- [ ] **Step 2: Delete obsolete webhooks**

```bash
git rm apps/web/app/api/webhooks/paystack/route.ts apps/web/app/api/webhooks/intasend/route.ts
```

- [ ] **Step 3: Fix admin pages**

In `apps/web/app/admin/page.tsx` and `apps/web/app/admin/subs/page.tsx`, find every `select`/render of `paystack_*` on `store_subscriptions` and replace with the surviving columns. Display `provider`, `status`, `plan`, `amount`, `currency`, `created_at`, and (where a reference was shown) `google_play_order_id`. Remove any `paystack_reference`/`paystack_subscription_code` column references entirely. (Read each file first; make the minimal column swap — do not restructure the pages.)

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && rm -f .next/types/validator.ts; npx tsc --noEmit`
Expected: no errors. (Stale generated validator referencing deleted webhook routes is expected to clear after removal.)

- [ ] **Step 5: Build to confirm routes compile**

Run: `npx turbo run build --filter=@mcloud/web`
Expected: exit 0.

- [ ] **Step 6: Commit** (after go-ahead)

```bash
git add -A apps/web/app/api/mobile/stores apps/web/app/admin apps/web/app/api/webhooks
git commit -m "feat(web): verify Google Play purchases; remove Paystack/IntaSend subscription code"
```

---

## Task 5: Mobile API client + expo-iap dependency

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/package.json` (via install)

**Interfaces:**
- Produces: `api(...).subscribePro(slug, { purchaseToken, productId }): Promise<{ ok: boolean; pro: boolean; expiresAt: string | null }>`.

- [ ] **Step 1: Add `subscribePro` to the api client**

```ts
// apps/mobile/src/lib/api.ts — add inside the returned object:
    async subscribePro(slug: string, input: { purchaseToken: string; productId: string }): Promise<{ ok: boolean; pro: boolean; expiresAt: string | null }> {
      const res = await authedFetch(`/api/mobile/stores/${slug}/subscribe`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return json<{ ok: boolean; pro: boolean; expiresAt: string | null }>(res)
    },
```

- [ ] **Step 2: Install expo-iap**

Run: `cd apps/mobile && npx expo install expo-iap`
Expected: dependency added to `apps/mobile/package.json`.

- [ ] **Step 3: Register the config plugin** in `apps/mobile/app.json` `plugins` array

```json
"plugins": [
  "expo-iap"
]
```
(Append to the existing `plugins` array — do not replace other plugins.)

- [ ] **Step 4: Typecheck mobile**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit** (after go-ahead)

```bash
git add apps/mobile/src/lib/api.ts apps/mobile/app.json apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "feat(mobile): subscribePro api client + expo-iap dependency"
```

---

## Task 6: expo-iap wrapper (`useIap` + `purchasePro`)

**Files:**
- Create: `apps/mobile/src/lib/iap.ts`

**Interfaces:**
- Consumes: `subscribePro` (Task 5), expo-iap.
- Produces: `useIap()` returning `{ proProduct, purchasePro, loading, error, ready }` where
  `purchasePro(slug: string): Promise<{ pro: boolean }>` and `proProduct: { displayPrice: string } | null`.

- [ ] **Step 1: Implement the wrapper**

```ts
// apps/mobile/src/lib/iap.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  initConnection, endConnection, getSubscriptions,
  requestSubscription, finishTransaction, purchaseUpdatedListener, purchaseErrorListener,
  type SubscriptionProduct, type Purchase,
} from 'expo-iap'
import { useAuth } from '@/auth/AuthContext'
import { api as makeApi } from '@/lib/api'

const SKU = process.env.EXPO_PUBLIC_PLAY_PRO_SKU as string

export function useIap() {
  const { authedFetch } = useAuth()
  const api = useMemo(() => makeApi(authedFetch), [authedFetch])
  const [ready, setReady] = useState(false)
  const [proProduct, setProProduct] = useState<{ displayPrice: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Resolver bridge: the purchase event fires outside the request promise.
  const pending = useRef<{ slug: string; resolve: (v: { pro: boolean }) => void; reject: (e: Error) => void } | null>(null)

  useEffect(() => {
    let updateSub: { remove(): void } | undefined
    let errorSub: { remove(): void } | undefined
    ;(async () => {
      await initConnection()
      const subs = (await getSubscriptions([SKU])) as SubscriptionProduct[]
      const p = subs[0]
      if (p) setProProduct({ displayPrice: (p as any).displayPrice ?? (p as any).localizedPrice ?? '' })
      updateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
        const ctx = pending.current
        const purchaseToken = (purchase as any).purchaseToken ?? (purchase as any).purchaseTokenAndroid
        const productId = (purchase as any).productId ?? (purchase as any).id
        if (!ctx || !purchaseToken) return
        try {
          const r = await api.subscribePro(ctx.slug, { purchaseToken, productId })
          if (r.pro) {
            await finishTransaction({ purchase, isConsumable: false }) // acknowledge ONLY after grant
            ctx.resolve({ pro: true })
          } else {
            ctx.reject(new Error('Subscription not granted'))
          }
        } catch (e) {
          ctx.reject(e instanceof Error ? e : new Error('Verification failed')) // no ack → Play auto-refunds
        } finally {
          pending.current = null
        }
      })
      errorSub = purchaseErrorListener((e: any) => {
        const ctx = pending.current
        pending.current = null
        // User cancelled is a benign no-op.
        if (e?.code === 'E_USER_CANCELLED') { ctx?.resolve({ pro: false }); return }
        ctx?.reject(new Error(e?.message ?? 'Purchase failed'))
      })
      setReady(true)
    })()
    return () => { updateSub?.remove(); errorSub?.remove(); endConnection() }
  }, [api])

  const purchasePro = useCallback((slug: string) => {
    setError(null); setLoading(true)
    return new Promise<{ pro: boolean }>((resolve, reject) => {
      pending.current = { slug, resolve, reject }
      requestSubscription({ sku: SKU }).catch((e) => {
        pending.current = null
        reject(e instanceof Error ? e : new Error('Could not start purchase'))
      })
    }).catch((e) => { setError(e.message); throw e }).finally(() => setLoading(false))
  }, [])

  return { ready, proProduct, purchasePro, loading, error }
}
```

> **Note for implementer:** expo-iap's exact export names/field shapes can vary by version. Before writing, run `cd apps/mobile && npx tsc --noEmit` after importing, and check `node_modules/expo-iap` types for the actual names (`purchaseToken` vs `purchaseTokenAndroid`, `requestSubscription` arg shape, `finishTransaction` signature). Adjust the `as any` accesses to the real fields. The api-access pattern (`useAuth().authedFetch` → `makeApi(authedFetch)`) mirrors `apps/mobile/src/data/products.ts:13-14`; confirm the `useAuth` import path (`@/auth/AuthContext`) resolves.

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors (fix field names per the note).

- [ ] **Step 3: Commit** (after go-ahead)

```bash
git add apps/mobile/src/lib/iap.ts
git commit -m "feat(mobile): expo-iap wrapper with verify-then-acknowledge purchase flow"
```

---

## Task 7: Pro sheet + entry points

**Files:**
- Create: `apps/mobile/src/components/ProSheet.tsx`
- Modify: `apps/mobile/app/(app)/store/[storeSlug]/index.tsx`
- Modify: `apps/mobile/app/(app)/store/[storeSlug]/more.tsx`

**Interfaces:**
- Consumes: `useIap` (Task 6).
- Produces: `<ProSheet open slug onClose onSuccess />` and entry-point UI in hub + more.

- [ ] **Step 1: Read the two screens first**

Read `index.tsx` and `more.tsx` to match their existing styling primitives (the app's component/StyleSheet conventions), how they read `is_pro`/`canManage`, and how they refetch the hub. Use those primitives — do not introduce a new styling system.

- [ ] **Step 2: Implement `ProSheet.tsx`**

A bottom sheet (use the app's existing modal/sheet primitive found in Step 1) showing:
- Title "Menengai Cloud Pro"; price from `proProduct?.displayPrice` (fallback "—" while loading).
- The feature list (Custom domain, Advanced analytics, Remove branding, Priority support, Blog & content pages).
- A "Subscribe" button → `await purchasePro(slug)`; on `{ pro: true }` call `onSuccess()` then `onClose()`. Show `loading` spinner and `error` text from `useIap`.
- If `purchasePro` resolves `{ pro: false }` (user cancelled) just stop the spinner, no error.

- [ ] **Step 3: Add hub entry point** in `index.tsx`

When `!store.is_pro && canManage`, render an "Upgrade to Pro" card that opens `<ProSheet>`. On `onSuccess`, refetch the hub (use the screen's existing refetch/invalidate). Match existing card styling.

- [ ] **Step 4: Add "Subscription" row** in `more.tsx`

Row shows plan: `is_pro ? 'Pro' : 'Free'`. When Free + `canManage`, tap opens `<ProSheet>`. When Pro, tap opens the Play subscription center:

```ts
import { Linking } from 'react-native'
const SKU = process.env.EXPO_PUBLIC_PLAY_PRO_SKU
Linking.openURL(`https://play.google.com/store/account/subscriptions?sku=${SKU}&package=cloud.menengai.twa`)
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit** (after go-ahead)

```bash
git add apps/mobile/src/components/ProSheet.tsx "apps/mobile/app/(app)/store/[storeSlug]/index.tsx" "apps/mobile/app/(app)/store/[storeSlug]/more.tsx"
git commit -m "feat(mobile): Pro subscribe sheet + hub/more entry points"
```

---

## Task 8: End-to-end verification (needs Task 0 + EAS build)

- [ ] **Step 1:** Build a dev/internal APK: `cd apps/mobile && eas build --profile preview --platform android`.
- [ ] **Step 2:** Install on a device whose Google account is a license tester; ensure the Pro product is active in Play Console.
- [ ] **Step 3:** As a store owner, open a Free store → Upgrade to Pro → complete the Play test purchase.
- [ ] **Step 4:** Confirm backend granted: `is_pro = true` for the store; a `store_subscriptions` row with `provider='google_play'`, the token, `status='active'`.
- [ ] **Step 5:** Idempotency: re-trigger the unacknowledged-purchase path (kill app before ack, reopen) → single row, single grant.
- [ ] **Step 6:** Failure path: temporarily set a wrong `GOOGLE_PLAY_PRO_SKU` server-side → purchase → confirm 400, no grant, purchase auto-refunds (not acknowledged).

---

## Self-Review

**Spec coverage:**
- §2 architecture → Tasks 4 (backend grant), 6 (client ack-after-grant). ✓
- §3 migration + column drops + webhook deletes + admin updates → Tasks 3, 4. ✓
- §4 verify endpoint + shared JWT + credentials reuse → Tasks 1, 2, 4. ✓
- §5 expo-iap client → Tasks 5, 6. ✓
- §6 UI entry points + Play management link → Task 7. ✓
- §7 error table → Task 4 (4xx paths) + Task 6 (cancel/no-ack). ✓
- §8 testing → Tasks 1–2 unit scripts, Task 8 e2e. ✓
- §9 manual checkpoints → Task 3 (migration gate), commit steps gated. ✓

**Placeholder scan:** Tasks 4 Step 3 and Task 6/7 contain "read the file first" directions rather than literal final code, because the exact admin-page columns and the mobile styling primitives/expo-iap field names cannot be known without reading current files / installed types. These are explicit, bounded instructions (which columns to swap, which fields to confirm), not vague "handle it" placeholders. Acceptable and called out.

**Type consistency:** `getGoogleAccessToken`/`normalizePrivateKey` (T1) used identically in T2; `verifyPlaySubscription`/`PlayVerifyResult` (T2) consumed in T4; `subscribePro` signature identical in T5/T6; `useIap` shape (T6) consumed in T7. ✓
