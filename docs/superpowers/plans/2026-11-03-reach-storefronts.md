# Reach storefronts, store management and Supabase shoppers: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reach shoppers sign in with Supabase and can browse per-store pages and their order
history. Reach vendors (WorkOS) can create, list and manage stores, including their web
storefront orders.

**Architecture:** New `customer`-kind routes under `/api/mobile/reach/shop/*`, gated by
verifying a Supabase bearer token. The vendor side reuses `/api/mobile/stores/[slug]/*` and adds
`/api/mobile/reach/vendor/{stores,store,keys}` on top of listing logic moved into
`@mcloud/merchant`. Native Expo screens in `~/reach` call these routes. Checkout amounts and
escrow are unchanged.

**Tech Stack:** Next 16 route handlers, Supabase (service role and publishable key), `node:test`,
Expo SDK 57 / expo-router, `@supabase/supabase-js`.

**Spec:** `docs/superpowers/specs/2026-11-03-reach-storefronts-design.md`

## Global Constraints

- The machine is slow. Run one command at a time, test one workspace or file at a time, and run
  `npx turbo run build` once, in the final task only.
- Every new `app/api/**/route.ts` starts with `// @route-kind: <kind>`. Shop routes use
  `customer`; vendor routes use `mobile`.
- Shopper identity (`auth_user_id`, `email`) comes only from the verified token, never from the
  request body. Store, vendor and customer ids are never read from the body.
- Charge amounts come from stored products (`priceForBuyer`) only, and the escrow and payout
  logic is unchanged.
- `reach_*` and `reach_shoppers` are service-role only (RLS on, no policies, revoked from
  `anon` and `authenticated`).
- Match the surrounding file's style. mcloud web uses 4-space indentation with no semicolons;
  Reach uses 2-space indentation with semicolons and single quotes.
- Commits use `type(scope): summary` and end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Reach: run `npx tsc --noEmit` and `npx expo lint` before each Reach commit. Install packages
  with `npx expo install`.

## Review Focus

1. An unconfirmed Supabase email matching a WorkOS buyer must **not** link (an account
   takeover vector). Pinned in the Task 2 tests.
2. A WorkOS user whose platform role is `admin`, or who is a Reach vendor, must never be linked
   as a shopper. Pinned in Task 2.
3. A shopper fetching `shop/orders/[orderNumber]` for another shopper's order gets a 404, not
   the order. Pinned in Task 5 (`orderVisibleTo`).
4. An owner-member removed from the org loses vendor access, even with no key involved. Pinned
   in Task 7 (`membershipActive`).
5. Retrying one-step setup after a partial failure must not create a second org or store.
   Pinned in Task 7 (`planOneStepSetup`).

---

## Phase A: mcloud server

### Task 1: Migration

**Files:**
- Create: `migrations/20261103_reach_shoppers.sql`

**Produces:**
- Table `reach_shoppers(id uuid pk, auth_user_id uuid unique not null, email text not null, name text, mpesa_number text, legacy_user_id text unique references users(id) on delete set null, created_at, updated_at)`
- `reach_payments.shopper_id uuid references reach_shoppers(id) on delete set null`, with
  `reach_payments.user_id` made nullable
- Index `orders_store_customer_idx on orders(store_id, customer_id)`
- `reach_vendor_members.key_id` made nullable
- Function `reach_join_as_owner(p_user_id text, p_vendor_id uuid) returns text`: security
  definer, `search_path public`. It raises `no_user` if the user doesn't exist, and
  `role_conflict` if `reach_users.role = 'buyer'`. It upserts `reach_users(role 'vendor')`,
  upserts `reach_vendor_members(user_id, vendor_id, key_id null)` on conflict `(user_id)`, and
  returns `'rch-vendor'`.

- [ ] **Step 1:** Write the SQL. Make it additive and idempotent (`if not exists`,
  `create or replace`), with a header comment in the style of `20261015_reach_store_link.sql`
  explaining the why. Copy the guard style from `reach_confirm_vendor` in that file.
- [ ] **Step 2:** Check that it parses by eye against the existing migrations. It isn't applied
  here, since migrations are applied manually.
- [ ] **Step 3:** Commit `feat(reach): migration for Supabase shoppers and owner members`.

### Task 2: Shopper pure logic

**Files:**
- Create: `apps/web/lib/reach/shop-logic.ts`
- Test: `apps/web/lib/reach/shop-logic.test.ts`

