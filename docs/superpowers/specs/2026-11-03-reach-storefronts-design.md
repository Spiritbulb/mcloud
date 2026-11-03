# Reach: storefronts, store management, Supabase shoppers

Date: 2026-11-03. Repos: `mcloud` (server, migration, docs) and `~/reach` (Expo app).

## Goal

Make the Reach app feel like an mcloud storefront for shoppers and like the merchant app for
vendors:

- Shoppers sign in with **Supabase Auth** (email + password), the same account they use on any
  mcloud web storefront. Vendors and Reach admins keep **WorkOS** (Google / special access).
- Shoppers can open a store's own page in the app (branding, products, search, categories,
  product gallery) and see their order history.
- Vendors can create a store in the app, list an existing one, and manage it: products
  (add/edit/delete), branding, store details, staff keys, analytics, and their own web storefront
  orders, kept separate from marketplace orders.

## Decisions (agreed)

| # | Decision |
|---|---|
| D1 | One shared shopper account: the Supabase customer identity used by web storefronts. A shopper gets a `customers` row per store they buy from (Reach store and each vendor store). |
| D2 | Existing WorkOS buyers are linked by **verified** email on first Supabase sign-in; profile and order history carry over. |
| D3 | Checkout is unchanged: marketplace orders live in the Reach store (`REACH_STORE_ID`), one M-Pesa payment, escrow and `reach_vendor_payouts`. The vendor's own mcloud store is separate. |
| D4 | "Sell" offers both: one-step setup for new vendors, and "list a store you already own". Keys remain for staff. |
| D5 | Vendor management covers products, branding, store details, staff keys, analytics, and web storefront orders (read-only, separate tab). |
| D6 | Native screens backed by server routes. The app never queries the database. |

Out of scope: variants, wishlist, per-store checkout, paying merchants directly.

## 1. Shopper identity

`reach_users.user_id` references `users(id)`, and shoppers are not in `users`. So shoppers get a
new table:

```sql
reach_shoppers (
  id             uuid primary key default gen_random_uuid(),
  auth_user_id   uuid not null unique,          -- Supabase Auth user id
  email          text not null,                 -- from the verified token only
  name           text,
  mpesa_number   text,
  legacy_user_id text unique references users(id) on delete set null,
  created_at, updated_at timestamptz
)
```

Service-role only: RLS on, no policies, `revoke all from anon, authenticated`.

**Gate**: `requireReachShopper(req)` in `apps/web/app/api/mobile/_lib`. It reads
`Authorization: Bearer <supabase access token>` and verifies it with `auth.getUser(token)` on a
publishable-key client (as `apps/storefront/lib/customer-auth.ts` does with cookies). It then
calls `ensureShopper()` and returns the `reach_shoppers` row. Routes use `// @route-kind: customer`.

**`ensureShopper(user)`**: upserts by `auth_user_id`. On creation only, and only when
`email_confirmed_at` is set, it looks for a `users` row with that email (case-insensitive) that
has a `reach_users` row with role `buyer`, and that is not linked yet. If it finds one, it copies
`name` and `mpesa_number` and sets `legacy_user_id`. It never links to a vendor, or to a user
whose platform role is `admin`. The decision itself is pure (`decideLegacyLink`) and tested.

**Order history** is made of:
(a) Reach-store orders whose `customer_id` is the shopper's `customers` row in the Reach store, and
(b) legacy orders reached through `reach_payments.user_id = legacy_user_id`.
These are merged and de-duplicated by order id, newest first.

## 2. Shopper API (`apps/web/app/api/mobile/reach/shop/*`, kind `customer`)

| Route | Behaviour |
|---|---|
| `GET/PATCH shop/me` | Profile. PATCH accepts `name` (2–80 characters) and `mpesaPhone` (`normalizeKenyanMobile`). |
| `GET shop/stores/[slug]` | Store page data: name, logo, banner, theme colour, description, delivery area labels, categories. 404 unless the vendor is active, listed and `approved`. |
| `GET shop/stores/[slug]/products?q=&category=` | That store's active products, at buyer prices (`priceForBuyer`, same as `/reach/products`). |
| `GET shop/orders`, `GET shop/orders/[orderNumber]` | History as above. The detail is looked up by order number and must belong to this shopper. |
| `POST shop/orders` | The current `/reach/orders` checkout, extracted into a shared `createReachOrder({ payer })` helper. It also upserts `customers` rows (Reach store and each vendor store, by email), sets `orders.customer_id` and `reach_payments.shopper_id`. Amounts come only from stored products. |
| `GET shop/orders/[orderNumber]/status` | Payment polling, scoped to the shopper. |

Legacy routes (`/reach/products`, `/reach/areas`, `/reach/orders*`, `confirm-buyer`) stay as they
are for old app builds. `/reach/products` and `/reach/areas` also accept a shopper token (try the
shopper gate, then fall back to `requireMobileUser`).

Pure logic goes in `apps/web/lib/reach/shop-logic.ts` with a sibling test.

## 3. Vendor side

**Who can do what.** Store owners, admins and members have store access (`requireStoreAccess`)
and get the full feature set. Key-joined staff keep today's screens (products, marketplace
orders, mark delivered). Web orders, branding, keys, analytics and store details all require
store access, and keys and store details also require `canManage`.

**Reuse**: the existing `/api/mobile/stores/[slug]/*` routes (products CRUD, branding, orders,
analytics, hub) are called as-is from Reach.

