# Codebase Cleanup: Eliminate Anon Table Access, Dead Auth Code & Dead Packages

Date: 2026-06-30
Status: Draft for review
Branch: `cleanup/anon-and-dead-code` (cut from `main`)

## Background

The platform migrated to the **route-everything / no-anon-table-access** model: untrusted
clients hold no Supabase table key; all reads/writes go through server code using the
service-role client (`@mcloud/db/server`) gated by code-level authz (`requireStoreAccess`,
admin role check). The storefront app already completed this. Auth migrated from
Supabase Auth / Auth0 to **WorkOS Magic Auth** (in-app magic-code login).

`apps/web` still has residual anon usage and dead artifacts from those migrations. This
spec covers cleaning them up. Related memory: `project-route-everything-no-anon`,
`project-web-magic-code-login`, `project-auth-workos-migration`.

## Goals

1. **No anon TABLE access in `apps/web`.** Every `@mcloud/db/client` `.from(...)` call
   becomes service-role-backed server code gated by proper authz.
2. **Delete clearly-dead Supabase-Auth code** left over from the WorkOS migration.
3. **Prune dead npm packages** from `apps/web`, after verifying each is truly unused.

## Non-Goals / Explicit Constraints

- **Storefront Supabase Auth stays.** `apps/storefront` customer login legitimately needs a
  browser Supabase client. Out of scope.
- No RLS work this round (defense-in-depth, tracked separately).
- No unrelated refactoring.

## Current State (inventory)

### Track A — anon (publishable) usage in `apps/web`

> Folding in storage: Supabase **Storage does not require a browser/anon client** — the
> Storage API works server-side with service-role. The anon client is only needed for
> direct-from-browser uploads with storage-policy enforcement. Since the anon key can
> currently write the `store-assets` / `product-images` buckets directly, routing uploads
> through a service-role endpoint closes that hole too. So storage is now IN scope (A4).


**A1. Admin server components** (server-rendered; already behind `admin/layout.tsx`
role gate). These import `@mcloud/db/client` (anon) and call `.from(...)` in a *server*
context — they can switch to `@mcloud/db/server` (service-role) with no new HTTP route.

- `app/admin/layout.tsx` — reads `users` (the admin role gate itself)
- `app/admin/page.tsx` — counts across `users`, `stores`, `store_subscriptions`
- `app/admin/users/page.tsx` — reads `users`
- `app/admin/orders/page.tsx` — reads `orders`
- `app/admin/subs/page.tsx` — reads `store_subscriptions`
- `app/admin/webhooks/page.tsx` — reads `webhook_logs`
- `app/admin/docs-editor/page.tsx` — reads `docs_pages`

**A2. Merchant settings client components** (`'use client'`; write tables via anon key).
These need `/api` route handlers gated by `requireStoreAccess`, then the component
swaps `supabase.from(...)` → `fetch('/api/...')`. Most logic already exists in
`lib/merchant/*` (service-role) and can be wrapped.

- `components/store/order-settings.tsx` — read `orders`/`order_items`, update `orders`.
  Wrap existing `listOrders`, `updateOrderStatus` (+ new `listOrderItems`).
- `components/store/product-settings.tsx` — CRUD `products`, `product_variants`.
  Wrap existing `listProducts`/`createProduct`/`updateProduct`/`deleteProduct`
  (+ variant handling, currently inline).
- `components/store/service-settings.tsx` — CRUD `services`. New service functions
  in `lib/merchant/`.
- `components/store/StoreSettingsAppearance.tsx` &
  `app/(merchant)/.../settings/appearance/appearance-settings-page.tsx` — update
  `stores`, upsert `store_themes`. Wrap existing `updateBranding` (extend for theme).
- `app/(merchant)/.../settings/blog/blog-client.tsx` — CRUD `blog_posts`, `blog_authors`.
  `lib/blog.ts` already has the queries (currently anon) — move to service-role +
  expose via routes.

**A3. Other anon table reads** (`lib/blog.ts`) — `blog_posts`/`blog_authors` reads via
anon `@mcloud/db/client`. Switch to `@mcloud/db/server`. Used by both server components
and the merchant blog client; the client paths route through A2's blog endpoints.

**A4. Storage uploads via anon client** (`supabase.storage` from the browser). Route these
through a service-role endpoint so the anon key can no longer write the buckets.

- `hooks/use-supabase-upload.ts` — dropzone `storage.upload` (the main uploader)
- `components/store/image-upload.tsx` — uses the hook + `storage.getPublicUrl` + `storage.remove`
  (deletes the previously-stored file). Consumed by appearance / product / service settings.
- `lib/upload.ts` (`uploadImage`) — one-shot `upload` + `getPublicUrl` helper.

`components/dropzone.tsx` and `components/store/appearance-settings.tsx` are consumers/UI;
they change only if their upload call site changes.

### Track B — dead Supabase-Auth code

Auth is now WorkOS magic-code; Supabase Auth no longer issues sessions, so any
`supabase.auth.*` call in `apps/web` is dead.

**Clearly dead (delete):**
- `app/auth/forgot-password/page.tsx` + `components/forgot-password-form.tsx`
  (`resetPasswordForEmail` — only rendered by that page; nothing links to it)
- `app/auth/update-password/page.tsx` + `components/update-password-form.tsx`
  (`updateUser` — only rendered by that page)

