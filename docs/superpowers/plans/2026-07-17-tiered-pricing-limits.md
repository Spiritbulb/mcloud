# Tiered Pricing with Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary `is_pro` model with a three-tier ladder (Free → Hobby → Pro) whose tiers differ by numeric limits (products, members, monthly orders) and feature gates, deriving the tier from `store_subscriptions`.

**Architecture:** A store's tier is derived from its active `store_subscriptions` row (`plan` = `'hobby'`/`'pro'`; no active row = `'free'`). `stores.is_pro` stays as a denormalized "any paid tier" mirror. Tier limits and feature flags live in a static code map `PLAN_LIMITS`. The decision logic (which plan a SKU maps to, whether a count is over a limit, whether a plan has a feature) is extracted into **pure functions** so it is unit-testable with Node's built-in test runner without a database. DB-touching wrappers call those pure functions.

**Tech Stack:** Next.js (App Router, server actions + route handlers), Supabase (`@mcloud/db`), TypeScript, React Native (Expo) for mobile, `expo-iap`. Tests use the **built-in `node:test` runner** with `node:assert/strict`, run via `node --test <file>`.

## Global Constraints

- **Test runner:** `node:test` + `node:assert/strict` only. No vitest/jest. Run a test with `node --test path/to/file.test.ts` (Node 24, native TS). Import style: `import { test } from 'node:test'`, `import assert from 'node:assert/strict'`.
- **Pure-function seam:** all limit/plan/SKU decision logic must be pure (no Supabase, no `async` DB calls) so it is testable. DB wrappers are thin and untested by unit tests.
- **Source of truth:** tier derives from the active `store_subscriptions` row. Never add a `stores.plan` column.
- **`is_pro` stays:** keep `stores.is_pro` in sync (true for hobby OR pro) wherever a subscription is granted/revoked. Its ~30 read sites are untouched.
- **Plans are store-scoped**, never org-scoped.
- **Order cap is a soft nudge** — NEVER block checkout. Only products and members are hard-enforced at create time.
- **Copy rule:** no em dashes or en dashes in any user-facing string (use periods/commas). Applies to error messages and UI copy in this plan.
- **Tier values (verbatim):**
  - free: products 20, members 1, monthlyOrders 50, all features false
  - hobby: products 200, members 3, monthlyOrders 500, features customDomain/advancedAnalytics/blogPages true; removeBranding/prioritySupport false
  - pro: products Infinity, members 10, monthlyOrders Infinity, all features true

---

### Task 1: Plan config and pure decision functions

**Files:**
- Create: `apps/web/lib/plans.ts`
- Test: `apps/web/lib/plans.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `type Plan = 'free' | 'hobby' | 'pro'`
  - `interface PlanLimits { products: number; members: number; monthlyOrders: number; features: PlanFeatures }`
  - `interface PlanFeatures { customDomain: boolean; advancedAnalytics: boolean; removeBranding: boolean; blogPages: boolean; prioritySupport: boolean }`
  - `type FeatureKey = keyof PlanFeatures`
  - `const PLAN_LIMITS: Record<Plan, PlanLimits>`
  - `function planFromActiveRow(row: { plan: string | null; status: string } | null | undefined): Plan` — the tier derivation. `status !== 'active'` or nullish row → `'free'`; `plan === 'pro'` → `'pro'`; `plan === 'hobby'` → `'hobby'`; any other value on an active row → `'free'`.
  - `function isOverLimit(count: number, limit: number): boolean` — `Number.isFinite(limit) && count >= limit`.
  - `function planHasFeature(plan: Plan, feature: FeatureKey): boolean` — `PLAN_LIMITS[plan].features[feature]`.
  - `function planAllowsRequired(plan: Plan, required: 'hobby' | 'pro'): boolean` — rank-based: free < hobby < pro; `required: 'hobby'` allows hobby+pro; `required: 'pro'` allows pro only.
  - `function limitMessage(plan: Plan, noun: string, limit: number): string` — e.g. `You have reached your free plan limit of 20 products. Upgrade to add more.` (no dashes).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/plans.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PLAN_LIMITS,
  planFromActiveRow,
  isOverLimit,
  planHasFeature,
  planAllowsRequired,
  limitMessage,
} from './plans.ts'

test('PLAN_LIMITS has the locked tier values', () => {
  assert.equal(PLAN_LIMITS.free.products, 20)
  assert.equal(PLAN_LIMITS.free.members, 1)
  assert.equal(PLAN_LIMITS.free.monthlyOrders, 50)
  assert.equal(PLAN_LIMITS.hobby.products, 200)
  assert.equal(PLAN_LIMITS.hobby.members, 3)
  assert.equal(PLAN_LIMITS.hobby.monthlyOrders, 500)
  assert.equal(PLAN_LIMITS.pro.products, Infinity)
  assert.equal(PLAN_LIMITS.pro.members, 10)
  assert.equal(PLAN_LIMITS.pro.monthlyOrders, Infinity)
})

test('feature flags match the tier table', () => {
  assert.equal(PLAN_LIMITS.free.features.customDomain, false)
  assert.equal(PLAN_LIMITS.hobby.features.customDomain, true)
  assert.equal(PLAN_LIMITS.hobby.features.advancedAnalytics, true)
  assert.equal(PLAN_LIMITS.hobby.features.blogPages, true)
  assert.equal(PLAN_LIMITS.hobby.features.removeBranding, false)
  assert.equal(PLAN_LIMITS.hobby.features.prioritySupport, false)
  assert.equal(PLAN_LIMITS.pro.features.removeBranding, true)
  assert.equal(PLAN_LIMITS.pro.features.prioritySupport, true)
})

test('planFromActiveRow derives the tier', () => {
  assert.equal(planFromActiveRow(null), 'free')
  assert.equal(planFromActiveRow(undefined), 'free')
  assert.equal(planFromActiveRow({ plan: 'pro', status: 'active' }), 'pro')
  assert.equal(planFromActiveRow({ plan: 'hobby', status: 'active' }), 'hobby')
  assert.equal(planFromActiveRow({ plan: 'pro', status: 'cancelled' }), 'free')
  assert.equal(planFromActiveRow({ plan: null, status: 'active' }), 'free')
  assert.equal(planFromActiveRow({ plan: 'weird', status: 'active' }), 'free')
})

test('isOverLimit: finite compares, Infinity never over', () => {
  assert.equal(isOverLimit(19, 20), false)
  assert.equal(isOverLimit(20, 20), true)
  assert.equal(isOverLimit(21, 20), true)
  assert.equal(isOverLimit(999999, Infinity), false)
})

test('planHasFeature reads the map', () => {
  assert.equal(planHasFeature('free', 'customDomain'), false)
  assert.equal(planHasFeature('hobby', 'customDomain'), true)
  assert.equal(planHasFeature('hobby', 'removeBranding'), false)
  assert.equal(planHasFeature('pro', 'removeBranding'), true)
})

test('planAllowsRequired ranks tiers', () => {
  assert.equal(planAllowsRequired('free', 'hobby'), false)
  assert.equal(planAllowsRequired('hobby', 'hobby'), true)
  assert.equal(planAllowsRequired('pro', 'hobby'), true)
  assert.equal(planAllowsRequired('hobby', 'pro'), false)
  assert.equal(planAllowsRequired('pro', 'pro'), true)
})

test('limitMessage has no dashes and names the plan and noun', () => {
  const msg = limitMessage('free', 'products', 20)
  assert.match(msg, /free/)
  assert.match(msg, /20 products/)
  assert.equal(msg.includes('-'), false)
  assert.equal(msg.includes('–'), false)
  assert.equal(msg.includes('—'), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/web/lib/plans.test.ts`
