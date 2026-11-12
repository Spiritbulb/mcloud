# Dashboard Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setup checklist, doc help links, a 14-day trend and spot illustrations on the store dashboard; "NGO" out of user-facing copy.

**Architecture:** Pure logic in `*-logic.ts` files with sibling tests; `getStoreOverview` gains the data; one store-scoped server action persists `settings.setup_checklist`; Overview UI composes kit pieces.

**Tech Stack:** Next 16, React 19, TypeScript 6, Tailwind 4, node:test.

**Spec:** `docs/superpowers/specs/2026-11-12-dashboard-guidance-design.md`

## Global Constraints

- Vertical id `ngo` unchanged; user-visible text never says "NGO" (except the web guide, out of scope).
- Doc URLs only from this allow-list (live on 2026-11-12): `/docs/{analytics,billing,blog,customers,delivery,domain,editor,general,members,orders,overview,payments,products,reach,services,socials,tracking}` and guides `accept-mpesa-payments-on-your-website`, `collect-donations-online-for-your-ngo`, `custom-domain-for-your-business-website`, `start-an-online-shop-in-kenya`.
- Doc links built with `webUrl()`, opened in a new tab via `openExternal` (TWA).
- No migration: state lives in `stores.settings.setup_checklist = { hidden?: true, link_shared?: true }`.
- Days bucket on Africa/Nairobi (UTC+3, no DST).
- Machine has 7 GB RAM: run turbo with `--concurrency=1`.

## Review Focus

1. `stores.settings` null or missing `setup_checklist` → merge creates the object, keeps other keys (test in Task 4).
2. Staff (non-manager) clicks Hide → action returns `{ok:false}`, panel stays visible, no crash (Task 6 restores state on failure).
3. Order at 23:30 UTC (02:30 Nairobi next day) → counted on the Nairobi day (test in Task 3).
4. Store currency USD → trend total uses store currency (Task 6 uses `formatCurrency(total, currency)`).
5. Cancelled/refunded/pending commerce orders and non-completed donations → excluded from trend (test in Task 3).

---

### Task 1: Copy — "NGO" to "Non-profit"

**Files:** Modify `packages/verticals/src/index.ts`, `packages/verticals/src/index.test.ts`, `apps/storefront/app/(marketing)/start/start-client.tsx`, `apps/storefront/app/(marketing)/page.tsx`, `apps/storefront/app/(marketing)/layout.tsx`, `apps/storefront/lib/theme-presets.ts`

- [ ] Update test: `assert.equal(VERTICALS.ngo.label, 'Non-profit')`; run `npm test -w @mcloud/verticals` → FAIL.
- [ ] Set label `'Non-profit'`; strings per spec §4. Run tests → PASS. Grep storefront/verticals for remaining visible `NGO`.
- [ ] Commit `refactor(copy): say non-profit, not NGO`.

### Task 2: Help links + PageHeader `help`

**Files:** Create `apps/storefront/lib/help-links.ts`, `apps/storefront/lib/help-links.test.ts`; modify `packages/ui/src/kit/page-header.tsx`; pages that render `PageHeader` for mapped tabs.

**Produces:** `HELP_DOCS: Record<HelpTab, string>` (path, e.g. `/docs/delivery`), `helpPath(tab: string): string | null`, `helpFor(tab: string): { href: string; label: string } | undefined` (href = `webUrl(path)`, label `'Help'`); `PageHeader` prop `help?: { href: string; label?: string }`.

- [ ] Test: every value in `HELP_DOCS` is in the allow-list; `helpPath('logistics') === '/docs/delivery'`; `helpPath('nope') === null`.
- [ ] Implement map: products, orders, customers, payments, logistics→delivery, general, brand→general, domain, editor, analytics, blog, members, services, tracking, reach, socials.
- [ ] PageHeader renders `help` as a small external link (`menu_book` icon, `target=_blank rel=noopener noreferrer`) after the description.
- [ ] Wire `help={helpFor(...)}` into each mapped page header (product-settings, order-settings, domain-settings, service-settings, logistics, blog, customers, members, analytics, tracking, general, brand, reach, integrations layout→payments only on the payments tab is overkill: integrations layout uses `payments`).
- [ ] typecheck storefront; commit `feat(settings): help links to docs on settings pages`.

### Task 3: Daily series

**Files:** Create `packages/merchant/src/overview-series.ts`, `.test.ts`.