**Produces:**
- `decideLegacyLink(input: { emailConfirmed: boolean; candidate: { userId: string; platformRole: string | null; reachRole: string | null; alreadyLinked: boolean } | null }): string | null`
  returns the user id to link, or null.
- `validateShopperProfile(body: unknown): { ok: true; name?: string; mpesaPhone?: string } | { ok: false; error: string }`
  checks a name of 2–80 characters and a phone via `normalizeKenyanMobile` from
  `@mcloud/merchant/reach`.
- `mergeOrderHistory<T extends { id: string; created_at: string }>(a: T[], b: T[]): T[]`
  de-duplicates by id, newest first.

- [ ] **Step 1: Write the failing tests**
  - `decideLegacyLink`:
    - `{emailConfirmed:false, candidate:{userId:'u1', platformRole:'customer', reachRole:'buyer', alreadyLinked:false}}` returns `null`
    - the same input with `emailConfirmed:true` returns `'u1'`
    - `reachRole:'vendor'` returns `null`
    - `platformRole:'admin'` returns `null`
    - `alreadyLinked:true` returns `null`
    - `candidate:null` returns `null`
  - `validateShopperProfile`:
    - `{name:'A'}` returns `ok:false`
    - `{name:'Ann', mpesaPhone:'0712345678'}` returns `ok:true`
    - `{mpesaPhone:'12'}` returns `ok:false`
  - `mergeOrderHistory`: duplicates removed, sorted descending by `created_at`.
- [ ] **Step 2:** `cd apps/web && node --import ../../scripts/ts-resolve.mjs lib/reach/shop-logic.test.ts` fails because the module is missing.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** The same command passes.
- [ ] **Step 5:** Commit `feat(reach): shopper link and profile logic`.

### Task 3: Shopper gate

**Files:**
- Create: `packages/db/src/customer-token.ts`: `verifyCustomerToken(token: string): Promise<{ id: string; email: string; emailConfirmed: boolean } | null>`,
  using `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } }).auth.getUser(token)`
- Create: `apps/web/lib/reach/shopper.ts`: `ensureShopper(user): Promise<Shopper>`, where `Shopper = { id: string; authUserId: string; email: string; name: string | null; mpesaNumber: string | null; legacyUserId: string | null }`.
  It upserts by `auth_user_id`. On first creation it finds a candidate (`users` by
  lower(email), joined with `reach_users`) and applies `decideLegacyLink`.
- Modify: `apps/web/app/api/mobile/_lib.ts`: add `requireReachShopper(req): Promise<{ shopper: Shopper } | NextResponse>`
  (401 `'Unauthorized'` when the token is missing or invalid).
- Modify: `scripts/route-kinds.mjs`: change `customer` to `[/getStoreCustomer\(|requireReachShopper\(/]`.

- [ ] **Step 1:** Implement the three functions and the regex change.
- [ ] **Step 2:** `npm test -w @mcloud/web` passes (route-kinds is unchanged in effect).
- [ ] **Step 3:** `npx turbo run typecheck --filter=@mcloud/web` passes.
- [ ] **Step 4:** Commit `feat(reach): verify Supabase shopper tokens on mobile routes`.

### Task 4: Shop profile and store routes

**Files (all `// @route-kind: customer`, all call `requireReachShopper`):**
- Create: `apps/web/app/api/mobile/reach/shop/me/route.ts`. GET returns `{ shopper: { name, email, mpesaPhone, linked: boolean } }`. PATCH validates with `validateShopperProfile` and updates.
- Create: `apps/web/app/api/mobile/reach/shop/stores/[slug]/route.ts`. GET returns `{ store: { slug, name, logoUrl, bannerUrl, accent, description, areas: string[], categories: string[] } }`. 404 unless `reach_vendors` is `active`, `listed` and `approval_status = 'approved'` for that store.
- Create: `apps/web/app/api/mobile/reach/shop/stores/[slug]/products/route.ts`. GET returns `{ products: Product[] }` (the same shape as `/reach/products`), filtered by `q` (an `ilike` on name) and `category`.
- Create: `apps/web/lib/reach/shop-store.ts`. `loadShopStore(db, slug)` and `loadShopStoreProducts(db, storeId, { q, category })` keep the routes thin. Branding fields are read from the same columns `getBranding` (`apps/web/lib/merchant/store-sections.ts`) reads. Categories come from the store's product categories.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npm test -w @mcloud/web` passes (route-kinds covers the markers).
- [ ] **Step 3:** Typecheck web.
- [ ] **Step 4:** Commit `feat(reach): shopper profile and store page routes`.

