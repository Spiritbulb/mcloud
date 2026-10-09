# Post-migration cleanup

Store settings moved from `apps/web` to `apps/storefront` (served at
`app.mcloud.co.ke/org/{org}/{store}/settings`). The move works; this file lists what
it left behind, plus older problems the audit turned up.

How this was built: static scans (import graph, dependency greps, diffs) plus reading
the code. Nothing here has been deleted. **Every "unused" item below is a candidate:
verify before removing** (a grep cannot see dynamic imports, scripts, or Vercel-side
config). Each section says how.

Legend: **P0** broken or unsafe now, **P1** do soon, **P2** tidy, **P3** nice to have.
Items marked *(verified)* were checked against the code or a build; the rest are
scan results.

---

## 0. Where things live now

| Concern | Lives in |
|---|---|
| Store settings UI and its API routes (`/api/store/*` admin routes, `/api/upload`) | `apps/storefront` |
| Org hub, billing, servers, login/logout, marketing, admin | `apps/web` |
| Shared merchant logic (`plans`, `stores`, `store-data`, `logistics-data`, `picker`, `org-context`, `storefront-url`) | `packages/merchant` |
| Old-URL forwarding | `apps/web/proxy.ts` (`/org/:org/:store/settings/*` → storefront, 307) |
| Session cookie | WorkOS AuthKit, shared via `WORKOS_COOKIE_DOMAIN=.mcloud.co.ke` |

---

## 1. P0: broken or unsafe

### 1.1 Remaining `supabase.auth.getUser()` calls always return no user *(verified in code)*
`@mcloud/db/server` creates a service-role client with no Supabase session, so
`auth.getUser()` is always empty now that WorkOS is the identity provider. Any route
that gates on it returns 401 forever. Fixed already: storefront `api/store/domain`
(POST) and `api/store/[slug]/integrations` (POST). Still present:

- `apps/web/app/api/store/[slug]/integrations/route.ts:94`: duplicate, delete the file (see 3.1).
- `apps/web/app/api/payments/mpesa/test-credentials/route.ts:8`: duplicate, delete (see 3.2).
- `apps/storefront/contexts/CustomerAuthContext.tsx:27,42`: this one is the **customer** auth (separate `customer-client`), probably intentional; confirm.

How to find more: `grep -rn "auth\.getUser\|auth\.getSession" apps packages`.

### 1.2 `apps/web/app/api/upload/route.ts` has no auth *(verified in code)*
`PUT /api/upload?key=...` streams any body to the R2 worker with the server secret.
Anyone can write arbitrary keys. The storefront copy now requires a session; web's
still does not. Callers in web: `lib/upload.ts` (which is itself unused, see 2.1). Delete
the route and `lib/upload.ts`, or add the same session check.

### 1.3 Reflective CORS with credentials on every web `/api/*` response *(verified in code)*
`apps/web/proxy.ts` (`Access-Control-Allow-Origin: <request Origin>` +
`Allow-Credentials: true`) for every `/api/*` path except `/api/auth/*`. Any website a
signed-in merchant visits can call cookie-authenticated web APIs and read the response.
Mobile uses bearer tokens and does not need credentialed CORS. Restrict to an allow-list
(storefront + admin origins) and drop `Allow-Credentials` for bearer-only routes.

### 1.4 `createClient()` is service-role everywhere
`packages/db/src/server.ts` builds the client with `SUPABASE_SERVICE_ROLE_KEY`, so RLS
is bypassed on every server path and authorization lives only in route code. Several
routes check `owner_id`, others check `store_members`, others nothing. Not a bug by
itself; it is why 1.1 and 1.2 are dangerous. Medium-term: split `createAdminClient()`
(explicit, rare) from an RLS-respecting client for user-scoped reads.

### 1.5 Unauthenticated routes: review each
Routes under `apps/web/app/api` with no session / signature / secret reference in the
file (scan result, may be false positives where the check is in a helper):
`shopify/storefront`, `health`, `partner/waitlist`, `webhooks/palpluss`,
`webhooks/palpluss/reach`, `payments/mpesa/callback`, `payments/mpesa/status`,
`beta/join`. Webhooks should verify a signature or shared secret; `mpesa/status` should
at least require the checkout id. Also review the storefront
`api/store/[slug]/integrations` **GET**, which is public by design (returns non-secret
flags) but also returns arbitrary non-secret config fields.

