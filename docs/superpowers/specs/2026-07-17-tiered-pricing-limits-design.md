# Tiered pricing with limits (Free → Hobby → Pro)

**Date:** 2026-07-17
**Status:** Design approved, pending spec review

## Problem

Pricing today is binary: `stores.is_pro` (boolean) + `pro_expires_at`. There is one
paid tier ("Pro"), and tiers differ only by **feature flags** (custom domain, advanced
analytics, remove branding, blog pages) enforced UI-side via `ProGate`/`ProLockRow`/
`isStorePro()`. There are no numeric limits anywhere, and there is no meaningful middle
rung. We want a sane three-tier ladder — **Free → Hobby (1500) → Pro (3000)** — where
tiers differ by real **quantities** as well as features, giving merchants a concrete
reason to step up each rung.

## Decisions (locked during brainstorming)

- **Three tiers:** Free → Hobby (1500) → Pro (3000). Free stays as the funnel.
- **Plans are store-scoped**, never org-scoped. A plan is app/store context — it lives
  with the store, matching where `is_pro` lives today.
- **Metered limits:** products per store, team members per store, monthly orders.
  (No "stores per org" limit — plans are store-scoped.)
- **Order cap is a soft nudge**, never a hard block. Checkout always goes through;
  merchants see an upgrade banner once over the monthly threshold. Only products and
  members are hard-enforced at create time.
- **Source of truth = `store_subscriptions`**, not a new `stores.plan` column.
- **Limits live in code** (`PLAN_LIMITS` map), not the DB — they are versioned config.
- **Two Google Play SKUs**, env-mapped to plans.

## The tiers

| Limit / feature            | Free | Hobby (1500) | Pro (3000) |
|----------------------------|------|--------------|------------|
| Products / store           | 20   | 200          | ∞          |
| Team members / store       | 1    | 3            | 10         |
| Monthly orders (soft nudge)| 50   | 500          | ∞          |
| Custom domain              | ✕    | ✓            | ✓          |
| Advanced analytics / funnel| ✕    | ✓            | ✓          |
| Blog / content pages       | ✕    | ✓            | ✓          |
| Remove branding            | ✕    | ✕            | ✓          |
| Priority support           | ✕    | ✕            | ✓          |

Rationale: Hobby unlocks the "real business" features (domain, analytics, blog) and 10×
the limits. Pro is about scale (unlimited products/orders, more seats) plus the two
prestige items (remove branding, priority support).

## Model & source of truth

A store's tier is **derived from its active `store_subscriptions` row**:

- Active row (`status='active'`) with `plan='pro'` → **Pro**
- Active row with `plan='hobby'` → **Hobby**
- No active row → **Free**

`store_subscriptions` already has every column needed (`store_id`, `plan` free-text,
`status`, `amount`, `currency`, `period_start`/`period_end`) and is `isOneToOne: false`,
so a store can carry a history of rows with one active.

`stores.is_pro` **stays** as a denormalized "on any paid tier" mirror, kept in sync by
the same routes that already set it (admin grant/revoke, Play subscribe). It answers the
cheap question "show paid features at all?" without a join. Where code needs the
*specific* tier (to check a limit or a Hobby-vs-Pro feature), it reads the active
subscription's `plan`.

**No new `stores.plan` column.** No schema change to `stores`.

### New helper

```ts
// apps/web/lib/plans.ts
export type Plan = 'free' | 'hobby' | 'pro'

/** Reads the store's active subscription; 'free' when none. */
export async function getStorePlan(storeId: string): Promise<Plan>
```

`isStorePro()` in `apps/web/lib/pro-gate.ts` stays (reads `is_pro`) — it is the
"paid or not" fast path and its ~30 call sites are unaffected.

## Limits as code config

```ts
// apps/web/lib/plans.ts
export interface PlanLimits {
  products: number        // Infinity for pro
  members: number
  monthlyOrders: number   // soft nudge threshold; never enforced
  features: {
    customDomain: boolean
    advancedAnalytics: boolean
    removeBranding: boolean
    blogPages: boolean
    prioritySupport: boolean
  }
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:  { products: 20,       members: 1,  monthlyOrders: 50,       features: { customDomain: false, advancedAnalytics: false, removeBranding: false, blogPages: false, prioritySupport: false } },
  hobby: { products: 200,      members: 3,  monthlyOrders: 500,      features: { customDomain: true,  advancedAnalytics: true,  removeBranding: false, blogPages: true,  prioritySupport: false } },
  pro:   { products: Infinity, members: 10, monthlyOrders: Infinity, features: { customDomain: true,  advancedAnalytics: true,  removeBranding: true,  blogPages: true,  prioritySupport: true  } },
}
```