### Task 5: Shared checkout and shop orders

**Files:**
- Create: `apps/web/lib/reach/checkout.ts`. Move the body of `POST /reach/orders` into `createReachOrder(db, payer: { userId?: string; shopperId?: string; email?: string }, input: { areaId; address; phone; lines }): Promise<{ orderId; orderNumber; total } | { status: number; error: string }>`. When `payer.email` is set, it upserts `customers` (Reach store and each vendor's `store_id`) by `(store_id, email)` and sets `orders.customer_id` to the Reach-store row. It sets `reach_payments.shopper_id`.
- Modify: `apps/web/app/api/mobile/reach/orders/route.ts`: call `createReachOrder(db, { userId: auth.user.id }, …)`. The behaviour is the same.
- Modify: `apps/web/lib/reach/shop-logic.ts` and its test: add `orderVisibleTo(order: { customer_id: string | null; legacy_user_id: string | null }, viewer: { customerId: string | null; legacyUserId: string | null }): boolean`.
  - Tests:
    - a matching customer id returns `true`
    - a matching legacy id returns `true`
    - null versus null returns `false`
    - a different customer returns `false`
- Create: `apps/web/app/api/mobile/reach/shop/orders/route.ts`. GET returns history via `mergeOrderHistory`. POST calls `createReachOrder(db, { shopperId, email }, body)`.
- Create: `apps/web/app/api/mobile/reach/shop/orders/[orderNumber]/route.ts`. GET returns detail and payment `status`, and 404 unless `orderVisibleTo`.

- [ ] **Step 1:** Write the `orderVisibleTo` tests, run them, and see them fail.
- [ ] **Step 2:** Implement `orderVisibleTo` and see the tests pass.
- [ ] **Step 3:** Extract `createReachOrder` and switch the old route over. Typecheck.
- [ ] **Step 4:** Add the shop order routes. `npm test -w @mcloud/web` passes.
- [ ] **Step 5:** Commit `feat(reach): shopper checkout and order history`.

### Task 6: Listing logic in `@mcloud/merchant`

**Files:**
- Create: `packages/merchant/src/reach-listing.ts`. Move the db-touching core of
  `apps/storefront/lib/admin/reach-actions.ts` into functions that take `(db, storeId, …)` for an
  already-authorized store:
  - `getReachStatus(db, storeId)`
  - `setListed(db, storeId, listed, userId)`
  - `listKeys(db, storeId)`
  - `createKey(db, storeId, label, userId)`
  - `revokeKey(db, storeId, keyId)`
  - `updateReachDetails(db, storeId, { areaIds?, payoutPhone?, description? })`

  Keep the exact return shapes the actions return today. Push notifications stay in the
  storefront wrapper.
- Modify: `apps/storefront/lib/admin/reach-actions.ts`: become wrappers (`requireManagedStore`,
  then the shared function).
- Test: `packages/merchant/src/reach-listing.test.ts`, using a small fake `db` (chainable stub
  returning fixtures):
  - `createKey` returns `{ error }` when `MAX_ACTIVE_STORE_KEYS` keys are already active
  - `revokeKey` with a key from another vendor updates nothing

- [ ] **Step 1:** Write the tests and see them fail.
- [ ] **Step 2:** Move the code and see the tests pass.
- [ ] **Step 3:** `npm test -w @mcloud/storefront` and typecheck the storefront, because
  behaviour must be unchanged.
- [ ] **Step 4:** Commit `refactor(reach): share listing and key logic via @mcloud/merchant`.

### Task 7: Owner-members and vendor store routes

**Files:**
- Modify: `apps/web/lib/reach/shop-logic.ts` and its test:
  - `membershipActive(m: { keyId: string | null; keyActive: boolean | null; hasStoreAccess: boolean }): boolean`
  - `planOneStepSetup(s: { manageableOrg: { id: string } | null; existingStoreSlug: string | null }): Array<'create_org' | 'create_store' | 'list' | 'join'>`
  - Tests:
    - a key that is active returns `true`
    - a key that is revoked returns `false`
    - a null key with access returns `true`
    - a null key without access returns `false`
    - with no org, the setup plan is all four steps
    - with an org and an existing store, the setup plan is `['list','join']`
- Modify: `apps/web/lib/reach/vendor.ts`: `vendorFor` switches to a left join on
  `reach_courier_keys`. For a null key, it checks `requireStoreAccessById(store_id, userId)`,
  then applies `membershipActive`.
- Create (`// @route-kind: mobile`):
  - `apps/web/app/api/mobile/reach/vendor/stores/route.ts`: GET lists managed stores and their
    Reach status. POST does the one-step setup `{ name, slug? }` following `planOneStepSetup`.
  - `apps/web/app/api/mobile/reach/vendor/stores/[slug]/list/route.ts`: POST requires
    `requireStoreAccess` and `canManage`, then `setListed` and `reach_join_as_owner`.
  - `apps/web/app/api/mobile/reach/vendor/store/route.ts`: PATCH calls `updateReachDetails`.
  - `apps/web/app/api/mobile/reach/vendor/keys/route.ts` (GET, POST) and
    `apps/web/app/api/mobile/reach/vendor/keys/[keyId]/route.ts` (DELETE).

  The routes that act on "my store" resolve the store from `vendorFor`, never from the body, and
  also require `canManage`.

- [ ] **Step 1:** Write the `membershipActive` and `planOneStepSetup` tests and see them fail.
- [ ] **Step 2:** Implement them and see the tests pass.
- [ ] **Step 3:** Update `vendorFor` and add the routes. Run `npm test -w @mcloud/web` and
  typecheck.
- [ ] **Step 4:** Commit `feat(reach): create, list and manage stores from the app`.

### Task 8: Docs (mcloud)

- Modify `docs/api.md`: add the shop and vendor routes and the `requireReachShopper` gate.
- Modify `docs/architecture.md`: Reach shopper identity (`reach_shoppers`, legacy link).
- Modify `docs/CLEANUP.md`: retire the WorkOS buyer routes (`confirm-buyer`, `/reach/orders`)
  once old Reach builds are gone.
- Commit `docs(reach): shopper identity and new routes`.

## Phase B: Reach app (`~/reach`, separate repo; branch `feat/storefronts`)

### Task 9: Shopper auth plumbing

**Files:**
- Create: `src/lib/shopper-auth.ts`. Exports `shopperSupabase` (createClient with a SecureStore
  storage adapter, `autoRefreshToken: true`, `detectSessionInUrl: false`), plus
  `shopperSignUp(email, password)`, `shopperSignIn(email, password)`,
  `shopperResetPassword(email)`, `shopperSignOut()` and
  `getShopperAccessToken(): Promise<string | null>`.
- Create: `src/lib/mode.ts`. `type Mode = 'shop' | 'sell' | 'admin'`, with `getMode()` and
  `setMode()`, stored in SecureStore `reach_role` and mapped from the legacy values
  `rch-customer` → `shop` and `rch-vendor` → `sell`.
- Modify: `src/lib/api.ts`: add `shopApi<T>(path, init)`, which uses `getShopperAccessToken()`
  and on a 401 calls `shopperSignOut()` and throws `'unauthenticated'`.
- Modify: `src/lib/auth.ts`: `signOut()` also calls `shopperSignOut()`.
- Modify: `src/app/_layout.tsx`: on launch, if mode is `shop` and there is a shopper session, go
  to `/buy`. Otherwise keep the current WorkOS logic.
- Modify: `src/app/index.tsx`: the primary button is "Shop" (goes to `/shop-auth/sign-in`), the
  secondary is "Sell on Reach" (the existing Google flow, then `/role-picker`), and special access
  stays.
- Env: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, read in
  `shopper-auth.ts`. Document them in the README.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npx tsc --noEmit`, then `npx expo lint`.
- [ ] **Step 3:** Commit `feat(auth): Supabase sign-in for shoppers`.

### Task 10: Shopper auth screens, account and orders

**Files:**
- Create: `src/app/shop-auth/_layout.tsx`, `sign-in.tsx`, `sign-up.tsx` and `reset.tsx`.
  - After sign-in, call `ReachAPI.shopMe()`, `setMode('shop')`, then go to `/buy` (or
    `/buy/area` if no area is set).
  - Sign-up shows "Check your email to confirm" when there's no session.
- Modify: `src/lib/reach.ts`: add `shopMe`, `updateShopMe`, `getShopStore(slug)`,
  `getShopStoreProducts(slug, {q, category})`, `getShopOrders`, `getShopOrder(number)` and
  `createShopOrder` (all via `shopApi`).
  - `waitForPayment` polls `shop/orders/[number]` when in shop mode.
  - `getProducts` and `getAreas` use `shopApi` in shop mode.
- Create: `src/app/buy/account.tsx` (profile form, orders list, sign-out) and
  `src/app/buy/orders/[number].tsx`.
- Modify: `src/ui/AccountButton.tsx`: links to `/buy/account` in shop mode.
- Modify: `src/app/buy/cart.tsx`: checkout calls `createShopOrder`. The phone is prefilled from
  the profile.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npx tsc --noEmit`, then `npx expo lint`.
- [ ] **Step 3:** Commit `feat(shop): shopper accounts and order history`.

### Task 11: In-app store page

**Files:**
- Create: `src/app/buy/store/[slug].tsx`: a header with banner and logo, the accent from
  `store.accent`, a search `Field` (debounced 300ms), horizontal category chips, a two-column
  product grid using `ProductImage`, and add-to-cart through `useCart`. `CartBar` stays visible.
- Modify: `src/app/buy/index.tsx`: the vendor section header becomes pressable "Visit store",
  which goes to `/buy/store/[storeSlug]` when `storeSlug` is set.
- Modify: `src/app/buy/[id].tsx`: a horizontal paging `ScrollView` gallery over
  `product.images`, and a "From <vendorName>" row linking to the store page.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npx tsc --noEmit`, then `npx expo lint`.
- [ ] **Step 3:** Commit `feat(shop): store pages and product gallery`.

### Task 12: Sell start and dashboard structure

**Files:**
- Modify: `src/lib/reach.ts`: add `vendorStores()`, `createVendorStore({ name, slug? })`,
  `listVendorStore(slug)`, `updateVendorStore(patch)`, `vendorKeys()`,
  `createVendorKey(label)` and `revokeVendorKey(id)` (WorkOS `api`). Also add
  `storeApi.products/branding/orders/analytics(slug)`, which wrap `/stores/[slug]/*`.
- Create: `src/app/sell/start.tsx`: three rows: "Create a store" (a name field, then
  `createVendorStore`), "List a store you own" (a picker from `vendorStores()` filtered to
  not-yet-listed or other stores), and "I have a staff key" (to `/deliver`).
- Modify: `src/app/role-picker.tsx`: "I'm selling" goes to `/sell/start`. The shopping row is
  removed for WorkOS users with no role, and their shopping path is the email sign-in.
- Modify: `src/app/deliver/dashboard.tsx`: a store switcher (shown when `vendorStores()` returns
  more than one), and segmented tabs for Marketplace orders (existing), Web orders, Products and
  More. Web orders and More are hidden when `vendorStores()` doesn't include the current store,
  which means key-joined staff.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npx tsc --noEmit`, then `npx expo lint`.
- [ ] **Step 3:** Commit `feat(sell): create or list a store from the app`.

### Task 13: Vendor management screens

**Files (all under `src/app/deliver/`):**
- `products/new.tsx`: name, price, description, stock and photos (reuse `src/lib/upload.ts`),
  using `POST /stores/[slug]/products`. `products/[id].tsx` gets a Delete button with a confirm
  step.
- `branding.tsx`: logo and description via `/stores/[slug]/branding`.
- `store.tsx`: description, delivery areas (from `useAreaList`, up to 12) and payout phone.
- `keys.tsx`: list, create (label) and revoke. The new key is shown once, with copy and QR.
- `analytics.tsx`: totals from `/stores/[slug]/analytics`.
- `web-orders.tsx`: a read-only list from `/stores/[slug]/orders`. Tapping an order opens the
  storefront settings order URL with `expo-web-browser`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npx tsc --noEmit`, then `npx expo lint`.
- [ ] **Step 3:** Commit `feat(sell): manage products, branding, keys and web orders`.

### Task 14: Final verification

- [ ] mcloud: `npx turbo run typecheck lint test`, then `npx turbo run build` once.
- [ ] Reach: `npx tsc --noEmit` and `npx expo lint`.
- [ ] A manual pass on a dev build (after the migration is applied):
  - shopper sign-up and confirm
  - a legacy-linked shopper sees old orders
  - store page, search and checkout
  - one-step store creation is pending in admin
  - a key-joined staff member sees no Web orders or More
