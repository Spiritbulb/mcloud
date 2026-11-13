# Billing Upgrade Path and Staging Awareness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web knows when it is the staging deployment (no crawling, visible bar, its own M-PESA callback); org Billing lets people top up straight from a shortfall and shows what each plan gives.

**Architecture:** Pure helpers in `@mcloud/merchant`, `wallet-math.ts` (`deploy-env.ts`) and in Billing's `billing-logic.ts`, each with a sibling test. Thin wiring in robots/sitemap/layout/next.config, the two STK push routes, and `billing-client.tsx`.

**Tech Stack:** Next 16, React 19, TypeScript 6, node:test.

**Spec:** `docs/superpowers/specs/2026-11-13-billing-and-staging-design.md`

## Global Constraints

- Setting: `NEXT_PUBLIC_DEPLOY_ENV`; only the exact value `staging` means staging. Unset = production, behaviour unchanged.
- Production must behave exactly as before when the setting is absent (callback stays `https://mcloud.co.ke/api/payments/mpesa/callback` when origin env is unset).
- Phase 1 (Tasks 1–2) on `chore/staging-env` off `main`, fast-forwarded into `main`; Phase 2 (Tasks 3–4) on `feat/dashboard-guidance` after merging `main`.
- No attribution lines in commits. Turbo with `--concurrency=1` (7 GB RAM).
- Copy never says "NGO".

## Review Focus

1. `NEXT_PUBLIC_ADMIN_ORIGIN` set with a trailing slash or path → callback is still `<origin>/api/payments/mpesa/callback` (Task 1 test).
2. `NEXT_PUBLIC_DEPLOY_ENV="Staging "` or `"production"` → not staging; only exact `staging` (Task 1 test).
3. Shortfall of KSh 3 → top-up amount 20, the M-PESA minimum (Task 3 test).
4. Visitor closes the top-up box without sending → no polling, no confirm opens (Task 4).
5. Balance arrives but a second purchase is already in progress, or the 2-minute window ends → no confirm opens twice; timeout message shown once (Task 4).

---

## Phase 1: staging (branch `chore/staging-env`)

### Task 1: Deploy-env helpers + M-PESA callback

**Files:**
- Create: `packages/merchant/src/deploy-env.ts`, `packages/merchant/src/deploy-env.test.ts`
- Modify: `apps/web/app/api/payments/mpesa/stk-push/route.ts:134`, `apps/storefront/app/api/store/[slug]/payments/mpesa/stk-push/route.ts:88`

**Interfaces:**
- Produces: `isStaging(value?: string | undefined): boolean` (default arg `process.env.NEXT_PUBLIC_DEPLOY_ENV`); `mpesaCallbackUrl(origin?: string | null): string`.

- [ ] **Step 1: Failing tests** in `deploy-env.test.ts`:
  - `isStaging('staging') === true`; `isStaging(undefined)`, `isStaging('production')`, `isStaging('Staging ')` all `false`.
  - `mpesaCallbackUrl(undefined) === 'https://mcloud.co.ke/api/payments/mpesa/callback'`
  - `mpesaCallbackUrl('https://staging.mcloud.co.ke/') === 'https://staging.mcloud.co.ke/api/payments/mpesa/callback'`
  - `mpesaCallbackUrl('https://staging.mcloud.co.ke/some/path') === 'https://staging.mcloud.co.ke/api/payments/mpesa/callback'`
  - `mpesaCallbackUrl('not a url') === 'https://mcloud.co.ke/api/payments/mpesa/callback'`