## Enforcement (three shapes)

### 1. Products / members — hard, at create time

The check goes in the **shared** merchant logic so web server actions and mobile API
both get it (they already share `lib/merchant/*`):

- **Products:** in `apps/web/lib/merchant/products.ts` (product create path — also used by
  `apps/web/app/api/mobile/stores/[slug]/products/route.ts`). Before insert: resolve the
  store's plan, count existing products, reject at/over `PLAN_LIMITS[plan].products` with
  a structured error the callers surface as *"You've reached your {plan} limit of N
  products. Upgrade to add more."*
- **Members:** in `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/members/
  actions.ts` (member add path). Same pattern against `PLAN_LIMITS[plan].members`.

`Infinity` limits short-circuit the count query (no DB hit for Pro).

### 2. Monthly orders — soft, dashboard nudge

Never blocks checkout. A dashboard banner appears once the current calendar month's
order count for the store exceeds `PLAN_LIMITS[plan].monthlyOrders`. The count reuses the
same order-counting the analytics RPC already does for the store; surfaced in the
billing/settings area, not the storefront.

### 3. Feature flags — plan-aware gating (gate ALL features this project)

**Reality check:** only ONE feature is actually gated in the codebase today — WhatsApp
order notifications (`settings/integrations/notifications/page.tsx`, the single real
`<ProGate>`). The other four features in the tier table are advertised in the
`PRO_FEATURES` marketing array but **have no enforcement**. This project adds the missing
gates. Each gate needs a **server-side** check where the feature is actually actioned;
UI-only blur/lock is bypassable via the API and is presentation, not enforcement.

The shared plumbing: extend `ProGate`/`ProGateInline`/`ProLockRow` from a boolean `isPro`
to a `requires: 'hobby' | 'pro'` prop (`'hobby'` = hobby-or-better, `'pro'` = pro-only).
Existing `isPro` call sites map to `requires: 'hobby'`. A server helper
`storeHasFeature(storeId, feature)` resolves the plan and reads `PLAN_LIMITS[plan].features`.

Per feature:

- **WhatsApp order notifications** — already gated (UI). Reassign to `requires: 'hobby'`.
  Confirm the notification-send path is also guarded server-side, not just the settings UI.
- **Custom domain** — UI: `requires: 'hobby'` on the domain settings.
  **Server (required):** `apps/web/app/api/store/domain/route.ts` POST currently writes
  `custom_domain` with no plan check — add a `storeHasFeature(store, 'customDomain')`
  guard, 403 below Hobby. This is the load-bearing gate; the UI lock is cosmetic.
- **Advanced analytics / funnel** — UI: gate the analytics settings page /
  `analytics-client.tsx` with `requires: 'hobby'`.
  **Server:** the analytics route (`apps/web/app/api/store/[slug]/analytics/route.ts`)
  should refuse (or return a restricted payload) for below-Hobby stores so the funnel/
  advanced breakdowns aren't fetchable directly. Decide during implementation whether
  Free gets a basic subset (views/orders) vs. nothing — default: basic subset, advanced
  blocks (funnel, by_source/by_country/top_products) require Hobby.
- **Blog / content pages** — UI: `requires: 'hobby'` on `settings/blog` and
  `settings/content`. **Server:** guard the blog/content create/publish mutation so pages
  can't be authored below Hobby. (No existing plan check found in these routes.)
- **Remove branding** — `requires: 'pro'` (Pro only, per the tier table).
  **Reality:** `apps/storefront/components/store/store-footer.tsx` today hides only the
  "Made for free on…" banner when `!is_pro`, but every theme *also* renders an
  unconditional "Powered by Menengai Cloud" line. To make "remove branding" real: (a)
  change the banner condition from `!is_pro` to `plan !== 'pro'`, and (b) make the
  "Powered by" line conditional on `plan !== 'pro'` too. Storefront reads plan via the
  store payload (`store-data.ts`), which must now expose the tier, not just `is_pro`.
- **Priority support** — not a code feature; it is an ops/SLA promise surfaced as a
  billing-page line item for Pro. No gate to build.

## Google Play / purchase flow

Two SKUs, env-mapped:

- `GOOGLE_PLAY_HOBBY_SKU` / `GOOGLE_PLAY_PRO_SKU` (server, in `subscribe/route.ts`)
- `EXPO_PUBLIC_PLAY_HOBBY_SKU` / `EXPO_PUBLIC_PLAY_PRO_SKU` (mobile, in `iap.ts`)