**Referenced — fix, don't delete (per "keep ambiguous"):**
- `components/logout-button.tsx` — calls Supabase `signOut()`, but real logout is the
  WorkOS `app/auth/logout/route.ts`. It is imported elsewhere, so: repoint it to
  navigate to `/auth/logout` instead of calling the dead Supabase `signOut`.

### Track C — dead npm packages (`apps/web`)

`depcheck` candidates (each VERIFIED before removal — depcheck has false positives):
- `@auth0/nextjs-auth0` — Auth0 replaced by WorkOS. Verify no import remains.
- `firebase` — verify (push moved to `web-push`?).
- Others depcheck flags (`intasend-node`, `ua-parser-js`, various `@radix-ui/*`,
  `remark*`, etc.) — verify each with a grep before touching. Many `@radix-ui`/`remark`
  are likely real (used transitively or in files depcheck misparses); treat the list as
  *candidates*, not a delete list. Also fix the real `missing: server-only` finding by
  adding it as a dependency.

## Design / Approach

### A1 (admin) — direct service-role swap

For each admin server component: change the import to `@mcloud/db/server`, make the
data-loading function `await createClient()`. No behavior change; admin gate already runs
in the layout. Bonus security: the role gate stops trusting the anon key.

Order matters: do `admin/layout.tsx` first (it's the gate), verify admin still loads,
then the pages.

### A2 (merchant) — thin API routes wrapping `lib/merchant/*`

Established pattern (mirrors `app/api/mobile/*` and storefront):

1. Route handler under `app/api/store/[slug]/<area>/route.ts` (or extend existing).
2. Handler: `getSession()` → `requireStoreAccess(slug, userId)` → call the
   `lib/merchant/*` service-role function → return JSON. 403/404 from the guard.
3. Client component: replace `createClient().from(...)` with `fetch` to the route.
   Remove the `@mcloud/db/client` import once no table calls remain.

Reuse existing functions where present; add new ones (services, order-items, variants,
blog write paths, theme upsert) in the same `lib/merchant/*` style (explicit `userId`,
no Next-only APIs) so they stay reusable.

### A4 (storage) — upload route + browser fetch

Add `app/api/store/[slug]/upload/route.ts`: accepts `multipart/form-data` (file + bucket +
path), `getSession()` → `requireStoreAccess` → service-role `storage.upload(...)` →
return `{ url, path }`. Add a DELETE (or `?path=`) branch for `storage.remove`. Server-side
re-validates bucket allowlist, MIME (`image/*`), and max size (5 MB) — these move off the
client. Rewrite `use-supabase-upload.ts` (or replace it with a small `uploadViaApi` helper)
and `lib/upload.ts` to POST to the route instead of holding a Supabase client; update
`image-upload.tsx`'s remove/getPublicUrl calls to hit the route. After this, `apps/web` holds
**no `@mcloud/db/client` at all** and the anon env var can be dropped from web's runtime.

### B — deletion + repoint

Delete the four clearly-dead files. Repoint `logout-button` to `/auth/logout`. Grep after
each deletion to confirm no dangling imports.

### C — verify-then-prune

For each candidate: `grep` the package name across `apps/web`. Zero hits (and not used in
config) → remove from `apps/web/package.json`. Re-run build. Add `server-only` to deps.

## Implementation Phases (each independently verifiable)

- **Phase 1 — Admin anon swap (A1).** Lowest risk, highest security value. Verify admin
  panel loads + role gate works.
- **Phase 2 — Dead auth code (B).** Delete 4 files, repoint logout-button. Verify build +
  logout flow.
- **Phase 3 — Merchant: orders + appearance (A2 partial).** Wrap existing functions; smallest.
- **Phase 4 — Merchant: products + services (A2).** Includes variants & new service fns.
- **Phase 5 — Merchant: blog (A2/A3).** Move `lib/blog.ts` to service-role + blog routes.
- **Phase 6 — Storage uploads (A4).** Add the upload route; rewrite the uploader, `lib/upload.ts`,
  and `image-upload.tsx` to use it. Verify an image upload + replace + remove round-trips.
- **Phase 7 — Dead packages (C).** Verify-then-prune; final clean build.

After Phase 6, grep confirms **zero `@mcloud/db/client` imports** in `apps/web` — no anon
table access and no anon storage access. The web runtime no longer needs the publishable/anon
key (Phase 7 can confirm/remove it from web's env wiring).

## Testing / Verification

- Per phase: `turbo build --filter web` green; targeted manual check via the `run-mcloud`
  skill (admin loads, a merchant settings save round-trips, logout redirects).
- Final: full grep audit (no `@mcloud/db/client` import in `apps/web`), full build, smoke the
  admin + one store's settings screens + an image upload/replace/remove.
- Each phase commits separately so regressions bisect cleanly.

## Risks

- **Merchant regressions** (Phase 3–5): client write semantics must match. Mitigation:
  wrap existing tested `lib/merchant` functions; verify each settings screen after swap.
- **Storage regressions** (Phase 6): multipart handling, body-size limits on the route, and
  the file-replace/remove flow must match current behavior. Mitigation: keep the same
  bucket/path conventions; verify upload + replace + remove on a real store.
- **depcheck false positives** (Phase 7): mitigated by per-package grep before removal.
  Note `@supabase/ssr` stays (server + storefront still use it); only the web *anon* call
  sites go away, not the dependency.
- **`[slug]` bracket dirs** break relative Read/Edit/Bash paths — use absolute paths
  (known gotcha from prior storefront work).