Expected: FAIL — cannot find module `./plans.ts` (file not created yet).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/plans.ts
// Single source of truth for pricing tiers. Tier limits and feature flags are
// static config (versioned in code, not the DB). The decision helpers are pure
// so they are unit-testable without a database; DB-touching resolvers live in
// plans-server.ts and call planFromActiveRow.

export type Plan = 'free' | 'hobby' | 'pro'

export interface PlanFeatures {
  customDomain: boolean
  advancedAnalytics: boolean
  removeBranding: boolean
  blogPages: boolean
  prioritySupport: boolean
}

export type FeatureKey = keyof PlanFeatures

export interface PlanLimits {
  products: number
  members: number
  monthlyOrders: number
  features: PlanFeatures
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    products: 20,
    members: 1,
    monthlyOrders: 50,
    features: {
      customDomain: false,
      advancedAnalytics: false,
      removeBranding: false,
      blogPages: false,
      prioritySupport: false,
    },
  },
  hobby: {
    products: 200,
    members: 3,
    monthlyOrders: 500,
    features: {
      customDomain: true,
      advancedAnalytics: true,
      removeBranding: false,
      blogPages: true,
      prioritySupport: false,
    },
  },
  pro: {
    products: Infinity,
    members: 10,
    monthlyOrders: Infinity,
    features: {
      customDomain: true,
      advancedAnalytics: true,
      removeBranding: true,
      blogPages: true,
      prioritySupport: true,
    },
  },
}

const RANK: Record<Plan, number> = { free: 0, hobby: 1, pro: 2 }

/** Derive the tier from a store's most-recent-active subscription row. */
export function planFromActiveRow(
  row: { plan: string | null; status: string } | null | undefined,
): Plan {
  if (!row || row.status !== 'active') return 'free'
  if (row.plan === 'pro') return 'pro'
  if (row.plan === 'hobby') return 'hobby'
  return 'free'
}

/** True when a finite limit has been reached or exceeded. Infinity is never over. */
export function isOverLimit(count: number, limit: number): boolean {
  return Number.isFinite(limit) && count >= limit
}

export function planHasFeature(plan: Plan, feature: FeatureKey): boolean {
  return PLAN_LIMITS[plan].features[feature]
}

/** Whether `plan` satisfies a gate that requires at least `required`. */
export function planAllowsRequired(plan: Plan, required: 'hobby' | 'pro'): boolean {
  return RANK[plan] >= RANK[required]
}