**Shared listing logic**: the core of `apps/storefront/lib/admin/reach-actions.ts` (listing, keys,
store details) moves into `packages/merchant/src/reach-listing.ts` and takes a `db` argument plus
an already-authorized store id. The storefront server actions become thin wrappers (auth via
`requireManagedStore`, then call the shared function). Behaviour is unchanged.

**New routes (`apps/web/app/api/mobile/reach/vendor/*`, kind `mobile`)**:

| Route | Behaviour |
|---|---|
| `GET vendor/stores` | Stores the user can manage, each with its Reach status. |
| `POST vendor/stores` | One-step setup: `findManageableOrg`, or `createOrgForUser` if there is none, then `createStoreForUser`, list on Reach (approval `pending`), then `reach_join_as_owner`. |
| `POST vendor/stores/[slug]/list` | Requires `requireStoreAccess` and `canManage`. Lists the store on Reach (if not already listed) and joins the user as its owner-member. Also used to switch stores. |
| `PATCH vendor/store` | Description, delivery areas (≤ `MAX_VENDOR_AREAS`), payout phone. |
| `GET/POST vendor/keys`, `DELETE vendor/keys/[id]` | Staff keys, using the existing `MAX_ACTIVE_STORE_KEYS`, label validation and masking. |

**Membership**: `reach_vendor_members` holds one row per user (the conflict target is
`user_id`), so a person is the vendor of one store at a time. "Switching store" re-joins the
user to another store they manage.

- `reach_vendor_members.key_id` becomes nullable. A null key means an owner-member.
- `reach_join_as_owner(p_user_id, p_vendor_id)` (security definer) upserts the membership with a
  null key and sets `reach_users.role = 'vendor'`. It refuses (`role_conflict`) only if the user
  is a Reach buyer under WorkOS, as today.
- `vendorFor()` in `apps/web/lib/reach/vendor.ts` changes its check from "key active" to "key
  active, or key null and the user still has store access to `reach_vendors.store_id`". Revoking
  a key still cuts off exactly the people who joined with that key. Removing someone from the
  org cuts off an owner-member.

## 4. Reach app (`~/reach`)

**Auth**
- `src/lib/shopper-auth.ts`: `@supabase/supabase-js` with a SecureStore storage adapter,
  `autoRefreshToken`, sign up, sign in, reset password and sign out.
- `src/lib/api.ts`: picks the token by the remembered mode: `shop` uses the Supabase access
  token, while `sell` and `admin` use WorkOS.
- Env: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public values).
- `index.tsx` (landing) offers two choices: "Shop" (email) and "Sell on Reach" (Google), and
  keeps special access.
- `_layout.tsx` restores either session on launch.

**Shopper screens**
- `shop-auth/sign-in`, `sign-up` and `reset` replace `onboarding/buyer` for new shoppers.
- `buy/index`: each vendor section header becomes "Visit store", which goes to `buy/store/[slug]`.
- `buy/store/[slug]`: a branded header, search, category chips and a product grid, using the
  shared cart.
- `buy/[id]`: image gallery and a "From <store>" link.
- `buy/account` and `buy/orders/[number]`.

**Vendor screens**
- `sell/start`: create a store, list a store you own, or enter a staff key (the existing
  `deliver/index`).
- `deliver/dashboard`: store switcher and tabs for Marketplace orders, Web orders, Products and
  More.
- `deliver/products/new`, and delete on `deliver/products/[id]`.
- `deliver/branding`, `deliver/store`, `deliver/keys`, `deliver/analytics` and
  `deliver/web-orders`.

## 5. Migration and rollout

`migrations/20261103_reach_shoppers.sql` only adds things and can run before the deploy:
- create `reach_shoppers`
- add `reach_payments.shopper_id` (references `reach_shoppers`, `on delete set null`) and drop
  `not null` on `reach_payments.user_id`
- index `orders (store_id, customer_id)`
- make `reach_vendor_members.key_id` nullable and add `reach_join_as_owner`
- then run `npm run sb-typegen -w @mcloud/web`

Order: migration, then the web deploy, then the Reach build. The web deploy keeps old builds
working, and the Reach store build follows.

## 6. Error handling

- Shopper routes return 401 for a missing or invalid token. The app signs out of Supabase and
  shows the sign-in screen.
- Unconfirmed email: Supabase blocks password sign-in, and the app shows "check your email".
- A failed legacy link never blocks sign-in. The shopper just starts with an empty history.
- One-step setup is not transactional across org, store and listing. Each step is idempotent
  (reuse the org, reuse the store by slug for this user, upsert the listing), so a retry finishes
  the job.

## 7. Testing

mcloud (`node:test`):
- `shop-logic.test.ts`: buyer pricing, `decideLegacyLink` (confirmed email only, buyer only,
  never admin or vendor, never already linked), and history merging.
- `reach-listing.test.ts`: listing eligibility, key limits and masking, and the one-step setup
  branches with a fake db.
- `route-kinds` passes for every new route.
- A test that shop routes don't read `store_id`, `customer_id` or `shopper_id` from the body.
- Run `npx turbo run typecheck lint test`, and `build` once at the end.

Reach:
- `npx tsc --noEmit` and `npx expo lint`.
- A manual pass on a dev build: sign-up, the legacy link, a store page, checkout, one-step
  setup, and web orders.

Docs:
- `docs/api.md`: routes and the `customer` gate on web.
- `docs/architecture.md`: Reach shopper identity.
- `docs/CLEANUP.md`: retire the WorkOS buyer path once old builds are gone.
