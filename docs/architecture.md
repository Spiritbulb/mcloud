# Architecture

## The pieces

```
                       ┌────────────────────────────┐
 mobile apps ────────► │ apps/web   mcloud.co.ke    │ ◄── partner sites (spiritb.uk)
 (bearer tokens)       │ marketing, login, org hub, │
                       │ billing, servers, wallet,  │
 merchants ──────────► │ admin, /api/mobile, /api/  │
 (browser)             │ partner, webhooks          │
        │              └───────────┬────────────────┘
        │ shared WorkOS cookie     │ Supabase (Postgres, service-role)
        ▼                          │
 ┌────────────────────────────┐    │
 │ apps/storefront            │ ◄──┘
 │ app.mcloud.co.ke           │
 │  • /org/{org}/{store}/     │  store settings + /api/store/*
 │    settings   (signed in)  │
 │  • /store/{slug}, /{slug}  │  public stores
 │ custom domains             │  rewritten onto /store/{slug}
 └────────────────────────────┘
        │
        ▼ Cloudflare R2 worker (uploads), Safaricom Daraja, PayPal, PalPluss
```

Two Next.js apps, one database (Supabase), shared packages. They are separate Vercel
projects and separate origins; the merchant session is shared by a cookie scoped to
`.mcloud.co.ke` (`WORKOS_COOKIE_DOMAIN`), so signing in on web also signs you in on the
storefront's `/org/*`.

## Who owns what