### 1.6 Production env has Auth0 secrets
`apps/web/.env.local` (pulled from Vercel) still contains `AUTH0_*`. Remove from the
Vercel projects once the provider is gone (see 4.1). `.env*` is gitignored, so this is a
hygiene item, not a leak, but check no copy exists in git history:
`git log --all -S"AUTH0_CLIENT_SECRET" --oneline`.

---

## 2. P1: dead code left by the move

### 2.1 Unreferenced files in `apps/web` *(import-graph scan; verify each)*
Not imported by anything in the app (entry files, tests and framework files excluded):

```
app/(merchant)/org/pick/picker-client.tsx      (page may be a route.ts redirect now)
app/auth/actions.ts
app/types/database.ts, app/types/global.d.ts, types/*.d.ts   (check tsconfig includes)
components/feature-steps.tsx   login-form.tsx   logout-button.tsx
components/page-loading.tsx    store-carousel.tsx   theme-color-sync.tsx
components/theme-provider.tsx  upsell.tsx (only a storefront file mentions it)
components/support/ticket-list.tsx
components/animate-ui/components/community/playful-todolist.tsx
components/owner-banner.ts     (nothing sets x-inject-owner-banner, see 2.4)
hooks/use-blog.ts   lib/auth/intent.ts   lib/beta-email.ts   lib/liquid.ts
lib/payment-config.ts   lib/pro-gate.ts   lib/upload.ts
scripts/verify-google-jwt.ts   scripts/verify-google-play.ts   (manual scripts, keep if used)
```
Verify: for each, `grep -rn "<name>" apps packages` (also check `next.config`, scripts,
docs). Delete in batches and run `tsc --noEmit` + a web build after each batch.

### 2.2 Unreferenced files in `apps/storefront`
```
components/MdxContent.tsx   components/animate-ui/components/buttons/copy.tsx
components/store/Storefront.tsx   components/store/blog.tsx
components/store/blog/{list-shell,post-shell}.tsx
components/store/StoreSettingsAppearance.tsx   (moved from web; nothing imports it)
```
`StoreSettingsAppearance` imports `appearance-settings`; if both are unused the settings
`appearance` page uses something else. Check before deleting either.

### 2.3 web's org layout does needless work
`apps/web/app/(merchant)/org/[orgSlug]/layout.tsx` still calls `getPickerData()` (four
Supabase queries) and wraps children in `OrgContextProvider`, but the only consumer of
`useOrgContext` was the settings shell, which now runs in the storefront. Remove the
`getPickerData` call and provider from web's layout (keep the auth + org-exists check).
This is a per-page DB cost on every org page.

