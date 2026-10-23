<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Menengai Cloud (mcloud)

Multi-tenant commerce/site platform for Kenyan merchants and NGOs. Merchants get a hosted
storefront ("store" or "site") plus a settings area; Spiritbulb also ships two mobile apps.
Docs index: `docs/README.md`. Read `docs/architecture.md` when new to the repo, `docs/api.md`
before adding a route, `docs/payments.md` before touching checkout, and `docs/CLEANUP.md` for
known debt before large refactors.

## Layout

npm workspaces + Turborepo: `apps/web`, `apps/storefront`, `packages/*`. The two mobile apps
are **not** workspaces and have their own lockfiles.

| Path | What it is |
|---|---|
| `apps/web` | Platform site `mcloud.co.ke`: marketing, login/logout, org hub (`/org`), billing, servers, wallet, admin, docs, and the **mobile/partner APIs** (`app/api/mobile/*`, `app/api/partner/*`). |
| `apps/storefront` | `app.mcloud.co.ke` and merchants' custom domains. Public stores (`app/(storefront)/store/[slug]/*`) and the signed-in **store settings** (`app/(merchant)/org/[orgSlug]/[storeSlug]/settings/*`) plus the `/api/store/*` routes they call. |
| `apps/mobile` | Expo merchant app (`@mcloud/mobile`). Talks to `apps/web` `/api/mobile/*` with bearer tokens. |
| `apps/nuru` | Expo notes/chat app. Talks to `apps/web` `/api/mobile/{chat,notes}`. |
| `packages/auth` | Provider-agnostic auth API (`getSession`, etc.). The only provider is WorkOS AuthKit (`providers/workos.ts`). |
| `packages/db` | Supabase clients: `server` (**service-role**), `client`, `customer-*` (storefront shoppers). `database.types.ts` is generated (`npm run sb-typegen -w @mcloud/web`). |
| `packages/merchant` | Shared merchant logic: plans, stores, store-data, logistics-data, org context, `storefront-url`, seed pages. |
| `packages/liquid` | Liquid engine + theme templates (`themes/classic/sections/*.liquid`) that render store pages. |
| `packages/themes` | React theme components. **Imports from `apps/storefront` via relative paths** (see Known traps). |
| `packages/verticals` | Vertical definitions (`shop`, `ngo`): default pages/sections and the settings nav model. |
| `packages/ui` | shadcn-style primitives. Owns the Radix/cva/clsx deps. `src/kit/*` (`@mcloud/ui/kit/<name>`) is the admin design kit shared by both apps. |
| `packages/config` | Shared `tsconfig.base.json`. |
| `migrations/` | Hand-written SQL migrations, dated `YYYYMMDD_name.sql`. Applied manually to Supabase; there is no migration runner. |

Rule of thumb: **settings UI and `/api/store/*` live in the storefront; anything shared by
both apps goes in `@mcloud/merchant`** (or another package), never copied between apps.
Web and storefront are separate origins; cross-links go through `webUrl()` /
`storeSettingsUrl()`, and `apps/web/proxy.ts` 307-redirects old `/org/:org/:store/settings/*`
URLs to the storefront. The WorkOS session cookie is shared via `WORKOS_COOKIE_DOMAIN`.

## Commands

Run from the repo root unless noted. Node 24 (CI), npm 12. The Dockerfiles still use Node 22.

```sh
npm install
npm run dev                 # turbo: web (3000) + storefront (3001)
npx turbo run typecheck lint test    # exactly what CI runs (.github/workflows/ci.yml)
npx turbo run build         # needs network (Google Fonts) and env vars; slow (~2.5 min)
npm test -w @mcloud/storefront       # one workspace's tests
node --import ./scripts/ts-resolve.mjs path/to/x.test.ts   # one test file (run from its workspace dir)
```

- **Tests** are plain `node:test`/`assert` files (`*.test.ts`) run by `scripts/run-tests.mjs`,
  one process per file, with `scripts/ts-resolve.mjs` mapping extensionless imports and the
  `@/` alias. No Jest/Vitest. Don't use `node --test` on paths containing `[...]` or `(...)`; they are treated as globs.
  A test file that only logs "passed" must still throw on failure (use `assert`).
