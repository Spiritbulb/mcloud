# Storefront Domain / Slug Resolution Middleware

**Date:** 2026-06-14
**App:** `apps/storefront`
**File added:** `apps/storefront/proxy.ts` (Next 16 names middleware `proxy.ts`)

## Problem

`apps/storefront` serves store pages under the route tree `app/store/[slug]/*`. Today
it has **no middleware**, so it only renders when a request already carries the
canonical `/store/{slug}/...` path. Two production request shapes do not:

- **Bare slug on the platform host:** `shop.menengai.cloud/{storeSlug}/...`
- **Custom domain:** `shop.acme.com/...` (DNS pointed directly at the storefront
  deployment, no `/store/{slug}` prefix)

The existing `apps/web/proxy.ts` resolves custom domains and `/s/{slug}` paths on
`menengai.cloud` and **redirects** to the storefront's canonical `/store/{slug}/...`
URL. That path keeps working. This middleware fills the gap for requests that reach
the storefront app directly.

## Resolution table

All cases normalize to the existing `/store/[slug]/*` tree via **internal rewrite**
(URL the user sees is unchanged; no redirect hop, no loop with the web proxy).

| Incoming host + path | Resolution |
|---|---|
| `*.menengai.cloud/store/{slug}/...` (web-proxy handoff) | pass through — already canonical |
| `*.menengai.cloud/{slug}/...` (bare slug) | DB `stores.slug = {seg}`? → rewrite `/store/{slug}/...` |
| custom domain `host/...` | DB `stores.custom_domain = host`? → rewrite `/store/{slug}/...` |

## Flow

```
proxy(request):
  1. Bypass: /_next/, /api/, /favicon.ico, /.well-known/, static assets → next()
  2. host = request.headers.get('host')
  3. isPlatformHost = host endsWith '.menengai.cloud' || host === 'menengai.cloud'
                      || host.includes('localhost')
  4. If NOT platform host (custom domain):
       slug = SELECT slug FROM stores WHERE custom_domain = host
       not found → 404 JSON { error: 'Store not found' }
       strip a stray leading /store/{slug} if present
       rewrite → /store/{slug}{path}, set x-store-slug header
  5. Else (platform host):
       firstSeg = pathname.split('/')[1]
       firstSeg === 'store' → pass through (canonical)
       firstSeg falsy ('/') → pass through (root)
       else:
         slug = SELECT slug FROM stores WHERE slug = firstSeg
         found → rewrite → /store/{slug}{rest}, set x-store-slug header
         not found → pass through (downstream 404)
```

## Decisions

- **Rewrite, not redirect** — preserves typed URL, avoids loops with `apps/web` proxy.
  `/store/*` on the platform host is left as-is (no canonicalization back to bare slug).
- **First-segment DB lookup** for slug detection (authoritative). Bare sub-routes like
  `/cart` correctly fall through to a 404 because they only exist under a slug.
- **`x-store-slug` request header** set on rewrites — additive, lets downstream
  loaders reuse the resolved slug. The `[slug]` route param continues to work
  unchanged; nothing depends on the header yet.
- **DB access** via `@mcloud/db/server` `createClient()`, mirroring `apps/web/proxy.ts`.
  Lookups select only `slug`.
- **Stray-prefix strip** on custom domains mirrors `apps/web/proxy.ts:207–215`.

## Matcher

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

Identical to `apps/web` so static assets / images never trigger a DB lookup.

## Out of scope (YAGNI)

- **Owner-banner injection / `/admin` gating** stay in `apps/web/proxy.ts`. The
  storefront is read-only public rendering.
- **Owner banner on custom domains:** custom domains now hit the storefront directly,
  so the web proxy's `x-inject-owner-banner` header is not set for them. Pre-existing
  limitation; deferred (confirmed with user).

## Edge cases

- `localhost:3001/store/{slug}/...` (dev) → pass through untouched.
- Custom domain landing with stray `/store/{slug}` prefix → stripped, then rewritten.
- Bare `/cart`, `/account`, etc. on platform host with no matching slug → no rewrite → 404.