| Concern | Lives in |
|---|---|
| Marketing site, docs, changelog, beta signup | `apps/web` |
| Login/logout/magic-code, SSO handoff, invites | `apps/web` (`app/auth`, `app/api/auth`, `app/api/_handoff`). The storefront links to them only through `lib/auth-urls.ts`; see [storefront-domain-move.md](storefront-domain-move.md). |
| Org hub, org members, billing, servers, wallet | `apps/web` (`app/(merchant)/org`) |
| Platform admin | `apps/web` (`app/admin`, `app/api/admin`); see [Admin console](#admin-console) |
| Mobile and partner APIs | `apps/web` (`app/api/mobile`, `app/api/partner`) |
| Storefront marketing (`/`), the `/moving` explainer, `/start` onboarding, `/login` and `/signup` entry points | `apps/storefront` (`app/(marketing)`) |
| Public stores (home, products, services, blog, cart, checkout, accounts) | `apps/storefront` (`app/(storefront)`) |
| Store settings UI, the Editor, and the `/api/store/*` routes | `apps/storefront` (`app/(merchant)`, `app/api/store`) |
| Uploads to R2 | `apps/storefront` (`app/api/upload`) |
| Logic needed by both apps | `packages/merchant` (plans, stores, store data, payments rules, seed pages) |

Rule: settings and `/api/store/*` live in the storefront; anything both apps need goes in
a package. Do not copy files between apps (that is how the payment routes and
`lib/merchant/*` diverged; see [CLEANUP.md](CLEANUP.md) §2.5–2.6).

## Hosts and routing

| Host | App | Notes |
|---|---|---|
| `mcloud.co.ke` | web | `apps/web/proxy.ts` runs auth, redirects old `/org/:org/:store/settings/*` URLs to the storefront (307). |
| `app.mcloud.co.ke` | storefront | `/org/*` is the signed-in merchant area; `/{slug}` and `/store/{slug}` are public stores. |
| `shop.mcloud.co.ke` | storefront | Legacy origin; **must keep resolving**, merchants' links and QR codes point at it. |
| a merchant's own domain | storefront | The proxy looks the host up (`stores.custom_domain`), then rewrites `/x` to `/store/{slug}/x`. The internal slug never appears in the URL; `/store/{slug}/…` on a custom domain 308-redirects to the clean path; `/org/*` is a 404 there. |

`apps/storefront/proxy.ts` caches host→slug lookups per instance for 60 s (including
misses, so a brand-new custom domain can take up to a minute to resolve).
`apps/storefront/lib/host.ts` decides platform host vs custom domain. Cross-origin links
go through `webUrl()` (storefront → web) and `storeSettingsUrl()` (web → storefront).

## Authentication

- **Identity provider:** WorkOS AuthKit. `packages/auth` is a provider-agnostic wrapper
  (`getSession`, `getMobileSession`, `prepareMiddleware`, ...); `providers/workos.ts` is
  the only adapter.
- **Web login** is a magic-code flow (`/api/auth/send-code`, `/api/auth/verify`), rate
  limited per email and IP. The session lives in a sealed cookie shared across the two
  apps (same `WORKOS_COOKIE_PASSWORD`).
- **Mobile** uses WorkOS access tokens as bearer tokens (`/api/mobile/auth/*`);
  `requireMobileUser()` resolves them. "Open on web" mints a one-time handoff ticket
  (`auth_handoff_tickets`) that web redeems into a cookie session.
- **Partner sites** (spiritb.uk) call `/api/partner/*` server-to-server with
  `x-partner-secret`.
- **Shoppers** (customers of a store) are a separate Supabase Auth path
  (`@mcloud/db` `customer-client`/`customer-server`), scoped per store. This is the only
  place `supabase.auth.getUser()` is meaningful.
- **Identity continuity:** `AuthUser.id` is the WorkOS `externalId` when set, which holds
  the legacy `auth0|…` id, so existing foreign keys keep matching. Do not remove that
  mapping or `ensureLinked()` until every user is linked.

## Data

Supabase Postgres. `packages/db` exposes the clients; `database.types.ts` is generated
(`npm run sb-typegen -w @mcloud/web`). Hand-written migrations live in `/migrations`
(dated `YYYYMMDD_name.sql`) and are applied manually.

Main tables, grouped:

- **Tenancy:** `orgs`, `org_members`, `org_invites`, `stores`, `store_members`, `store_invites`, `store_join_requests`, `users`
- **Catalog:** `products`, `product_variants`, `collections`, `collection_products`, `services`, `service_packages`
- **Sales:** `orders`, `order_items`, `customers`, `discount_codes`, `payment_links`, `payment_transactions`, `product_reviews`, `wishlists`
- **Site content:** `pages`, `store_themes`, `blog_posts`, `blog_authors`, `store_integrations`, `org_integrations`
- **Plans and money:** `store_subscriptions`, `org_wallets`, `wallet_ledger_entries`, `wallet_topups`, `servers`, `server_billing`
- **Analytics:** `store_analytics`, `store_visits`
- **Admin:** `admin_audit_log` (append-only; RLS on, no grants)
- **Other products:** `nuru_*` (notes and chat), `reach_*` (Reach vendors/couriers), `trading_apps`, `docs_pages`, `waitlist`, `beta_signups`

**All database access is server-side.** The server client is service-role and bypasses RLS, so
authorization is enforced in route code and server actions (`requireManagedStore` in
`apps/storefront/lib/admin/access.ts`, `requireStoreAccess`, `requireAdmin`), never by the database.
The public anon key must be able to do nothing with tables (see `migrations/20261012b_*`); the browser
Supabase clients exist only for Auth calls, and a test pins the files allowed to import them. See [api.md](api.md) and the security rules in
[AGENTS.md](../AGENTS.md).

## How a public store page renders

1. The proxy resolves the host to a store slug and rewrites to `/store/{slug}/…`.
2. `app/(storefront)/store/[slug]/layout.tsx` loads the store, theme, subscription and nav
   pages (deduplicated per request in `lib/store-queries.ts`) and sets CSS variables from
   the theme.
3. The page loads products, collections, featured items, services and review aggregates,
   and the store's published `pages` row (an ordered list of **sections**).
4. `lib/render-page.ts` renders each section through a **Liquid** template from
   `packages/liquid/themes/<theme>/sections/*.liquid`. If rendering throws, the page falls
   back to the React theme in `packages/themes`, so a template bug cannot take a store down.
5. A visit is counted after the response (`after()`), skipping editor previews.

Verticals (`packages/verticals`) define what kind of site a store is (`shop`, `ngo`): its
default pages and sections, and the settings navigation. NGO sites replace the catalog
with programs, campaigns and donations (donations are orders tagged `isDonation`).

## The Editor

Settings → Editor edits a store's theme and sections with a live preview. The preview is
the real storefront in an iframe. A signed preview token (`PREVIEW_SECRET`, `lib/preview.ts`)
lets unsaved values render; `PreviewListener` and `EditorBridge` in the storefront talk to
the editor over `postMessage`, and only when framed by `NEXT_PUBLIC_ADMIN_ORIGIN` (the CSP
`frame-ancestors` in `next.config.ts` enforces who may frame the storefront). Edits are pure
functions with tests (`settings/editor/*-ops.ts`).

## Uploads

Browser → `PUT /api/upload?key=…` (storefront) → R2 worker. The key must be
`<bucket>/<storeId>/<path>`; the route checks the caller can manage that store, that the
body is a raster image, and its size. See `lib/upload-key.ts`.

## Mobile apps

- `apps/mobile` is the merchant app. It reads and writes through `/api/mobile/*` (bearer
  auth, store access via `requireStoreAccess`), registers push tokens, and handles Google
  Play billing.
- `apps/nuru` is a notes/chat app using `/api/mobile/notes` and `/api/mobile/chat`
  (Azure OpenAI or Anthropic, with note chunks in `nuru_note_chunks`).
- Neither is part of the npm workspaces; install inside each app.

## Plans and billing

A store's plan (`free`, `hobby`, `pro`) is decided in **one place**: `resolvePlan()` in
`packages/merchant/src/plans.ts`, from the store's `store_subscriptions` rows (highest tier among rows
that are `active` and not past `period_end`; an admin grant has no `period_end`). `getStorePlan(s)` in
`plans-server.ts` loads the rows. Feature gates, the storefront's branding, the settings dashboard,
the org pages and the billing page all go through it.

`stores.is_pro` is a **legacy cache**. Do not read it to decide anything; it drifts (it is a boolean, so
it cannot tell hobby from pro, and several writers set it independently).