/** User-facing over-limit message. No dashes (house copy rule). */
export function limitMessage(plan: Plan, noun: string, limit: number): string {
  return `You have reached your ${plan} plan limit of ${limit} ${noun}. Upgrade to add more.`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test apps/web/lib/plans.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/plans.ts apps/web/lib/plans.test.ts
git commit -m "feat(plans): tier config + pure plan/limit decision helpers"
```

---

### Task 2: SKU → plan mapping (pure)

**Files:**
- Create: `apps/web/lib/plan-skus.ts`
- Test: `apps/web/lib/plan-skus.test.ts`

**Interfaces:**
- Consumes: `Plan` from `./plans.ts`.
- Produces: `function planForSku(productId: string, skus: { hobby?: string; pro?: string }): Plan | null` — returns `'hobby'`/`'pro'` when `productId` matches the corresponding SKU, else `null`. Empty/undefined configured SKUs never match.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/plan-skus.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planForSku } from './plan-skus.ts'

const SKUS = { hobby: 'sku.hobby.monthly', pro: 'sku.pro.monthly' }

test('maps each SKU to its plan', () => {
  assert.equal(planForSku('sku.hobby.monthly', SKUS), 'hobby')
  assert.equal(planForSku('sku.pro.monthly', SKUS), 'pro')
})

test('unknown or empty productId returns null', () => {
  assert.equal(planForSku('sku.other', SKUS), null)
  assert.equal(planForSku('', SKUS), null)
})

test('an unconfigured SKU never matches', () => {
  assert.equal(planForSku('sku.hobby.monthly', { pro: 'sku.pro.monthly' }), null)
  assert.equal(planForSku('', { hobby: '', pro: '' }), null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/web/lib/plan-skus.test.ts`
Expected: FAIL — cannot find module `./plan-skus.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/plan-skus.ts
// Pure Google Play SKU -> plan mapping. Env plumbing lives in the route; this is
// the testable core so a mis-mapped SKU is caught by a unit test, not in prod.
import type { Plan } from './plans.ts'

export function planForSku(
  productId: string,
  skus: { hobby?: string; pro?: string },
): Plan | null {
  if (!productId) return null
  if (skus.hobby && productId === skus.hobby) return 'hobby'
  if (skus.pro && productId === skus.pro) return 'pro'
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test apps/web/lib/plan-skus.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/plan-skus.ts apps/web/lib/plan-skus.test.ts
git commit -m "feat(plans): pure Play SKU to plan mapping"
```

---

### Task 3: Server plan resolvers (DB wrappers)

**Files:**
- Create: `apps/web/lib/plans-server.ts`

**Interfaces:**
- Consumes: `Plan`, `PLAN_LIMITS`, `FeatureKey`, `planFromActiveRow`, `planHasFeature` from `./plans.ts`; `createClient` from `@mcloud/db/server`.
- Produces:
  - `async function getStorePlan(storeId: string): Promise<Plan>` — reads the store's most-recent `store_subscriptions` row and returns `planFromActiveRow(row)`.
  - `async function storeHasFeature(storeId: string, feature: FeatureKey): Promise<boolean>` — `planHasFeature(await getStorePlan(storeId), feature)`.

These are thin DB wrappers; the branching they rely on is already unit-tested in Task 1. No new unit test (would require a DB harness this repo doesn't have). Follow the existing query pattern in `apps/web/lib/pro-gate.ts`.

- [ ] **Step 1: Write the implementation**

```ts
// apps/web/lib/plans-server.ts
// DB-backed plan resolvers. The pure decision logic lives in ./plans.ts and is
// unit-tested there; these wrappers just fetch the active subscription row.
import { createClient } from '@mcloud/db/server'
import {
  planFromActiveRow,
  planHasFeature,
  type FeatureKey,
  type Plan,
} from './plans'

/** The store's current tier, derived from its most-recent subscription row. */
export async function getStorePlan(storeId: string): Promise<Plan> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('store_subscriptions')
    .select('plan, status')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return planFromActiveRow(data)
}

/** Whether the store's tier includes a given feature. */
export async function storeHasFeature(
  storeId: string,
  feature: FeatureKey,
): Promise<boolean> {
  const plan = await getStorePlan(storeId)
  return planHasFeature(plan, feature)
}
```

- [ ] **Step 2: Typecheck the module compiles**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "plans-server|plans\.ts" || echo "no plans errors"`
Expected: `no plans errors`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/plans-server.ts
git commit -m "feat(plans): getStorePlan + storeHasFeature DB resolvers"
```

---

### Task 4: Enforce product limit at create time

**Files:**
- Modify: `apps/web/lib/merchant/products.ts:54-98` (the `createProduct` function)

**Interfaces:**
- Consumes: `getStorePlan` from `../plans-server`; `PLAN_LIMITS`, `isOverLimit`, `limitMessage` from `../plans`.
- Produces: no new exports. `createProduct` now returns `{ error, status: 403, data: null }` when the store is at/over its product limit.

- [ ] **Step 1: Add the limit check inside `createProduct`, after the authorization guard (line 61) and before the name validation (line 63).**

Add these imports at the top of the file (after the existing `canManage` import on line 4):

```ts
import { getStorePlan } from '../plans-server'
import { PLAN_LIMITS, isOverLimit, limitMessage } from '../plans'
```

Insert this block immediately after line 61 (`if (access.error || !canManage(access.role)) return { error: 'Not authorized', status: 403, data: null }`):

```ts
    // Plan limit: block creating a product past the store's tier ceiling.
    const plan = await getStorePlan(access.storeId)
    const productLimit = PLAN_LIMITS[plan].products
    if (Number.isFinite(productLimit)) {
        const supabaseCount = await createClient()
        const { count } = await supabaseCount
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', access.storeId)
        if (isOverLimit(count ?? 0, productLimit)) {
            return { error: limitMessage(plan, 'products', productLimit), status: 403, data: null }
        }
    }
```

- [ ] **Step 2: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "merchant/products" || echo "no products errors"`
Expected: `no products errors`.

- [ ] **Step 3: Manual verification note**

The limit path is DB-dependent (no unit harness). Verify at execution time by driving the app: with a Free store holding 20 active products, creating a 21st via the mobile products route returns 403 with the limit message; a Pro store is never blocked (the `Number.isFinite` guard short-circuits, no count query). Record the observed 403 body.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/merchant/products.ts
git commit -m "feat(plans): enforce per-tier product limit on create"
```

---

### Task 5: Enforce member limit at invite time

**Files:**
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/members/actions.ts:70-135` (the `inviteMember` function)

**Interfaces:**
- Consumes: `getStorePlan` from `@/lib/plans-server`; `PLAN_LIMITS`, `isOverLimit`, `limitMessage` from `@/lib/plans`.
- Produces: no new exports. `inviteMember` returns `{ error }` when current members + pending invites would meet/exceed the tier's member limit.

The limit counts **existing members + pending invites** (a seat is consumed by a pending invite), checked before inserting the new invite.

- [ ] **Step 1: Add imports at the top of the file (after the `MemberRow` import on line 7):**

```ts
import { getStorePlan } from '@/lib/plans-server'
import { PLAN_LIMITS, isOverLimit, limitMessage } from '@/lib/plans'
```

- [ ] **Step 2: Insert the limit check inside `inviteMember`, immediately after the caller permission guard (after line 93, the closing brace of the `if (!caller ...)` block) and before the "Check if already a member" block (line 95).**

```ts
    // Plan limit: a seat is consumed by each member AND each pending invite.
    const plan = await getStorePlan(storeId)
    const memberLimit = PLAN_LIMITS[plan].members
    if (Number.isFinite(memberLimit)) {
        const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
            supabase
                .from('store_members')
                .select('id', { count: 'exact', head: true })
                .eq('store_id', storeId),
            supabase
                .from('store_invites')
                .select('id', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .is('accepted_at', null)
                .gt('expires_at', new Date().toISOString()),
        ])
        const used = (memberCount ?? 0) + (inviteCount ?? 0)
        if (isOverLimit(used, memberLimit)) {
            return { error: limitMessage(plan, 'team members', memberLimit) }
        }
    }
```

- [ ] **Step 3: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "settings/members/actions" || echo "no members errors"`
Expected: `no members errors`.

- [ ] **Step 4: Manual verification note**

Verify at execution: a Free store (limit 1, owner only) inviting a second member returns the member-limit error; a Hobby store allows up to 3 combined members+invites, then blocks the 4th. Record the observed error string.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/members/actions.ts"
git commit -m "feat(plans): enforce per-tier member limit on invite"
```

---

### Task 6: Plan-aware ProGate props

**Files:**
- Modify: `apps/web/components/pro/index.tsx` (add `requires` prop to `ProGate`, `ProGateInline`, `ProLockRow`)

**Interfaces:**
- Consumes: `planAllowsRequired`, `type Plan` from `@/lib/plans`.
- Produces: each gate component gains an optional `plan?: Plan` and `requires?: 'hobby' | 'pro'` prop. Back-compat: when `plan` is omitted, the existing `isPro` boolean drives the gate (treated as `requires: 'hobby'` satisfied). When `plan` is provided, the gate opens iff `planAllowsRequired(plan, requires ?? 'hobby')`.

The three gate components (`ProGate`, `ProGateInline`, `ProLockRow`) currently branch on `if (isPro) return <>{children}</>`. Replace that single condition with a computed `unlocked` boolean.

- [ ] **Step 1: Add the import at the top of `apps/web/components/pro/index.tsx` (after the framer-motion import on line 6):**

```ts
import { planAllowsRequired, type Plan } from '@/lib/plans'
```

- [ ] **Step 2: For `ProGate` (line 234), extend the props type and the unlock condition.**

Change the props destructure/type from:

```tsx
export function ProGate({
    isPro, feature, description, children,
}: {
    isPro: boolean
    feature: string
    description?: string
    children: React.ReactNode
}) {
    const [modalOpen, setModalOpen] = useState(false)

    if (isPro) return <>{children}</>
```

to:

```tsx
export function ProGate({
    isPro, plan, requires = 'hobby', feature, description, children,
}: {
    isPro?: boolean
    plan?: Plan
    requires?: 'hobby' | 'pro'
    feature: string
    description?: string
    children: React.ReactNode
}) {
    const [modalOpen, setModalOpen] = useState(false)

    const unlocked = plan !== undefined ? planAllowsRequired(plan, requires) : !!isPro
    if (unlocked) return <>{children}</>
```

- [ ] **Step 3: Apply the identical prop/condition change to `ProGateInline` (line 287) and `ProLockRow` (line 335).** For `ProLockRow` its props are `{ isPro, label, children }`; add `plan`, `requires` the same way and make `isPro` optional, replacing `if (isPro) return <>{children}</>` with the same `unlocked` computation.

- [ ] **Step 4: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "components/pro" || echo "no pro-gate errors"`
Expected: `no pro-gate errors`. (Existing call sites pass `isPro` only and still typecheck because `isPro` is now optional and `plan` is undefined → falls back to `isPro`.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/pro/index.tsx
git commit -m "feat(plans): plan-aware ProGate (requires hobby|pro)"
```

---

### Task 7: Server-gate custom domain (load-bearing)

**Files:**
- Modify: `apps/web/app/api/store/domain/route.ts:36-68` (the `POST` handler)

**Interfaces:**
- Consumes: `storeHasFeature` from `@/lib/plans-server`.
- Produces: `POST /api/store/domain` returns 403 when the store's tier lacks `customDomain`, before touching Vercel or the DB.

- [ ] **Step 1: Add the import at the top of `apps/web/app/api/store/domain/route.ts` (after line 2):**

```ts
import { storeHasFeature } from '@/lib/plans-server'
```

- [ ] **Step 2: Insert the feature guard inside `POST`, immediately after the ownership check passes (after line 54, the closing brace of the `if (!member ...)` block) and before "Register on Vercel" (line 56):**

```ts
    // Custom domain is a paid feature (Hobby+). Gate server-side; the UI lock is
    // cosmetic and bypassable by calling this route directly.
    if (!(await storeHasFeature(storeId, 'customDomain'))) {
        return NextResponse.json(
            { error: 'Custom domains require the Hobby plan or higher. Upgrade to connect your own domain.' },
            { status: 403 },
        )
    }
```

- [ ] **Step 3: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "api/store/domain" || echo "no domain-route errors"`
Expected: `no domain-route errors`.

- [ ] **Step 4: Manual verification note**

Verify at execution: `POST /api/store/domain` for a Free store returns 403 with the upgrade message and does NOT register the domain on Vercel; a Hobby/Pro store proceeds. Record the 403 body.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/store/domain/route.ts
git commit -m "feat(plans): server-gate custom domain behind Hobby+"
```

---

### Task 8: Gate advanced analytics (server payload + UI)

**Files:**
- Modify: `apps/web/app/api/store/[slug]/analytics/route.ts` (restrict advanced blocks below Hobby)
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/analytics/analytics-client.tsx` (UI gate the advanced sections)

**Interfaces:**
- Consumes: `storeHasFeature` from `@/lib/plans-server` (route); `ProGate`/`ProGateInline` with `plan`/`requires` (client).
- Produces: below Hobby, the analytics route omits the advanced blocks (`funnel`, `by_source`, `by_country`, `top_products`) from the JSON, keeping the basic subset (`range`, `totals`, `previous`, `series`, `by_device`). The client shows a `ProGateInline` over the advanced section for below-Hobby stores.

The default (from the spec): Free gets a basic subset (views/orders/series/device), advanced blocks require Hobby.

- [ ] **Step 1: Read the analytics route to find where the RPC result is returned.**

Run: `sed -n '1,80p' "apps/web/app/api/store/[slug]/analytics/route.ts"`
Expected: shows the handler resolving `storeId` and returning the `get_store_analytics` JSON. Note the exact variable holding the store id and the response object.

- [ ] **Step 2: Add the import and gate the advanced blocks.**

Add at the top of the route file:

```ts
import { storeHasFeature } from '@/lib/plans-server'
```

After the analytics JSON is fetched and the store id is known, before returning, strip advanced blocks when the feature is absent:

```ts
    // Advanced analytics (funnel + source/country/product breakdowns) is Hobby+.
    // Free stores get the basic subset only.
    if (!(await storeHasFeature(storeId, 'advancedAnalytics')) && result && typeof result === 'object') {
        const r = result as Record<string, unknown>
        delete r.funnel
        delete r.by_source
        delete r.by_country
        delete r.top_products
    }
```

(Adapt `result`/`storeId` to the actual variable names found in Step 1.)

- [ ] **Step 3: UI-gate the advanced section in `analytics-client.tsx`.**

The client component receives `plan` (thread it from the page's server component, which can call `getStorePlan(store.id)`; the page passes `plan` as a prop to `analytics-client`). Wrap the advanced sections (funnel, by_source, by_country, top_products render blocks) in:

```tsx
<ProGateInline
    plan={plan}
    requires="hobby"
    feature="Advanced analytics"
    description="Funnel, traffic sources, and top products are available on the Hobby plan and higher."
>
    {/* existing advanced sections */}
</ProGateInline>
```

Import `ProGateInline` from `@/components/pro` and add `plan: Plan` to the client's props (import `type Plan` from `@/lib/plans`). Update the analytics page server component to fetch `getStorePlan` and pass it.

- [ ] **Step 4: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "analytics" || echo "no analytics errors"`
Expected: `no analytics errors`.

- [ ] **Step 5: Manual verification note**

Verify at execution: analytics route for a Free store returns JSON without `funnel`/`by_source`/`by_country`/`top_products`; a Hobby store gets the full payload. The settings analytics page shows the locked advanced panel for Free. Record both payload shapes.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/api/store/[slug]/analytics/route.ts" "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/analytics/analytics-client.tsx" "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/analytics"
git commit -m "feat(plans): gate advanced analytics behind Hobby+ (payload + UI)"
```

---

### Task 9: Gate blog/content authoring

**Files:**
- Modify: the blog/content publish mutation (server action or route under `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/blog/` and `.../content/`)
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/blog/blog-client.tsx` (UI gate)

**Interfaces:**
- Consumes: `storeHasFeature` (server, feature `'blogPages'`); `ProGateInline` with `plan`/`requires` (client).
- Produces: creating/publishing a blog or content page is refused below Hobby, server-side; the blog settings UI shows a locked panel below Hobby.

- [ ] **Step 1: Locate the blog/content create-or-publish mutation.**

Run: `ls "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/blog/" "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content/"` then `grep -rn "insert\|upsert\|'use server'" "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/blog/" "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content/"`
Expected: identifies the server action/route that writes a blog/content page and the store id in scope.

- [ ] **Step 2: Add the server guard at the top of that mutation, after auth/ownership resolves the store id:**

```ts
import { storeHasFeature } from '@/lib/plans-server'
// ...inside the mutation, after the store id is known and the caller is authorized:
if (!(await storeHasFeature(storeId, 'blogPages'))) {
    return { error: 'Blog and content pages require the Hobby plan or higher.' }
}
```

(Match the mutation's existing return shape: server actions here return `{ error }`; a route handler returns `NextResponse.json({ error }, { status: 403 })`.)

- [ ] **Step 3: UI-gate `blog-client.tsx`.** Thread `plan` into the client (page server component calls `getStorePlan(store.id)`), and wrap the authoring UI in `ProGateInline plan={plan} requires="hobby" feature="Blog & content pages" description="Publish blog posts and custom content pages on the Hobby plan and higher."`.

- [ ] **Step 4: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "settings/(blog|content)" || echo "no blog/content errors"`
Expected: `no blog/content errors`.

- [ ] **Step 5: Manual verification note**

Verify at execution: publishing a blog/content page as a Free store returns the 403/error; a Hobby store succeeds. Record the refusal.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/blog" "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/content"
git commit -m "feat(plans): gate blog/content authoring behind Hobby+"
```

---

### Task 10: Remove-branding on Pro only (storefront)

**Files:**
- Modify: `apps/storefront/components/store/store-footer.tsx` (banner + all "Powered by" lines conditional on Pro)
- Modify: `apps/web/lib/store-data.ts:165,323` (expose the tier on the store payload)

**Interfaces:**
- Consumes: the store payload now carries a `plan: Plan` (or a boolean `hideBranding`) in addition to `is_pro`.
- Produces: the storefront footer renders NO Menengai Cloud branding (neither the "Made for free" banner nor any "Powered by" line) only when the store is on Pro.

Decision: pass a boolean `hideBranding = plan === 'pro'` on the store payload to keep the storefront component simple and avoid leaking the plan vocabulary into the storefront. The web-side `store-data.ts` computes it.

- [ ] **Step 1: Confirm how the storefront store payload is built and where `is_pro` reaches the footer.**

Run: `grep -rn "is_pro\|store-footer\|StoreFooter" apps/storefront/components/store/store-footer.tsx apps/storefront/app | head -20`
Expected: shows the footer's `is_pro` prop origin (the store object passed to it).

- [ ] **Step 2: Add `hideBranding` to the store payload in `apps/web/lib/store-data.ts`.** The store select on line 165 already fetches `is_pro`; also fetch the plan. Simplest: in the returned store object (near line 323 where `is_pro: store.is_pro ?? false` is set), add `hideBranding` computed from the store's plan. Since `store-data.ts` runs server-side with a store id in scope, import `getStorePlan` from `@/lib/plans-server` and set:

```ts
import { getStorePlan } from '@/lib/plans-server'
// ...where the store object is assembled:
const plan = await getStorePlan(store.id)
// ...in the returned object, alongside is_pro:
hideBranding: plan === 'pro',
```

If `store-data.ts` feeds the storefront through a shared type, add `hideBranding: boolean` to that type.

- [ ] **Step 3: Make the footer branding conditional.** In `apps/storefront/components/store/store-footer.tsx`, the props type (line 7) has `is_pro: boolean`; add `hideBranding?: boolean`. Change the "Made for free" banner condition (line 83) from `{!store.is_pro && (` to `{!store.hideBranding && (`. For EACH unconditional "Powered by Menengai Cloud" block (lines ~139, ~187, ~241, ~284, ~327, ~370), wrap it in `{!store.hideBranding && ( ... )}`.

- [ ] **Step 4: Typecheck both apps compile.**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "store-data" || echo "web ok"` and `cd apps/storefront && npx tsc --noEmit 2>&1 | grep -E "store-footer" || echo "storefront ok"`
Expected: `web ok` and `storefront ok`.

- [ ] **Step 5: Manual verification note**

Verify at execution by rendering a storefront: a Pro store shows no "Made for free" banner and no "Powered by Menengai Cloud" anywhere in the footer; a Hobby or Free store still shows "Powered by". Screenshot both footers.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/components/store/store-footer.tsx apps/web/lib/store-data.ts
git commit -m "feat(plans): remove all storefront branding on Pro only"
```

---

### Task 11: Reassign WhatsApp gate to plan-aware

**Files:**
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/integrations/notifications/page.tsx` (the existing `<ProGate>`)

**Interfaces:**
- Consumes: `getStorePlan` (page server component); `ProGate` with `plan`/`requires`.
- Produces: WhatsApp notifications gate uses `requires="hobby"` driven by the store's real plan; confirm the notification-send path is server-guarded.

- [ ] **Step 1: Read the notifications page and its ProGate usage.**

Run: `cat "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/integrations/notifications/page.tsx"`
Expected: shows `<ProGate feature="WhatsApp order notifications" />` and whether it currently passes `isPro`.

- [ ] **Step 2: Pass the store's plan into the gate.** In the page server component, resolve the store id, call `getStorePlan(storeId)`, and pass `plan={plan} requires="hobby"` to `<ProGate>`. Import `getStorePlan` from `@/lib/plans-server`.

- [ ] **Step 3: Confirm/guard the send path.** Run `grep -rn "whatsapp\|order notification\|sendOrderNotification" apps/web/app/api apps/web/lib | head`. If a server route/function sends WhatsApp order notifications, add `if (!(await storeHasFeature(storeId, 'customDomain'))...)` — no: use a dedicated feature. Since WhatsApp maps to Hobby+ generally rather than a named `PlanFeatures` key, gate the send path with `planAllowsRequired(await getStorePlan(storeId), 'hobby')` (import from `@/lib/plans` + `@/lib/plans-server`); refuse to send below Hobby. If no server send path exists yet (settings-only), note that and skip.

- [ ] **Step 4: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "notifications" || echo "no notifications errors"`
Expected: `no notifications errors`.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/integrations/notifications"
git commit -m "feat(plans): drive WhatsApp gate from real plan (Hobby+)"
```

---

### Task 12: Two-SKU subscribe route (server grant)

**Files:**
- Modify: `apps/web/app/api/mobile/stores/[slug]/subscribe/route.ts:14,73-97`

**Interfaces:**
- Consumes: `planForSku` from `@/lib/plan-skus`.
- Produces: the subscribe route accepts either the Hobby or Pro SKU, writes the mapped `plan` to `store_subscriptions`, and sets `is_pro=true` for either. A `productId` matching neither SKU → 400.

- [ ] **Step 1: Replace the single-SKU constant (line 14) and the product check.**

Change:

```ts
const PRO_SKU = process.env.GOOGLE_PLAY_PRO_SKU
```

to:

```ts
import { planForSku } from '@/lib/plan-skus'

const HOBBY_SKU = process.env.GOOGLE_PLAY_HOBBY_SKU
const PRO_SKU = process.env.GOOGLE_PLAY_PRO_SKU
```

- [ ] **Step 2: Replace the `if (!PRO_SKU)` config guard (line 36) with a both-SKU guard:**

```ts
    if (!HOBBY_SKU && !PRO_SKU) return fail(500, 'No Google Play SKUs configured')
```

- [ ] **Step 3: Replace the product match + grant.** After verification (the block around lines 70-95), replace the `if (result.productId !== PRO_SKU)` check and the hardcoded `plan: 'pro'` upsert with the mapped plan:

```ts
    // Verify the token with Google before granting anything.
    const result = await verifyPlaySubscription(purchaseToken)
    if (!result.ok) return fail(502, result.error)
    if (!result.active) return fail(400, 'Subscription is not active')

    const plan = planForSku(result.productId ?? '', { hobby: HOBBY_SKU, pro: PRO_SKU })
    if (!plan) return fail(400, 'Unexpected product')

    await supabase
        .from('store_subscriptions')
        .upsert(
            {
                store_id: store.id,
                provider: 'google_play',
                google_play_purchase_token: purchaseToken,
                google_play_order_id: result.orderId,
                google_play_product_id: result.productId,
                plan,
                amount: 0,
                currency: 'KES',
                status: 'active',
                period_end: result.expiryTime,
            },
            { onConflict: 'google_play_purchase_token' }
        )

    await supabase.from('stores').update({ is_pro: true }).eq('id', store.id)

    return NextResponse.json({ ok: true, pro: true, plan, expiresAt: result.expiryTime })
```

- [ ] **Step 4: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "subscribe/route" || echo "no subscribe errors"`
Expected: `no subscribe errors`.

- [ ] **Step 5: Manual verification note**

Verify at execution (or with a mocked `verifyPlaySubscription`): Hobby SKU → `store_subscriptions.plan = 'hobby'` and `is_pro=true`; Pro SKU → `plan='pro'`; unknown SKU → 400.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/api/mobile/stores/[slug]/subscribe/route.ts"
git commit -m "feat(plans): map two Play SKUs to hobby/pro in subscribe route"
```

---

### Task 13: Admin grant named plan

**Files:**
- Modify: `apps/web/app/api/admin/stores/[id]/plan/route.ts:20-76`

**Interfaces:**
- Consumes: nothing new (validates plan inline).
- Produces: the admin `PATCH` accepts `action: 'grant'` with a `plan: 'hobby' | 'pro'` (default `'pro'` for back-compat), writes that plan onto the active `store_subscriptions` row, and sets `is_pro=true`. `revoke` unchanged.

- [ ] **Step 1: Parse and validate the plan.** Change the body parse (line 20) from `const { action } = await request.json()` to:

```ts
    const { action, plan: planInput } = await request.json()
    const plan: 'hobby' | 'pro' = planInput === 'hobby' ? 'hobby' : 'pro'
```

- [ ] **Step 2: Use `plan` in the grant branch.** In the grant branch, the existing-sub update (line 42-45) sets only `status: 'active'`; also set the plan:

```ts
        if (existingSub) {
            await supabase
                .from('store_subscriptions')
                .update({ status: 'active', plan })
                .eq('id', existingSub.id)
        } else {
```

and in the insert branch (line 52-62) change `plan: 'pro'` to `plan`.

- [ ] **Step 3: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "admin/stores/\[id\]/plan" || echo "no admin-plan errors"`
Expected: `no admin-plan errors`.

- [ ] **Step 4: Manual verification note**

Verify at execution: admin grant with `plan:'hobby'` sets the store's active subscription to hobby and `is_pro=true` (store resolves to Hobby via `getStorePlan`); grant with `plan:'pro'` → Pro; grant without `plan` → Pro (back-compat); revoke → Free.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/api/admin/stores/[id]/plan/route.ts"
git commit -m "feat(plans): admin can grant a named plan (hobby|pro)"
```

---

### Task 14: Mobile two-tier IAP + ProSheet

**Files:**
- Modify: `apps/mobile/src/lib/iap.ts` (fetch/offer both SKUs, purchase a chosen tier)
- Modify: `apps/mobile/src/components/ProSheet.tsx` (present both tiers with limits)
- Modify: `apps/mobile/src/lib/api.ts` (if `subscribePro` return type needs `plan`)

**Interfaces:**
- Consumes: env `EXPO_PUBLIC_PLAY_HOBBY_SKU`, `EXPO_PUBLIC_PLAY_PRO_SKU`.
- Produces: `useProIap()` exposes both products' prices and a `purchase(slug, tier: 'hobby' | 'pro')` that requests the chosen SKU. `ProSheet` shows both tiers (1500 / 3000 live prices) and their limits; selecting one runs its purchase.

This is the mobile counterpart; it has no `node:test` unit surface (RN/Expo). Verified by building the app.

- [ ] **Step 1: Generalize `iap.ts` to two SKUs.** Replace the single `SKU` constant (line 15) with:

```ts
const HOBBY_SKU = process.env.EXPO_PUBLIC_PLAY_HOBBY_SKU as string
const PRO_SKU = process.env.EXPO_PUBLIC_PLAY_PRO_SKU as string
const SKUS = [HOBBY_SKU, PRO_SKU].filter(Boolean)
```

Update `fetchProducts({ skus: [SKU], type: 'subs' })` (line 113) to `fetchProducts({ skus: SKUS, type: 'subs' })`. Expose per-tier products by finding each SKU in `subscriptions`. Change `purchasePro(slug)` to `purchase(slug, tier: 'hobby' | 'pro')` that selects the SKU + its offer token for the requested tier and drives the same verify-before-acknowledge flow. Keep the existing `pending`/`GrantError`/`handleSuccess` machinery unchanged; only the SKU chosen per call changes.

- [ ] **Step 2: Update `ProSheet.tsx` to show both tiers.** Replace the single `FEATURES` list + single Subscribe button with two tier cards (Hobby / Pro), each showing its live price (`hobbyProduct.displayPrice` / `proProduct.displayPrice`) and its limits/features, and a Subscribe button that calls `purchase(slug, 'hobby')` or `purchase(slug, 'pro')`. Keep the error/loading handling from the current sheet.

- [ ] **Step 3: Typecheck mobile compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep -E "iap|ProSheet" || echo "no mobile-iap errors"`
Expected: `no mobile-iap errors`.

- [ ] **Step 4: Manual verification note**

Verify by running the mobile app against a test Play account: both tiers show live prices; purchasing Hobby grants Hobby, purchasing Pro grants Pro (confirmed via the subscribe route from Task 12). Record both grants.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/iap.ts apps/mobile/src/components/ProSheet.tsx apps/mobile/src/lib/api.ts
git commit -m "feat(plans): mobile IAP + ProSheet support Hobby and Pro tiers"
```

---

### Task 15: Billing/settings dashboard — plan, limits, order nudge

**Files:**
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/billing/page.tsx` (show current plan + limits + monthly-order usage banner)

**Interfaces:**
- Consumes: `getStorePlan`, `PLAN_LIMITS`, `isOverLimit`.
- Produces: the billing page shows the store's current tier, its limits, and a soft nudge banner when this calendar month's order count exceeds `PLAN_LIMITS[plan].monthlyOrders`. The banner NEVER blocks anything.

- [ ] **Step 1: Read the billing page to see its current structure and data.**

Run: `cat "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/billing/page.tsx"`
Expected: shows how it currently reads `is_pro`/subscription and renders the billing UI.

- [ ] **Step 2: Resolve plan + month order count in the server component.** In the page, after the store id is known:

```ts
import { getStorePlan } from '@/lib/plans-server'
import { PLAN_LIMITS, isOverLimit } from '@/lib/plans'
import { createClient } from '@mcloud/db/server'
// ...
const plan = await getStorePlan(store.id)
const limits = PLAN_LIMITS[plan]
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
const supabase = await createClient()
const { count: monthOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store.id)
    .gte('created_at', monthStart)
    .not('status', 'in', '("cancelled","refunded")')
const overOrders = isOverLimit(monthOrders ?? 0, limits.monthlyOrders)
```

- [ ] **Step 3: Render the plan summary + nudge.** Add a section showing `plan`, `limits.products`/`members`/`monthlyOrders` (render `Infinity` as "Unlimited"), and, when `overOrders`, a banner: `You have passed your ${plan} plan's ${limits.monthlyOrders} orders this month. Your store keeps taking orders. Upgrade for higher limits.` (no dashes). Match the page's existing card/section styling.

- [ ] **Step 4: Typecheck compiles**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "settings/billing" || echo "no billing errors"`
Expected: `no billing errors`.

- [ ] **Step 5: Manual verification note**

Verify at execution: billing page shows the correct tier and limits; a store over its month order count shows the nudge banner and orders still work. Screenshot the banner.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/billing"
git commit -m "feat(plans): billing page shows plan, limits, and order nudge"
```

---

### Task 16: Data normalization check

**Files:**
- Create: `migrations/20260717_pricing_plan_normalize.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: a SQL script that backfills any active `store_subscriptions` row with a null/blank/unrecognized `plan` to `'pro'` (historically `is_pro=true` meant Pro), so tier derivation is consistent. No schema change.

- [ ] **Step 1: Write the migration.**

```sql
-- ============================================================================
-- Pricing plan normalization
--
-- Tier is now derived from store_subscriptions.plan on the active row. Every
-- row ever written used plan='pro', but guard against any null/blank/unknown
-- plan on an active row by backfilling to 'pro' (historically is_pro=true has
-- meant Pro). No schema change; idempotent.
-- ============================================================================

update public.store_subscriptions
set plan = 'pro'
where status = 'active'
  and (plan is null or plan not in ('hobby', 'pro'));
```

- [ ] **Step 2: Verify no unexpected active plans exist before applying (read-only).**

Run this via the Supabase SQL tooling: `select plan, count(*) from store_subscriptions where status = 'active' group by plan;`
Expected: only `pro` (and possibly some `null`) present. If any `hobby` already exist, they are left untouched by the migration.

- [ ] **Step 3: Commit the migration file.**

```bash
git add migrations/20260717_pricing_plan_normalize.sql
git commit -m "chore(plans): normalize active subscription plan values"
```

---

## Self-Review

**Spec coverage:**
- Three-tier model derived from `store_subscriptions` → Tasks 1, 3, 16. ✓
- Limits as code map → Task 1. ✓
- Products/members hard-enforced at create → Tasks 4, 5. ✓
- Monthly orders soft nudge, never blocks → Task 15. ✓
- Plan-aware feature gating shell → Task 6. ✓
- Custom domain gate (server + UI) → Task 7. ✓
- Advanced analytics gate (payload + UI) → Task 8. ✓
- Blog/content gate → Task 9. ✓
- Remove branding Pro-only incl. "Powered by" lines → Task 10. ✓
- WhatsApp reassignment + send-path guard → Task 11. ✓
- Two Play SKUs → plan (server) → Task 12; mobile → Task 14. ✓
- Admin grant named plan → Task 13. ✓
- Billing dashboard (plan/limits/nudge) → Task 15. ✓
- `is_pro` kept in sync → Tasks 12, 13 set it; reads untouched. ✓

**Placeholder scan:** No TBD/TODO. Tasks 8, 9, 11, 15 include a "read the file first" step because the exact insertion point depends on code not fully quoted here; each still specifies the exact guard code and expected outcome, so there is no undefined behavior, only a located insertion. This is acceptable per the "exact code shown" rule since the guard body is fully given.

**Type consistency:** `Plan`, `PlanLimits`, `PlanFeatures`, `FeatureKey`, `planFromActiveRow`, `isOverLimit`, `planHasFeature`, `planAllowsRequired`, `limitMessage` (Task 1) and `planForSku` (Task 2) are used with identical names/signatures in Tasks 3–15. `getStorePlan`/`storeHasFeature` (Task 3) are consumed consistently downstream. ✓