**Produces:** `type DailyPoint = { date: string; amount: number; count: number }`; `dailySeries(orders: { total: number|null; status: string|null; created_at: string; metadata?: unknown }[], opts: { days: number; now: Date; commerce: boolean }): DailyPoint[]` — `days` entries oldest first, `date` = Nairobi `YYYY-MM-DD`, gaps 0. Commerce counts status in `paid, processing, shipped, delivered`; non-commerce counts donations (`isDonation` true/'true' and `payment_status === 'completed'`).

- [ ] Tests: length 14 and last date = Nairobi today; 23:30Z lands on next Nairobi day; pending/cancelled/refunded ignored; donation rules; outside window ignored.
- [ ] Implement; tests pass; commit `feat(merchant): daily order series for the overview`.

### Task 4: Checklist logic

**Files:** Create `apps/storefront/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/setup-checklist-logic.ts`, `.test.ts`.

**Produces:**
- `type ChecklistState = { hidden?: boolean; link_shared?: boolean }`
- `type ChecklistInput = { productCount; campaignCount; paymentsEnabled; deliveryZoneCount; hasLogo; orderCount; customDomainSet; linkShared }`
- `type ChecklistStep = { id: 'product'|'campaign'|'payments'|'delivery'|'logo'|'share'|'domain'; title; description; done; optional; tab: string | null; docPath: string }`
- `checklistSteps(input, commerce): ChecklistStep[]`, `checklistProgress(steps): { done: number; total: number; complete: boolean }` (optional excluded)
- `readChecklistState(settings: unknown): ChecklistState`, `mergeChecklistState(settings: unknown, patch: ChecklistState): Record<string, unknown>`

- [ ] Tests: commerce ids `[product,payments,delivery,logo,share]`; non-commerce `[campaign,payments,logo,share,domain]` with domain optional; share done by orders or linkShared; progress excludes optional; every docPath in allow-list; merge on null settings and keeps other keys; no step copy contains "NGO".
- [ ] Implement (copy from spec table); commit `feat(settings): setup checklist logic`.

### Task 5: Data + action

**Files:** Modify `packages/merchant/src/store-data.ts` (getStoreOverview); create `apps/storefront/lib/admin/setup-checklist-actions.ts`.

**Produces:** overview `store.id`, `store.delivery_zone_count`, `store.setup_checklist: ChecklistState`, top-level `daily: DailyPoint[]` (14 days); `updateSetupChecklist(storeId: string, patch: { hidden?: boolean; link_shared?: boolean }): Promise<ActionResult>`.

- [ ] Overview: add `delivery_zones` head count; orders query adds `created_at`; compute `daily` via `dailySeries` with `commerce = getVertical(store.type).commerce`.
- [ ] Action: `requireManagedStore`, read `settings` for `gate.storeId`, write `mergeChecklistState` (only boolean `true` keys accepted), scoped `.eq('id', gate.storeId)`.
- [ ] typecheck; commit `feat(settings): overview data and action for setup checklist`.

### Task 6: Illustrations + Overview UI

**Files:** Create `packages/ui/src/kit/illustrations.tsx`; modify `packages/ui/src/kit/empty-state.tsx`; create `settings/setup-checklist.tsx`, `settings/trend-panel.tsx`; modify `settings/settings-home-client.tsx`.

**Produces:** `Illustration({ name: 'setup'|'all-done'|'first-sale'|'first-donation', className? })`; `EmptyState` prop `illustration?: ReactNode`.

- [ ] Illustrations: inline SVG, `aria-hidden`, `currentColor` strokes, `var(--primary)` fills at low opacity, ~96px.
- [ ] SetupChecklist: progress ring, rows, "Learn how" (openExternal), Hide (optimistic; restore + show error on `ok:false`), all-done state.
- [ ] TrendPanel: total over 14 days in store currency + Sparkline; render only when `order_count > 0`.
- [ ] Overview: remove "Set up payments" panel; add checklist (hidden when `setup_checklist.hidden`); CopyLink calls `updateSetupChecklist(id, {link_shared:true})` once; empty states use illustrations.
- [ ] `npx turbo run typecheck lint test --concurrency=1` → all pass; commit `feat(settings): setup checklist, trend and illustrations on overview`.

### Task 7: Verify in the app

- [ ] `/run-mcloud` screenshots: new shop, non-profit, store with sales; light + dark. Fix issues; commit if any.