The only way a merchant upgrades is the org Billing page (`/org/{org}/billing`), which buys a plan from the
org **wallet** through the `purchase_store_plan` database function. The mobile app has no in-app purchase;
it sends people to that page. Platform admins can grant or revoke a plan in the admin console; a grant is
its own `provider = 'admin'` subscription row. Google Play billing was removed; the
`/api/mobile/stores/[slug]/subscribe` route remains only as a 410 for app builds already in the field.

## Other things in `apps/web`

Servers (UpCloud) and the prepaid wallet (PalPluss top-ups, hourly billing), the Reach
marketplace (`lib/reach`, `/api/mobile/reach`), trading apps, support, and the admin console.

## Admin console

`apps/web/app/admin`, gated by `requireAdmin()`. Screens: Overview (revenue and new-user charts, a "needs attention" queue),
Users, Stores, Subscriptions, Orders, Webhook logs, Audit log, Handoff recovery, and the docs editor.

- **UI kit:** `packages/ui/src/kit/*`, imported as `@mcloud/ui/kit/<name>` (page header, panel, stat strip, badge, table,
  fields, button, notice, icon). It lives in a package so the org hub and store settings can adopt it too (SPI-57).
  New admin screens use it rather than ad hoc markup. Screens that fetch on the client let the kit draw loading and failure:
  `SkeletonRows` in a `Table busy`, `Stat loading`, `SkeletonLines`, `LoadError onRetry`. Forms are `Panel` + `Field`/`FormGrid`
  + `SaveBar` (shown when `isDirty(saved, draft)`); destructive actions go through `ConfirmDialog`. Gallery: `/dev-ui/kit` (dev only).
- **One app frame:** `AppShell` (`@mcloud/ui/kit/app-shell`) is the sidebar, phone drawer and breadcrumb header for the admin,
  the org hub (`org-shell.tsx`) and store settings (`settings-shell.tsx`). Each passes a nav model (`ShellNavSection[]`);
  the active item is the longest whole-segment match of the URL (`activeNavId` in `nav-logic.ts`). Store settings maps the
  `@mcloud/verticals` model in `settings-nav-logic.ts`. Always size glyphs with `Icon`: Google's icon font overrides Tailwind
  size classes. Below `md` a `Table` becomes a stack of cards: give each `Td` a `label`, and leave it off the cell that
  identifies the row.
- **Lists are paginated on the server** (orders, users, webhook logs). The URL is the state (`?q=&status=&page=`), 50 per page.
  Pure parsing, links and search sanitising are in `@mcloud/ui/kit/list-query`; `FilterBar` and `Pagination` are the UI.
  Stores and subscriptions are still filtered in the browser because their sets are small and the plan filter is computed.
- **Audit log:** `admin_audit_log` (`migrations/20261023b_admin_audit_log.sql`). Rows are written by `recordAudit()`
  (`lib/audit.ts`; row shape and action names in `lib/audit-logic.ts`) and read at `/admin/audit`. A trigger rejects
  UPDATE and DELETE; RLS is on and `anon`/`authenticated` have no grants.
- **Roles:** changing a role goes through `PATCH /api/admin/users/[id]/role`. Revoking an admin resolves to `client` or
  `customer` from ownership, and the last admin cannot be removed (409).
- **Handoff recovery** (`/admin/handoff-recovery`): lists people who signed in on spiritb.uk but have no `users` row (the handoff
  failed for them) and can email them a link back through Resend. The link is `https://spiritb.uk/go/mcloud?to=%2Forg`.
- **Identity linking:** `ensureLinked()` (`packages/auth/src/providers/workos.ts`) links a WorkOS user to the legacy `auth0|` row
  by email. If linking fails it logs and flags the user (`unlinked`), and `ensureUserRow` will not mirror an unlinked user, so a
  failed link cannot create a duplicate row. `/auth/handoff` also calls `ensureUserRow`.
- **Dev previews:** `/dev-ui` and `/dev-ui/<stores|orders|users|subs|webhooks|recovery|audit>` render the screens with fixture
  data and no login. They 404 in production.
- **`webhook_logs`** has no writer yet, so the Webhook logs page is empty until a provider callback records into it.

## Google Analytics (apps/web)

GA4, loaded once from `app/layout.tsx` (`components/google-analytics.tsx`, logic in `lib/analytics-logic.ts`). The property id
defaults to the production one; `NEXT_PUBLIC_GA_ID` overrides it. Consent Mode v2: analytics storage is denied until the visitor
accepts the banner (`mng_cookie_ok` in localStorage). `send_page_view` is off and one sanitised `page_view` is sent per route:
only `utm_*`, `gclid` and `ref` survive in the reported URL, so invite tokens and similar never reach Google. `/admin`, `/auth`,
`/callback`, `/invite`, `/dev-login`, `/api` and `/settings` are not tracked. The cross-domain linker covers the platform and
storefront hosts. spiritb.uk has no analytics yet, and storefronts have no per-store analytics beyond `store_analytics`.
