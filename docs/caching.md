# Caching public store pages

Public store pages (`apps/storefront/app/(storefront)/store/[slug]/**`) are served from the CDN.
A visit that hits the cache never runs a function, which is what Vercel's Active CPU is billed on.
Only a rebuild of a page costs CPU, and it happens at most once per store change.

## How it works

- Every page there is ISR: `export const revalidate = 3600`, plus an empty `generateStaticParams()`.
  The empty list is what makes Next treat a dynamic-param route as cacheable: nothing is prebuilt,
  each page is generated on first visit and then cached.
- Reads use `createPublicClient()` (`@mcloud/db/server`), which never touches `cookies()`.
  `createClient()` reads cookies, and one cookie/header/`searchParams` read anywhere in a page's tree
  makes the whole page dynamic. With the route declared cacheable that fails the request with
  `DYNAMIC_SERVER_USAGE` (a 500), so it is a test failure, not a silent slowdown:
  [`public-cache.test.ts`](../apps/storefront/public-cache.test.ts).
- The layout cannot know the host, so `StoreProvider` works out the custom-domain base path on the
  client (`useSyncExternalStore`). The cached HTML assumes the platform host and corrects on hydration.
- **Every cached page of a store carries one tag, `store:{slug}`.** `getStoreRow` (called by the layout,
  so by every page) is wrapped in `unstable_cache` with that tag, and tags propagate to the page.
  `revalidateTag(tag, { expire: 0 })` therefore rebuilds the whole store on its next visit.
  `revalidatePath` is not used: it matches one URL, and `revalidatePath(path, 'layout')` with a concrete
  store URL does not reach nested pages (verified).
- The Editor preview is the one dynamic route, `store/[slug]/-preview` (`force-dynamic`, `noindex`),
  because unsaved copy arrives in the query string. The leading hyphen cannot collide with a product slug.
  The public home takes no `searchParams`.
- The store view counter is a once-per-session beacon (`StoreViewBeacon` -> `POST /api/store/[slug]/view`),
  because a cached page has no per-visit server render to count.

## When you write data that visitors see

Purge after the write succeeds:

| From | Call |
|---|---|
| Storefront server action / route, you have the slug | `revalidateStore(slug)` (`lib/revalidate-store.ts`) |
| Storefront, you only have the store id | `await revalidateStoreById(storeId)` |
| Web (`apps/web`) | `await revalidateStorefront(slug)` or `revalidateStorefrontById(id)` (`lib/revalidate-storefront.ts`), which POSTs `/api/revalidate` with `REVALIDATE_SECRET` |

Already wired: product/service/blog actions, theme, store settings, page sections, mobile product CRUD,
branding, store delete/rename, admin status/plan/subscription, and plan purchase.
**Not wired** (these show up within the hour): new product reviews, stock changes from orders, and
anything that writes outside those paths. The hourly `revalidate` is the backstop, not the plan.

Web's call is fire-and-forget; if `REVALIDATE_SECRET` is unset it silently does nothing.

## The order page

`/store/[slug]/orders/[orderNumber]` is where shoppers land after paying. The page is a cached, empty
shell (it lives in the store tree like the cart); the order itself comes from `GET /api/store/[slug]/orders/[orderNumber]`,
which is `no-store` and `noindex`. An order number is treated as a capability: anonymous callers get the
basic view (status, date, total, item names and quantities). Contact, address, delivery fee, tracking and
per-line prices need the signed-in owner (Supabase customer session). The line between the tiers is
`lib/order-view.ts`, pinned by its tests. Sign-in links carry `?next=` so shoppers come back to the order.

## Limits worth knowing

- The proxy (`apps/storefront/proxy.ts`) still runs on every request, including ones the CDN would serve:
  custom-domain host lookup and the custom-domain redirect need it. Cheap (cached per instance), not free.
- `/api/store/[slug]/integrations` and `/delivery-zones` are `no-store` on purpose (checkout needs them fresh;
  integrations varies by session). They fire on cart/checkout only.
- 404s are cached too, so a probe of `/store/x/anything` makes a cache entry (storage, not CPU).
- Writes are invalidated from application code. A database trigger -> webhook would catch every writer,
  including manual SQL; it needs a migration and a secret, so it is not done.