- **Lint** is ESLint 9 (`eslint-config-next` 16; ESLint 10 breaks `eslint-plugin-react`, don't bump it).
  Many rules are deliberately `warn` (baseline debt). New code should not add warnings, and `lint` must stay at 0 errors.
- Mobile apps: `cd apps/mobile && npm install && npx expo start` (same for `apps/nuru`). Android builds: `.github/workflows/android-build.yml`, EAS profiles in `eas.json`.
- `/run-mcloud` skill drives the running app with Playwright for screenshots/UI checks.

## Turborepo

Version 2.11.x, **strict env mode**: a variable not listed in `turbo.json` `tasks.build.env`
(or `NEXT_PUBLIC_*`, which is inferred) is invisible to `next build` under `turbo run build`.
When code starts reading a new env var at build time, add it there. Env var names for the
storefront are in `apps/storefront/ENV.md` (names only, never values). Read the installed
turbo docs (see the managed block above) before changing `turbo.json`.

## Conventions

- **TypeScript 6, Next 16 App Router, React 19, Tailwind 4.** `next build --webpack` is the
  production build; `next dev --turbopack` locally. Server actions and route handlers are
  the backend; there is no separate API server.
- **Match the surrounding file** for indentation, semicolons and quote style; the repo is not uniform (2- and 4-space both occur).
- **Imports:** use `@/…` inside an app, `@mcloud/<pkg>` across packages. **Never import
  from `apps/*` inside `packages/*`**, and never import one app from the other.
- **Pure logic goes in its own `*-logic.ts` / `*-ops.ts` file with a sibling `.test.ts`**
  (see `editor/section-ops.ts`, `donate-logic.ts`). Route handlers and components stay thin.
- Money is KES unless a store sets another currency; Daraja (M-Pesa), PalPluss and PayPal are the payment rails.
- **Don't add dependencies to an app that a package already declares** (e.g. Radix, `clsx`, `cva`, `liquidjs`): declare each dep in the workspace that imports it.

## Security rules (read before touching API routes)

- **Every `app/api/**/route.ts` starts with `// @route-kind: <kind>`** (`admin`, `member`, `mobile`,
  `customer`, `partner`, `cron`, `session`, `public`, `webhook`) and must call that kind's gate;
  `public`/`webhook`/`session` need a reason after ` — `. A test enforces this (`scripts/route-kinds.mjs`).
  See `docs/api.md`. Use `requireAdmin()` (web) and `requireStoreAccess[ById]()` + `canManage()`; don't re-implement them.
- **Money:** charge amounts come from the stored order, never the request; an order is `paid` only from a
  provider-confirmed amount that covers its total; order ids from clients are the order *number*, looked up
  scoped to the store. Rules live in `packages/merchant/src/payments.ts`. Read `docs/payments.md`.
- **Uploads** go through `/api/upload` with keys `<bucket>/<storeId>/…`; callers must prefix paths with the store id.

- **Never query the database from the browser.** All reads and writes are server-side (route handlers, server components, server actions). Merchant screens call the actions in `apps/storefront/lib/admin/*`, which check the session, call `requireManagedStore`, scope every query by `store_id` and enforce plan limits. The browser Supabase clients are for Auth only; `browser-db.test.ts` in each app pins the allowed importers.
- `createClient()` from `@mcloud/db/server` uses the **service-role key and bypasses RLS**.
  Every route using it must enforce authorization itself: a session (`getSession()` from
  `@mcloud/auth`) **and** a membership/ownership check for the store/org in question. A
  session alone is not authorization.
- **`supabase.auth.getUser()` always returns no user** with the service-role client (identity is
  WorkOS, not Supabase Auth). Never gate on it. Customer (shopper) auth in the storefront is a
  separate Supabase project path (`customer-client`/`customer-server`) and is the exception.
- Webhooks and callbacks (Daraja, PalPluss, PayPal) are unauthenticated by nature. **Never trust
  the body**: re-fetch status and amount from the provider (see `webhooks/palpluss`,
  `reach/payments.ts`) or match against a stored identifier before changing money state.
- Web `/api/*` responses carry reflective CORS **without** `Allow-Credentials` (`apps/web/proxy.ts`).
  Keep it that way: cookie-authenticated routes must not be readable cross-origin.
  Mobile uses bearer tokens; partner routes use `x-partner-secret` (`requirePartnerSecret`).
- Never render request headers/params with `dangerouslySetInnerHTML`. Liquid output is the
  one sanctioned HTML-injection path and it is store-owner content.
- Never print, commit, or paste secret values (`.env*.local` and `.dev.vars` are gitignored). Use names only in docs.

## Plans

Decide a store's plan with `getStorePlan()` / `resolvePlan()` (`@mcloud/merchant`), never by reading `stores.is_pro`
(a drifting legacy cache). The only upgrade path is org Billing (wallet-paid); there is no Google Play billing.

## Identity

`AuthUser.id` is the WorkOS `externalId` when present (the legacy `auth0|…` id), otherwise the WorkOS
id. Foreign keys in the database are keyed on that. Do **not** remove the `auth0|` mapping or
`ensureLinked()` in `packages/auth/src/providers/workos.ts` until every user is linked. Auth0 itself is gone.

## Known traps

- `packages/themes/src/classic/*` imports `apps/storefront/{components,contexts,lib}` by relative path.
  Moving or deleting those storefront files breaks themes (`MdxContent`, `buttons/copy`, `WishlistButton`,
  `CartContext`, `CustomerAuthContext`, `currency`). `tsc` in storefront catches it; treat it as the guard.
- Web and storefront both carry copies of the payments routes (`api/payments/*` vs
  `api/store/[slug]/payments/*`) and `lib/merchant/*`; they have diverged. The Daraja callback URL
  registered with Safaricom points at **web**, so do not delete web's copies without moving it. See `docs/CLEANUP.md` §2.5–2.6.
- The Daraja callback and PayPal return URLs are registered externally and point at **web**; the storefront copies of the payment routes are kept identical but are not what providers call.
- `apps/storefront/app/(merchant)/globals.css` is a copy of web's `globals.css`; token changes go in both.
- `packages/liquid/src/themes-manifest.ts` is **generated** from `themes/**/*.liquid`: after editing a template run
  `npm run gen:manifest -w @mcloud/liquid` (a test fails if you forget).
- **Public store pages are cached** (ISR, `revalidate = 3600`, empty `generateStaticParams`). Nothing under
  `app/(storefront)/store/[slug]` may read `cookies()`/`headers()`/`searchParams` or use `createClient()`: use
  `createPublicClient()`. One such read makes the page dynamic again and, because the route is declared
  cacheable, fails it with `DYNAMIC_SERVER_USAGE` (`public-cache.test.ts` pins this). The Editor preview is the
  only dynamic route (`store/[slug]/-preview`). After any write that changes what visitors see, call
  `revalidateStore(slug)` / `revalidateStoreById(id)` (storefront) or `revalidateStorefront(slug)` (web, posts to
  `/api/revalidate`). See `docs/caching.md`.
- **Browser calls choose their origin on purpose** (`apps/storefront/lib/api-base.ts`): `STORE_API` (`/api`,
  same-origin) for `/api/store/[slug]/*`, `webApi()` for the payment providers (web only, cross-origin, so no
  `credentials`). Never read `NEXT_PUBLIC_API_BASE_URL`: it once held the storefront's absolute URL and broke
  every custom-domain checkout (`api-origin.test.ts` pins this).
- `users.role` is the platform role only: `admin` gates `requireAdmin`; `client` means the person owns an org or store (set by the `orgs_promote_owner` / `stores_promote_owner` triggers, `migrations/20261023_owner_role_client.sql`); `customer` is everyone else. Reach roles live in `reach_users`. Shoppers are not in `users`; they are in `customers`.
- **Every admin write is audited.** A state-changing `app/api/admin/*` route or admin server action calls `recordAudit()` (`apps/web/lib/audit.ts`) after it succeeds. It never throws, so it cannot fail the change it records. The log is append-only (`admin_audit_log`, see `docs/architecture.md`).
- Both root layouts fetch Google Fonts at build time.
- `NEXT_PUBLIC_*` values are inlined at build: changing one needs a redeploy.
- The `(storefront)` route group is the public site; `(merchant)` is the signed-in surface.
- A `[[...path]]` redirect route and the web proxy forward legacy settings URLs; don't remove them while old links exist.

## Working here

- Before reporting a change done: `npx turbo run typecheck lint test`. For anything touching routing,
  auth, proxy, or build config, also `npx turbo run build`.
- Prefer deleting dead code over commenting it out, but **verify "unused" with a repo-wide grep and `tsc`**
  (dynamic imports, scripts, and cross-package relative imports defeat naive scans; this has bitten before).
- Keep `docs/CLEANUP.md` current: tick items off when done rather than leaving stale TODOs.
- Commit messages follow `type(scope): summary` (`feat`, `fix`, `chore`, `refactor`, `docs`).