### 2.4 `x-inject-owner-banner` is dead
Nothing sets the header. Remaining readers: `apps/storefront/app/(storefront)/store/[slug]/layout.tsx:106`
(web's was removed, which also unblocked static rendering). Remove the storefront read,
`apps/web/components/owner-banner.ts`, and any `data-dashboard` wiring.

### 2.5 Duplicate API routes between the apps
Both apps carry copies of:

| Route | Status |
|---|---|
| `api/store/[slug]/integrations` | identical *(verified)*; **delete web's** |
| `api/payments/{mpesa/{callback,status,stk-push},paypal/{capture-order,create-order}}` (web) vs `api/store/[slug]/payments/*` (storefront) | identical *(verified)* |
| `api/payments/mpesa/test-credentials` | web's differs (supabase auth, broken); **delete web's** |

For the payments pair, decide which side owns them. Callers and external config point at
web today: the Daraja callback URL is hard-coded in both copies as
`https://mcloud.co.ke/api/payments/mpesa/callback`, and PayPal's `return_url` is built
from `appUrl`. Do not delete web's copies until those external registrations are moved
and a payment has been tested end to end in production.

### 2.6 Duplicate libraries
`apps/storefront/lib/merchant/{stores,store-managers,send-push}.ts` are older copies
that have already **diverged** from `packages/merchant/src/stores.ts` and
`apps/web/lib/merchant/{store-managers,send-push}.ts` *(verified: files differ)*. Behaviour
now depends on which app handles the request. Consolidate into `@mcloud/merchant`
(the storefront ones are used by the mpesa callback and mpesa-code checkout routes). Also
`apps/web/lib/liquid.ts` vs `packages/liquid`; `apps/web/app/api/upload` vs the storefront one.

### 2.7 Duplicate stylesheet
`apps/storefront/app/(merchant)/globals.css` is a ~1000-line copy of
`apps/web/app/globals.css`. Move the shared tokens into a package (for example
`packages/ui/src/theme.css`) and `@import` it from both. Until then, token changes must
be made twice. Also copied: the no-flash theme script and font setup in the root layouts.

### 2.8 Unused dependencies *(name-grep scan; verify each)*
`apps/web`: `@auth0/nextjs-auth0`, `@codemirror/lang-markdown`, `@uiw/react-codemirror`,
`@uiw/react-md-editor`, `react-markdown`, `react-dropzone`, `@mcloud/verticals`,
`@ngrok/ngrok`, `@playwright/test`, `@supabase/ssr`, `class-variance-authority`, `clsx`,
`tailwind-merge`, `sonner`, `ed25519-keygen`, `ssh2`, `firebase`, `glob`,
`intasend-node`, `liquidjs`, `remark`, `remark-gfm`, `remark-html`, `ua-parser-js`,
`web-push`, `tw-animate-css`, `standard-version`, all `@radix-ui/*` (the same ones are
dependencies of `@mcloud/ui`, which is where they belong).
`apps/storefront`: `clsx`, `tailwind-merge`, `dotenv`, `googleapis`.
Root `package.json`: `pg`, `pg-copy-streams`, `react-icons`, `@types/ssh2`.

Caveats: `ssh2` / `ed25519-keygen` may be loaded dynamically by `lib/ssh-keygen.ts` and
`lib/upcloud.ts`; `typescript` and `react-dom` showed up only because they are tooling /
peer deps; `firebase` and `web-push` may be used by `api/mobile/*`. Check with
`grep -rn "<pkg>" apps packages scripts`, remove one at a time, run `npm install` and
the builds. Also apply `npm dedupe` afterwards.

---

## 3. P1: infrastructure and config

### 3.1 Storefront `Dockerfile` copies the wrong static assets *(verified)*
Line 25 copies `apps/web/.next/static` into the storefront image; it should be
`apps/storefront/.next/static`. The deps stage also copies only
`apps/storefront/package.json` while the lockfile spans all workspaces. `npm ci` will
likely fail; copy all workspace manifests or use `turbo prune`. `public/` now exists
(logos) so line 26 stops being a no-op. Still unused (Vercel deploys), so low urgency, but
it will bite when Dokploy happens.

### 3.2 Cloudflare leftovers
`apps/web/wrangler.jsonc` (OpenNext / Workers) and `.open-next` references: both apps
deploy to Vercel. Remove the file and any `@opennextjs/cloudflare` / `wrangler`
dependencies and scripts if unused.

### 3.3 `turbo.json`
- No `test` task; none of the packages define a `test` script. Add one per package
  (`node --test`) and a root task.
- Build `env` list is long and partly stale (`APP_BASE_URL`, `API_BASE_URL`,
  `TRADING_VERCEL_*`, `DESKTOP_*`); prune to what each app reads, then split per-app
  using package-level `turbo.json` so a change to a web-only var does not invalidate the
  storefront cache. Remember `NEXT_PUBLIC_*` variables are inlined at build time:
  changing one needs a redeploy.
- `lint` has `dependsOn: ["^lint"]`; packages have no lint scripts, so this is a no-op.
- Per AGENTS.md, read the installed turbo docs before editing.

### 3.4 Lint is broken in both apps *(verified)*
- Web: `eslint.config.mjs` imports `eslint-config-next/core-web-vitals.js`, which the
  installed version no longer exports (`ERR_PACKAGE_PATH_NOT_EXPORTED`).
- Storefront: script is `next lint`, which Next 16 removed, and there is no ESLint config.
Fix both (flat config with `eslint-config-next`), then add `lint` to CI.

### 3.5 No CI except `android-build.yml`
Add a workflow running, on PRs: `npm ci`, `turbo run build` (with dummy envs and a font
stub or network access), `tsc --noEmit` for each app, and `node --test` for the unit
tests. Today nothing verifies a PR. Note `next build` fetches Google Fonts for both root
layouts; CI needs network or self-hosted fonts (`next/font/local`).

### 3.6 Failing unit tests *(verified)*
`packages/merchant/src/seed-pages.test.ts`, `apps/storefront/lib/theme-schema.test.ts`
and `content-draft.test.ts` fail under plain `node --test` because of extensionless
imports (and `@mcloud/verticals` has extensionless internal imports). Either use explicit
`.ts` imports everywhere tests load, or run tests through `tsx`/`vitest`. Tests whose paths
contain `[...]` or `(...)` must be run with `node ./path/to/file.ts`, since the runner
treats brackets as globs. All 32 editor/actions tests pass.

### 3.7 Vercel project settings (outside the repo)
- Domains on the `mcloud` (storefront) project include `shop.mcloud.co.ke`,
  `locdessence.com`, `locdessence.shop`: confirm each is intended. `shop.mcloud.co.ke`
  is documented as a must-keep live origin; decide when it can redirect to `app.`.
- Preview deployments have `ssoProtection` on the storefront project, so previews of
  `/org/*` need login to Vercel plus WorkOS. Add the preview URL pattern to WorkOS
  redirect URIs if you test auth there.
- Env var checklist: `apps/storefront/ENV.md`. Re-check after Auth0 removal.
- After the redirect has run clean for a while: change the 307s to 308s in
  `apps/web/proxy.ts` (`STORE_SETTINGS_RE` rule and `storefrontRedirect`). 308s are cached
  by browsers, so only flip once every mapping is correct.

---

## 4. P1: removing Auth0

Auth0 is no longer the active provider (`packages/auth/src/index.ts` exports WorkOS).
References to remove:

- `packages/auth`: `src/providers/auth0.ts`, the `@auth0/nextjs-auth0` dependency in
  `package.json`, the Auth0 mentions in `index.ts`, `server.ts`, `types.ts`, `callback.ts`,
  `routes.ts`.
- `apps/web`: `package.json` dependency; `app/api/account/route.ts`,
  `app/api/docs/route.ts`, `app/api/mobile/notes/route.ts`, `app/auth/layout.tsx`,
  `components/auth-loading.tsx`, `public/sw.js` (comments / checks);
  `scripts/migrate-users-to-workos.mjs` and `scripts/link-workos-externalids.mjs`
  once migration is confirmed complete.
- Settings account page: user-facing copy "managed by Auth0" with a link to auth0.com
  (`apps/storefront/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/account/account-client.tsx`
  around lines 248 to 265). **This is visible to merchants.**
- `turbo.json` env: `AUTH0_*`.
- **Identity continuity.** `mapUser()` prefers the WorkOS `externalId` (the old
  `auth0|...` id) as `AuthUser.id`. Do not delete the Auth0 id mapping, or
  `ensureLinked()` in `packages/auth/src/providers/workos.ts`, until every active user is
  linked, otherwise foreign keys keyed on `auth0|...` stop matching. Count remaining
  unlinked users before removing: users in WorkOS without `externalId`.
- `ensureLinked()` now caches "no legacy row" for an hour per instance. After migration,
  delete the function and its call sites entirely.

---

## 5. P2: naming, comments, docs

- `shop.mcloud.co.ke` and `menengai.cloud` still appear in comments: `apps/web/proxy.ts`
  (around lines 217 and 221), `apps/storefront/proxy.ts` (line ~176),
  `apps/storefront/lib/host.ts` (header comment and `PLATFORM_APEX_DOMAINS` doc),
  `packages/merchant/src/storefront-url.ts` (intentional history, keep). The `apex` list
  comment about "migrating" is stale.
- `apps/web/CHANGELOG.md` is generated; leave.
- `docs/superpowers/**` plans reference `apps/web/app/(merchant)/org/.../settings/...`
  paths that no longer exist. Historical; add a note at the top of the ones still in use
  or move to an `archive/` folder.
- `README.md` and `AGENTS.md`: add a short architecture note (table in section 0) and the
  rule "settings code lives in storefront; shared logic in `@mcloud/merchant`".
- `[storeSlug]` / "store" vs "site" copy: see the merchant-vertical plan; not part of this.
- Rename `apps/storefront/app/(merchant)` route group comments/readme so it is clear it is
  the merchant (signed-in) surface and `(storefront)` is the public surface.
- `apps/web/components/mcloud-nwlt].png`: stray filename with a bracket; rename or delete.
- `apps/storefront/package.json` has an `exports` map (`./lib/sections`, `./lib/hero`)
  only so web could import them; once nothing in web imports them (the settings editor
  moved), remove it. Likewise the `@mcloud/storefront` dependency in `apps/web/package.json`
  and its `transpilePackages` entry.
- `apps/storefront/lib/host.ts`: `PLATFORM_APEX_DOMAINS` is duplicated in
  `apps/web/proxy.ts`. Put it in `@mcloud/merchant` (or `@mcloud/config`).

---

## 6. P2: performance follow-ups

Already done on main: auth pass skipped for static files and cookie-less requests,
`headers()` removed from web's root layout, marketing pages static (`mc_li` hint cookie),
wallet poll slowed to 5 minutes with focus refresh, `ensureLinked` negative cache,
storefront proxy lookup cache. Remaining ideas, in order of expected payoff:

1. Section 2.3 (web org layout queries) and removing per-request `getSession()` from
   layouts that only need "is there a session".
2. `@mcloud/db` `createClient()` is per-call and reads cookies, so any layout using it is
   dynamic. Use `unstable_cache` / `use cache` for data that is not user-specific
   (store theme, sections) in the storefront, so public store pages can be cached at the
   edge instead of invoking a function per visit.
3. `/docs` is dynamic only because of `cookies()` and `searchParams`; make it static and
   move the "edit" affordance to a client check.
4. The wallet pill could read the balance from the layout's data instead of polling at
   all, or use a visible-tab-only SSE.
5. Re-measure after each deploy: Vercel Observability → middleware and function Active CPU
   by route; compare before and after. Expect middleware CPU to fall for anonymous traffic.
6. Check the `mc_li` hint cookie behaviour after logout on a long-lived tab; it clears on
   the next proxy request.
7. The storefront proxy still queries Supabase on every cache miss for custom-domain
   resolution; the 60 s cache is per instance. A shared cache (Vercel Runtime Cache or
   KV) would raise the hit rate. Negative results are cached too, so a brand-new custom
   domain can take up to a minute to resolve.

---

## 7. P2: product and platform decisions still open

- **Slug conflicts.** New stores cannot use reserved slugs (`org`, `api`, `auth`, ...),
  but existing stores might already: `select slug from stores where slug in (...)` using
  `RESERVED_STORE_SLUGS` in `packages/merchant/src/stores.ts`. Any hit is unreachable at
  `app.mcloud.co.ke/{slug}`.
- **Mobile.** The app is native (Expo), not a TWA. `openOnWeb()` mints a handoff URL on
  the web origin; the web proxy then forwards settings paths to the storefront, and the
  shared cookie domain carries the session across. No mobile change is needed. Retest
  the handoff once: it relies on `WORKOS_COOKIE_DOMAIN` being set on **web**, because web
  writes the cookie during `/auth/handoff`. The comments in `src/lib/config.ts` still say
  web hosts "the deep-link targets"; settings now redirect.
- **Cookie hygiene.** Cookies set before `WORKOS_COOKIE_DOMAIN` existed are host-only and
  can coexist with the shared one. If users report "logged out on one app", have them sign
  out or clear site cookies. Consider setting an explicit expiry/clean-up on logout for
  both host-only and domain cookies.
- **`spiritb.uk`.** A separate project shares the cookie password with web and the
  storefront. Cookies cannot be shared across registrable domains, so confirm what it
  needs the password for (sealing a session another app opens?). If it only authenticates
  and returns, it does not need the password. One secret in three projects widens the
  blast radius.
- **`/org` hub on web vs settings on storefront** means two origins for one product.
  Cross-origin links use `webUrl()` (storefront → web) and `storeSettingsUrl()` (web →
  storefront). Longer term, consider serving the whole merchant area from one app, or a
  single origin via rewrites, to remove `webAppOrigin()` and the two helpers.
- **TypeScript 6 / Next 16 / Tailwind 4 upgrades** are in flight; keep `tsc --noEmit` in CI.

---

## 8. Suggested order of work

1. P0 items: 1.2 (web upload), 1.3 (CORS), 1.1 leftovers, then 1.5 review.
2. Delete duplicates with no external wiring: web `api/store/[slug]/integrations`,
   web `payments/mpesa/test-credentials`, web `api/upload` + `lib/upload.ts`.
3. Auth0 removal (section 4), after counting unlinked users.
4. Orphan files (2.1, 2.2) in small batches; unused deps (2.8) one at a time.
5. Simplify web's org layout (2.3). Consolidate `lib/merchant` duplicates (2.6).
6. CI, lint, tests (3.4 to 3.6) so later cleanups are safe.
7. Dockerfile and Cloudflare leftovers; stylesheet dedupe; comment/doc updates.
8. Flip 307 → 308 after a clean observation period.

For each batch: `npx tsc --noEmit` in `apps/web` and `apps/storefront`, the builds
(`npx next build --webpack` in each; fonts need network), the unit tests, and a manual
pass: sign in, open settings, save a setting, upload an image, add a domain, open the
org hub from settings and back.
