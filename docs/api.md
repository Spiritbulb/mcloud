# API

There is no separate API server. Every endpoint is a Next.js route handler
(`app/api/**/route.ts`) in one of the two apps:

| App | Prefix | Callers |
|---|---|---|
| `apps/web` | `/api/mobile/*` | The Expo apps (bearer token) |
| | `/api/partner/*` | spiritb.uk (shared secret) |
| | `/api/auth/*` | The web login forms (same origin) |
| | `/api/org/*`, `/api/account/*`, `/api/upcloud/*`, `/api/trading/*` | The org hub and account pages |
| | `/api/admin/*`, `/api/docs` | Platform admin |
| | `/api/webhooks/*`, `/api/cron/*`, `/api/payments/*` | Providers and schedulers |
| `apps/storefront` | `/api/store/[slug]/*` | Public stores (shoppers) and the settings UI (managers) |
| | `/api/upload`, `/api/store/domain` | Settings UI |
| `apps/nuru` | `/api/feed`, `/api/files/*`, `/api/me`, `/api/waitlist`, `/api/cron/feed` | Nuru web and mobile (cookie or bearer token); see [nuru.md](nuru.md) |

## Route kinds (enforced)

Every `route.ts` begins with one line declaring what protects it:

```ts
// @route-kind: member
```

and the file must actually call that kind's gate. `npm test` fails if a route has no
declaration, an unknown kind, or doesn't show the gate. The check is
[`scripts/route-kinds.mjs`](../scripts/route-kinds.mjs), run by `app/api/_route-kinds.test.ts`
in each app (web, storefront and nuru).

| Kind | Meaning | The file must call |
|---|---|---|
| `admin` | Platform admin only | `requireAdmin()` (`apps/web/lib/require-admin.ts`) |
| `member` | Signed in **and** a member of the store/org it touches | `requireStoreAccess[ById]`, `getStoreSettingsData`, `getOrgRole`, `getStoreRole` or a `store_members`/`org_members` check |
| `mobile` | WorkOS bearer token from the mobile apps | `requireMobileUser()` (`apps/web/app/api/mobile/_lib.ts`); `requireMobileUserOrShopper()` for the catalog reads Reach shoppers share |
| `user` | Nuru only: the caller's own data, by cookie session or bearer token | `requireUser()` (`apps/nuru/lib/session.ts`) |
| `customer` | The shopper's own Supabase session: storefront cookie, or a Reach bearer token | `getStoreCustomer()` (storefront) or `requireReachShopper()` (web `/api/mobile/reach/shop/*`) |
| `partner` | Trusted partner site | `requirePartnerSecret()` (fails closed) |
| `cron` | Vercel cron | `CRON_SECRET` check |
| `session` | Signed in, acting on the caller's own data or a global catalog | `getSession()`; **reason required** |
| `public` | Intentionally unauthenticated | none; **reason required** |
| `webhook` | Called by a provider, unauthenticated | none; **reason required** |

Every state-changing `admin` route also calls `recordAudit()` (`apps/web/lib/audit.ts`) once the change has succeeded; see
[architecture.md](architecture.md#admin-console).

For `session`, `public` and `webhook` the line must carry a reason:

```ts
// @route-kind: public — public storefront read
```

Pick the narrowest kind. If you find yourself writing `public` for something that changes
data or money, stop: it needs a stored identifier to match, a re-fetch from the provider,
or an amount check (see [payments.md](payments.md)).

## Rules for writing a route

1. **Authorization is yours.** The server database client is service-role and ignores RLS.
   A session is not authorization: also check the caller may touch *this* store or org.
   `requireStoreAccess(slug, userId)` / `requireStoreAccessById(storeId, userId)` +
   `canManage(role)` are the shared gate.
2. **Never trust the request for money or ownership.** Prices, totals and "which order"
   come from the database; ids from the client are only lookup keys, and lookups are scoped
   to the store.
3. **`supabase.auth.getUser()` is always empty** server-side (identity is WorkOS). Use
   `getSession()` / `getMobileSession()`.
4. **Webhooks:** acknowledge fast, be idempotent (a settled order is never re-processed),
   and re-fetch status and amount from the provider rather than trusting the body.
5. **Cache headers:** authenticated and per-user responses send `Cache-Control: no-store`.
   Public store data currently also sends `no-store` so merchants see edits at once; it
   should move to short CDN caching together with tag-based invalidation (see
   [CLEANUP.md](CLEANUP.md) §6).
6. **CORS:** web `/api/*` reflects the request origin **without** `Allow-Credentials`
   (`apps/web/proxy.ts`), so cross-origin pages can call bearer/public routes but cannot use
   a visitor's cookies. Keep it that way; `/api/auth/*` sends no CORS headers at all.
7. **Errors:** return `{ error: string }` with a meaningful status. Mobile routes use
   `fail(status, message)` from `mobile/_lib.ts`. Payment routes also include
   `success: false`, which the checkout client expects.
8. **Pure logic gets its own file and a test** (`*-logic.ts`, `*-ops.ts`), keeping the
   handler to parsing, auth, I/O and response.

## Adding a route

1. Create `app/api/<path>/route.ts` in the app that owns the concern (see
   [architecture.md](architecture.md)).
2. First line: `// @route-kind: <kind>` (+ reason when required).
3. Call the gate before touching data.
4. Validate input; look records up by store-scoped identifiers.
5. If it moves money, read [payments.md](payments.md).
6. `npx turbo run typecheck lint test`. The route-kind test is part of it.

## Mobile contract

The mobile apps depend on response shapes in `/api/mobile/*`, and old app versions stay in
users' hands for months. Add fields freely; do not rename, remove or retype existing ones
without a versioned route.

### Reach

Reach has two kinds of caller, with different tokens:

| Who | Token | Routes |
|---|---|---|
| Shoppers | Supabase access token (`requireReachShopper`) | `/api/mobile/reach/shop/*`: `me`, `stores/[slug]`, `stores/[slug]/products`, `orders`, `orders/[orderNumber]`. Also `reach/areas` and `reach/products`. |
| Vendors, Reach admins | WorkOS (`requireMobileUser`) | `/api/mobile/reach/vendor/*`, `/api/mobile/reach/admin/*`, and the merchant routes `/api/mobile/stores/[slug]/*` for owners |

- **Shopper routes** take who the shopper is only from the verified token. The store, customer
  and price never come from the body; `shop/_body-trust.test.ts` pins this. Checkout is
  `lib/reach/checkout.ts`, shared with the old WorkOS buyer route `reach/orders`.
- **Vendor store routes** (`vendor/stores`, `vendor/store`, `vendor/keys`) are for owners and
  admins of the store. `vendor/stores` creates or lists a store, and `vendor/store` and
  `vendor/keys` act on the store the user is the vendor of (`myManagedStore`). Key-joined staff
  get 403. The listing and key logic is `@mcloud/merchant/reach-listing`, which the store
  dashboard also uses.