- [ ] **Step 2:** `cd packages/merchant && node --import ../../scripts/ts-resolve.mjs src/deploy-env.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement (use `new URL(origin).origin`, fall back on throw).
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Web route: `mpesaCallbackUrl(process.env.NEXT_PUBLIC_ADMIN_ORIGIN)`. Storefront route: `mpesaCallbackUrl(webAppOrigin())` (`@/lib/host`), since the callback is a web route. Keep the two routes otherwise identical.
- [ ] **Step 6:** Commit `feat(env): know the staging deployment; M-PESA callback follows the app origin`.

### Task 2: Keep crawlers off staging; staging bar

**Files:**
- Modify: `apps/web/app/robots.ts`, `apps/web/app/sitemap.ts`, `apps/web/app/layout.tsx`, `apps/web/next.config.ts`, `docs/environment.md`
- Create: `apps/web/components/staging-bar.tsx`

**Interfaces:** Consumes `isStaging()` from Task 1.

- [ ] **Step 1:** `robots()` returns `{ rules: { userAgent: '*', disallow: '/' } }` when `isStaging()`; `sitemap()` returns `[]`.
- [ ] **Step 2:** `layout.tsx`: when staging, `metadata.robots = { index: false, follow: false }` and render `<StagingBar />` as the first child of `<body>`: one line, "Staging: not the live site", amber background, black text, `role="note"`, not dismissable, not fixed (pushes content down).
- [ ] **Step 3:** `next.config.ts` `headers()`: when staging, add `{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }` (merge with any existing headers).
- [ ] **Step 4:** `docs/environment.md` shared table: `NEXT_PUBLIC_DEPLOY_ENV`: `staging` on the staging deployment (no crawling, Staging bar, M-PESA callback to its own origin); unset in production. Inlined at build. Note staging also needs `NEXT_PUBLIC_ADMIN_ORIGIN=https://staging.mcloud.co.ke` and `DARAJA_ENV` sandbox.
- [ ] **Step 5:** Verify: `npx turbo run typecheck lint test --concurrency=1` → 0 errors, all pass. Then `NEXT_PUBLIC_DEPLOY_ENV=staging` dev run of web: `curl localhost:3000/robots.txt` shows `Disallow: /`, `curl -I` shows `X-Robots-Tag`; without it robots is unchanged.
- [ ] **Step 6:** Commit `feat(web): keep crawlers off staging and mark it with a bar`.
- [ ] **Step 7:** `git switch main && git merge --ff-only chore/staging-env && git push origin main`; then `git switch feat/dashboard-guidance && git merge main`.

## Phase 2: Billing (branch `feat/dashboard-guidance`)

### Task 3: Billing logic: top-up amount, plan benefits, button label

**Files:** Modify `apps/web/app/(merchant)/org/[orgSlug]/(org)/billing/billing-logic.ts`, `billing-logic.test.ts`

**Interfaces:**
- Produces: `topupAmountFor(balanceKes: number, priceKes: number): number` (0 when covered; else `max(20, ceil(price − balance))`); `planBenefits(plan: PaidPlan): string[]` (exactly 2 lines, from `PLAN_LIMITS`); `planButtonLabel(current: string | null | undefined, plan: PaidPlan): string` = `` `${planActionLabel(current, plan)} · ${formatKes(PLAN_PRICE_KES[plan])}/mo` ``.

- [ ] **Step 1: Failing tests:** `topupAmountFor(500, 795) === 295`; `topupAmountFor(792, 795) === 20`; `topupAmountFor(800, 795) === 0`; `topupAmountFor(0, 795.4) === 796`. `planBenefits('hobby')` has length 2, mentions "domain" and "200 products"; `planBenefits('pro')` length 2, mentions "Unlimited products" and "branding"; neither contains "NGO". `planButtonLabel(null, 'hobby') === 'Choose Hobby · KSh 795/mo'`.
- [ ] **Step 2:** `cd apps/web && node --import ../../scripts/ts-resolve.mjs "app/(merchant)/org/[orgSlug]/(org)/billing/billing-logic.test.ts"` → FAIL.
- [ ] **Step 3:** Implement. Benefit copy: Hobby → "Your own domain, analytics and a blog" / "Up to 200 products and 3 team members"; Pro → "Everything in Hobby, without our branding" / "Unlimited products, 10 team members, priority support". Build the numbers from `PLAN_LIMITS` (Infinity → "Unlimited").
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Commit `feat(billing): top-up amount and plan benefits`.

### Task 4: Billing UI: plans panel, priced buttons, top up from the shortfall