**Subscribe route** (`apps/web/app/api/mobile/stores/[slug]/subscribe/route.ts`): match
the verified `productId` against **both** SKUs, map to the corresponding `plan`
(`'hobby'` | `'pro'`), write that `plan` to `store_subscriptions`, and set `is_pro=true`
for either. Reject a productId that matches neither.

**Mobile IAP** (`apps/mobile/src/lib/iap.ts`): today `useProIap()` is single-SKU,
resolves `{ pro: boolean }`, calls `subscribePro`. Generalize to fetch/offer both SKUs
and purchase a chosen tier; `ProSheet.tsx` shows both tiers (1500 / 3000) with their
limits. The verify-before-acknowledge safety flow is unchanged.

**Admin plan route** (`apps/web/app/api/admin/stores/[id]/plan/route.ts`): today
grant/revoke pro only. Extend `action` to grant a named plan (`'hobby'` | `'pro'`) — sets
`is_pro` and writes/updates the active `store_subscriptions` row with the right `plan`.
Revoke unchanged (cancels active row, `is_pro=false` → Free).

## Surfaces to update

**Plan plumbing**
- `apps/web/lib/plans.ts` — **new**: `Plan`, `PlanLimits`, `PLAN_LIMITS`, `getStorePlan()`,
  `storeHasFeature(storeId, feature)`.
- `apps/web/components/pro/index.tsx` — plan-aware gating (`requires: 'hobby' | 'pro'`).

**Numeric limits (hard, create-time)**
- `apps/web/lib/merchant/products.ts` — product create-time limit check.
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/members/actions.ts` —
  member add-time limit check.

**Feature gates (UI + server)**
- WhatsApp: `settings/integrations/notifications/page.tsx` → `requires: 'hobby'`; confirm
  the notification-send path is server-guarded.
- Custom domain: `apps/web/app/api/store/domain/route.ts` POST server guard + UI lock on
  domain settings.
- Analytics: `apps/web/app/api/store/[slug]/analytics/route.ts` restricted payload below
  Hobby + UI gate on `analytics-client.tsx`.
- Blog/content: server guard on the blog/content publish mutation + UI gate on
  `settings/blog` and `settings/content`.
- Remove branding: `apps/storefront/components/store/store-footer.tsx` (banner +
  "Powered by" conditional on `plan !== 'pro'`); `apps/web/lib/store-data.ts` must expose
  the tier to the storefront payload, not just `is_pro`.

**Purchase / admin**
- `apps/web/app/api/mobile/stores/[slug]/subscribe/route.ts` — two-SKU → plan mapping.
- `apps/web/app/api/admin/stores/[id]/plan/route.ts` — grant named plan.
- `apps/mobile/src/lib/iap.ts` + `apps/mobile/src/components/ProSheet.tsx` — two tiers.

**Dashboard**
- Billing/settings — show current plan, its limits, and the monthly-order usage nudge banner.

## Migration / data

- **No schema change** to `stores` or `store_subscriptions`.
- Normalize existing `store_subscriptions.plan` values: every current active row is `'pro'`
  (the only value ever written), which already maps correctly. Verify no stray/blank
  `plan` values on active rows; if any exist, backfill to `'pro'` since `is_pro=true`
  stores have historically meant Pro.
- No data migration for Free stores — absence of an active row already = Free.

## Testing

- `PLAN_LIMITS` shape + `getStorePlan()` derivation (active-pro → pro, active-hobby →
  hobby, none → free, cancelled row → free).
- Product create: allowed under limit, rejected at limit, unlimited for pro.
- Member add: same three cases.
- Monthly-order nudge: banner threshold logic (over/under/unlimited), no checkout block.
- Subscribe route: hobby SKU → plan hobby, pro SKU → plan pro, unknown SKU → 400.
- Admin route: grant hobby, grant pro, revoke → free.
- Feature gates (server-side, the load-bearing checks): domain POST 403 below Hobby;
  analytics route returns restricted payload below Hobby; blog/content publish blocked
  below Hobby; storefront omits branding for `plan === 'pro'`. Each verified by hitting the
  route/render directly, not just the UI lock.

## Out of scope (YAGNI)

- Overage billing for orders (chose soft cap).
- Org-level plans (plans are store-scoped).
- Stores-per-org limit.
- Web self-serve payment (purchase stays mobile/Play + admin grant, unchanged posture).
- Proration / mid-cycle tier switching mechanics beyond what Play handles natively.