**Files:** Modify `apps/web/components/topup-modal.tsx`, `apps/web/app/(merchant)/org/[orgSlug]/(org)/billing/billing-client.tsx`

**Interfaces:** Consumes Task 3. Produces `WalletTopupModal` prop `initialAmountKes?: number` (sets the amount field whenever the modal opens; default stays 750).

- [ ] **Step 1:** `WalletTopupModal`: add `initialAmountKes`; reset `amount`, `sent`, `error` each time `open` turns true.
- [ ] **Step 2:** Billing: "Plans" `Panel` above "Store plans" with two cards (Hobby, Pro): name, `formatKes(price)/mo`, `planBenefits` lines. Plan buttons use `planButtonLabel`; drop `title`.
- [ ] **Step 3:** Shortfall: store errors as `{ message, plan }` per store. When the error comes from the shortfall and `canManage`, render a "Top up {formatKes(topupAmountFor(...))} with M-PESA" button under the message. Clicking it sets `awaiting = { storeId, plan }` and opens the modal with that amount.
- [ ] **Step 4:** `onTopupInitiated` while `awaiting` is set: poll `refreshBalance` every 5 s, max 24 times. When the balance ≥ price, stop, clear the store's error and `setConfirming({ store, plan })`. On the 24th miss, stop and set the error to "We haven't received the payment yet. It can take a minute; try the plan again once your balance updates." Closing the modal before sending clears `awaiting`. Clear the interval on unmount. Without `awaiting` (header "Add funds"), keep the single 15 s refresh.
- [ ] **Step 5:** `npx turbo run typecheck lint test --concurrency=1` → all pass, no new warnings.
- [ ] **Step 6:** `/run-mcloud`: Billing at 390px and 1280px, light and dark; short wallet → shortfall shows the top-up button with the right amount. Fix issues.
- [ ] **Step 7:** Commit `feat(billing): plans panel, priced buttons and top up from the shortfall`.

### Task 5: KSh 3 top-up service fee

**Files:** Modify `apps/web/lib/wallet-math.ts`, create `apps/web/lib/wallet-math.test.ts` (or extend if present); modify `apps/web/app/api/org/[orgSlug]/wallet/topup/route.ts`, `apps/web/app/api/webhooks/palpluss/route.ts`, `apps/web/components/topup-modal.tsx`, `docs/payments.md`

**Interfaces:**
- Produces: `TOPUP_FEE_KES = 3`; `topupChargeKes(amountKes: number): number` (= amount + 3); `topupCreditCents(confirmedCents: number, requestedCents: number): number` (= confirmed − min(max(confirmed − requested, 0), 300)).

- [ ] **Step 1: Failing tests:** `topupChargeKes(500) === 503`; `topupCreditCents(50300, 50000) === 50000`; `topupCreditCents(50000, 50000) === 50000` (pre-fee top-up); `topupCreditCents(50100, 50000) === 50000`; `topupCreditCents(60300, 50000) === 60000` (overpaid: keep the extra); `topupCreditCents(40000, 50000) === 40000` (underpaid: credit what was paid).
- [ ] **Step 2:** `cd apps/web && node --import ../../scripts/ts-resolve.mjs lib/wallet-math.test.ts` → FAIL.
- [ ] **Step 3:** Implement in `wallet-math.ts`.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Route: `initiateStkPush({ amountKes: topupChargeKes(amountKes), ... })`; `createPendingTopup` keeps `kesToCents(amountKes)`. Webhook: `amountCents = topupCreditCents(Math.round(confirmed.amount * 100), topup.amount_cents)` (ensure `getTopupByPalplussTransactionId` selects `amount_cents`). Modal: under the amount field show "M-PESA fee KSh 3 · You pay KSh {amount + 3}"; submit label "Pay KSh {amount + 3}". `docs/payments.md`: one paragraph on the fee and the credit rule.
- [ ] **Step 6:** `npx turbo run typecheck lint test --concurrency=1` → all pass.
- [ ] **Step 7:** Commit `feat(wallet): KSh 3 M-PESA fee on top-ups, paid by the person topping up`. Tick F1 and F2 in the funnel audit README ("What feeds the next sub-projects").
