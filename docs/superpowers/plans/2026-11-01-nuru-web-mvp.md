# Nuru Web MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `nuru.spiritb.uk`: a public feed of Kenyan higher-education news, a waitlist, and a signed-in PDF viewer with search, generated notes and questions.

**Architecture:** A new Next 16 app, `apps/nuru`, serves the web pages and the JSON API that mobile will call later. It has its own Neon database (raw SQL through `@neondatabase/serverless`) and stores files in Backblaze B2 using presigned URLs. It shares only WorkOS identity (through a new `@mcloud/auth/standalone` entry that never loads Supabase), `@mcloud/ui` and `@mcloud/mail` with mcloud. A GitHub Actions schedule calls the feed cron route every 30 minutes. Notes and questions are generated in `after()`.

**Tech Stack:** Next 16 App Router, React 19.3, TypeScript ~6.0.3, Tailwind 4, `@neondatabase/serverless`, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (B2), `fast-xml-parser` (RSS/Atom), `unpdf` (server text extraction), `pdfjs-dist` (viewer), `@anthropic-ai/sdk` + `zod` (structured output), `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-01-nuru-web-mvp-design.md`

**Branch:** create `feat/nuru-web` from `docs/nuru-web-mvp-spec`. Commit as the repo's usual author if git has no identity: `git -c user.name=thatbush -c user.email=bentley@spiritbulb.org commit …`. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.

## Global Constraints

- Every page shows the exact copy **"Nuru is AI and can make mistakes"** in a persistent bar.
- Feed rows show only the headline (which links out with `rel="noopener"` and `target="_blank"`), the source name, an absolute date and the summary. No full article text is ever fetched, stored or shown.
- `summary` is the source's own description with HTML stripped, at most 280 characters. It is never LLM text.
- No predictions anywhere: the `why` prompt and the notes prompt both forbid them.
- `apps/nuru` never imports `@mcloud/db`, `@mcloud/merchant`, `@supabase/*`, `@mcloud/auth` (root), `@mcloud/auth/server`, `@mcloud/auth/callback` or `@mcloud/auth/management`. From `@mcloud/auth` it may import only `/standalone`, `/routes` and `/types`.
- No database access from the browser: queries live only in route handlers, server components and server actions.
- Every `app/api/**/route.ts` starts with `// @route-kind: <kind>` (see `scripts/route-kinds.mjs`).
- Uploads must be PDF (`application/pdf`, `%PDF-` magic bytes) and at most `25 * 1024 * 1024` bytes.
- Every query touching `files`, `file_pages`, `file_outputs` or `asks` is scoped by `owner_id`. A file id alone never grants access.
- Every admin server action re-checks `role = 'admin'`.
- A Nuru user id is the raw WorkOS user id (`user_…`), even for accounts whose WorkOS `externalId` is an `auth0|…` id.
- LLM model: `claude-opus-5-5` (default per the Claude API guidance; the old Nuru code used Haiku 4.5). Use `client.beta.messages.parse` with `betas: ['server-side-fallback-2026-07-01']` and `fallbacks: 'default'`, and check `stop_reason === 'refusal'` before reading output.
- Versions match `apps/web`: `next ^16.4.3`, `react`/`react-dom` `19.3.0`, `typescript ~6.0.3`, `eslint ^9.39.5`, `eslint-config-next ^16.4.3`, `tailwindcss ^4`, `@anthropic-ai/sdk ^0.131.0`, `unpdf ^1.8.1`, `zod ^4.6.7`.
- `apps/nuru` style: 2-space indent, single quotes, no semicolons (as `apps/web/proxy.ts`). Use system fonts, not Google Fonts, so `next build` needs no network.
- Commit messages follow `type(scope): summary`.

## Review Focus

1. **Scanned PDF with no text layer.** Status becomes `failed` with error `no_text`, no LLM call is made, the PDF still renders and "Try again" is hidden. Pinned in Task 9 (`hasText`, `errorMessage`).
2. **Messy feed entries:** relative links, HTML entities in titles (`&#8217;`), missing or future `pubDate`, `utm_*` query strings. Expected: relative links resolve against the source homepage, entities are decoded, bad dates become `null` (the item sorts by `fetched_at`), and tracking params are dropped. Pinned in Task 4.
3. **The model cites pages that don't exist** (0, or past the last page). Expected: those refs are dropped, and an entry left with no valid page is dropped. Pinned in Task 9 (`cleanOutputs`).
4. **Hostile or odd filenames** (`../../x.pdf`, `résumé notes (1).PDF`, empty names). Expected: the B2 key stays `files/<owner>/<id>/<safe>.pdf`, with no path traversal and no characters outside `[A-Za-z0-9._-]`. Pinned in Task 8 (`safeFilename`).
5. **The same email joining twice, in different case.** Expected: one row per (`lower(email)`, `kind`), a 200 with `already: true` and no second email. Pinned in Task 7 (unique index plus `parseWaitlistInput` lowercasing).

---

### Task 1: Move both Expo apps out of the monorepo

**Files:**
- Delete: `apps/mobile/`, `apps/nuru/`, `.github/workflows/android-build.yml`
- Modify: `AGENTS.md` (Layout table, Commands, the intro line "Spiritbulb also ships two mobile apps"), `README.md` (lines 14–15, 21, 44, 61), `docs/architecture.md`, `docs/CLEANUP.md` (only lines that reference these paths)
- Create (outside this repo): `~/mcloud-mobile`, `~/nuru-mobile`

Old specs and plans under `docs/superpowers/` are historical records. Leave them alone.

- [ ] **Step 1: Split history into branches**

```bash
git subtree split --prefix=apps/mobile -b export/mobile
git subtree split --prefix=apps/nuru -b export/nuru-mobile
```
Expected: each command prints a commit sha.

- [ ] **Step 2: Create the standalone repos**

```bash
git init ~/mcloud-mobile && git -C ~/mcloud-mobile pull ~/mcloud export/mobile
git init ~/nuru-mobile && git -C ~/nuru-mobile pull ~/mcloud export/nuru-mobile
```
Expected: `ls ~/mcloud-mobile` shows `package.json`, `app.json` and `eas.json` at the root.

- [ ] **Step 3: Copy the gitignored local files that the split leaves behind**

Run `git ls-files --others --ignored --exclude-standard apps/mobile apps/nuru | grep -vE '/(node_modules|android|ios|\.expo|dist)/'`. Copy each listed file to the same relative path in the new repo, then diff the two lists to confirm nothing was missed. **Don't delete the originals until this check passes.** These are env files and keystores, so print only their names, never their contents.

- [ ] **Step 4: Move the Android workflow into `~/mcloud-mobile`**

Copy `.github/workflows/android-build.yml` to `~/mcloud-mobile/.github/workflows/`. Remove `defaults.run.working-directory: apps/mobile`, change `apps/mobile/android` to `android`, and remove the `apps/mobile/` prefix from the artifact path. Commit it there as `chore: move android build workflow from mcloud`. Leave adding a remote to the user.

- [ ] **Step 5: Remove the apps from mcloud and update docs**

`git rm -r apps/mobile apps/nuru .github/workflows/android-build.yml`, then `rm -rf apps/mobile apps/nuru` to clear ignored leftovers (after Step 3 passed). In AGENTS.md, README.md and docs/architecture.md, replace the two app rows with one sentence: "The merchant app (`~/mcloud-mobile`) and the Nuru app (`~/nuru-mobile`) live in their own repos and call `apps/web` `/api/mobile/*`." Drop the Expo commands. In AGENTS.md, keep the `/api/mobile/*` and `/api/partner/*` notes, because those routes stay.

- [ ] **Step 6: Verify**

Run: `grep -rn "apps/mobile\|apps/nuru" --exclude-dir=node_modules --exclude-dir=superpowers . ; npx turbo run typecheck lint test`
Expected: no grep hits except `apps/web/CHANGELOG.md`, which is history. Turbo exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: move the Expo apps out of the monorepo"
```

---

### Task 2: `@mcloud/auth/standalone`, an identity entry with no Supabase

The spec asks for an "opt-in linking hook". This task implements it as a provider factory instead of runtime registration: Next bundles the proxy and the app server separately, so a hook registered at startup would not reach every graph. `index.ts` builds the linked provider, which web and storefront use unchanged. `standalone.ts` builds one with no linker and `canonicalId: 'workos'`, and its import graph never reaches `@mcloud/db`.

**Files:**
- Create: `packages/auth/src/providers/workos-logic.ts`, `packages/auth/src/providers/workos-logic.test.ts`, `packages/auth/src/legacy-link.ts`, `packages/auth/src/api.ts`, `packages/auth/src/standalone.ts`, `packages/auth/src/standalone-imports.test.ts`
- Modify: `packages/auth/src/providers/workos.ts`, `packages/auth/src/index.ts`, `packages/auth/src/server.ts`, `packages/auth/package.json` (add `"./standalone": "./src/standalone.ts"` and `"scripts": { "test": "node ../../scripts/run-tests.mjs" }`)

**Interfaces:**
- Produces, in `workos-logic.ts`:
  - `type WorkOSUserish` (moved from workos.ts)
  - `type Linker = (u: WorkOSUserish) => Promise<WorkOSUserish>`
  - `type IdentityOptions = { link?: Linker; canonicalId: 'external' | 'workos' }`
  - `mapUser(u: WorkOSUserish, canonicalId: IdentityOptions['canonicalId']): AuthUser`
  - `resolveIdentity(u: WorkOSUserish, opts: IdentityOptions): Promise<WorkOSUserish>`
- Produces, in `workos.ts`: `createWorkosProvider(opts: IdentityOptions): AuthProviderAdapter`.
- Produces, in `legacy-link.ts`: `ensureLinked: Linker`, moved verbatim with its `noLegacyRow` cache.
- Produces, in `api.ts`: `createAuthApi(p: AuthProviderAdapter)`, which returns `{ getSession, getSessionFromToken, getMobileSession, prepareMiddleware }` with the exact signatures in today's `server.ts`.
- Produces, in `standalone.ts`: `getSession`, `getSessionFromToken`, `getMobileSession`, `prepareMiddleware`, bound to `createWorkosProvider({ canonicalId: 'workos' })`.

- [ ] **Step 1: Write the failing tests** (`workos-logic.test.ts`, 4-space indent like the package)

```ts
const u = { id: 'user_1', email: 'a@b.co', externalId: 'auth0|9' }
test('external mode prefers externalId', () => assert.equal(mapUser(u, 'external').id, 'auth0|9'))
test('workos mode always uses the WorkOS id', () => assert.equal(mapUser(u, 'workos').id, 'user_1'))
test('linker runs when given', async () => {
    let calls = 0
    const out = await resolveIdentity({ id: 'user_2', email: 'x@y.z' }, { canonicalId: 'external', link: async (v) => { calls++; return { ...v, externalId: 'auth0|2' } } })
    assert.equal(calls, 1); assert.equal(out.externalId, 'auth0|2')
})
test('no linker, no call', async () => {
    const v = { id: 'user_3', email: 'q@r.s' }
    assert.equal(await resolveIdentity(v, { canonicalId: 'workos' }), v)
})
test('linkFailed maps to unlinked only in external mode', () => {
    assert.equal(mapUser({ ...u, linkFailed: true }, 'external').unlinked, true)
    assert.equal(mapUser({ ...u, linkFailed: true }, 'workos').unlinked, undefined)
})
```

`standalone-imports.test.ts` follows relative imports recursively from `standalone.ts`. It asserts that no reached file contains `@mcloud/db`, and that `./index` and `./legacy-link` are never reached.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm test -w @mcloud/auth`
Expected: FAIL, because the modules don't exist yet.

- [ ] **Step 3: Implement**

- Move `mapUser`, `WorkOSUserish` and the new `resolveIdentity` into `workos-logic.ts`.
- Move `ensureLinked` and `noLegacyRow` into `legacy-link.ts`.
- Wrap the adapter object in `createWorkosProvider(opts)`. The JWKS can stay module-level. Move `sessionCache` inside the factory. Replace every `ensureLinked(x)` with `resolveIdentity(x, opts)` and every `mapUser(x)` with `mapUser(x, opts.canonicalId)`. `listUsers` uses the same mapping.
- `index.ts`: `export const provider = createWorkosProvider({ link: ensureLinked, canonicalId: 'external' })`.
- `server.ts`: take the four functions from `createAuthApi(provider)`, keep the rest as they are, and keep the doc comments.
- Linked behaviour for web and storefront must not change (AGENTS.md "Identity").

- [ ] **Step 4: Run tests and the whole repo check**

Run: `npm test -w @mcloud/auth && npx turbo run typecheck lint test`
Expected: PASS, with 0 lint errors.

- [ ] **Step 5: Commit**

`git commit -m "refactor(auth): provider factory and a standalone entry without legacy linking"`

---

### Task 3: Scaffold `apps/nuru` (app, database, auth, guards)

**Files:**
- Create:
  - Config: `apps/nuru/package.json` (`@mcloud/nuru`; scripts `dev: next dev --turbopack -p 3002`, `build: next build --webpack`, `start`, `lint: eslint`, `test: node ../../scripts/run-tests.mjs`, `typecheck: tsc --noEmit`), `tsconfig.json` and `eslint.config.mjs` (copy web's), `postcss.config.mjs`, `next.config.ts` (`transpilePackages: ['@mcloud/auth','@mcloud/ui','@mcloud/mail']`, `turbopack: {}`, `agentRules: false`, no `output: 'standalone'`), `next-env.d.ts`
  - App shell: `app/globals.css` (`@import "tailwindcss"; @source "../../../packages/ui/src";`), `app/layout.tsx`, `components/ai-bar.tsx`, `components/site-header.tsx`
  - Proxy and auth routes: `proxy.ts`, `app/callback/route.ts`, `app/auth/sign-in/route.ts`, `app/auth/sign-out/route.ts`
  - Data and session: `lib/db.ts`, `lib/session.ts`, `migrations/20261102_init.sql`
  - Guards: `isolation.test.ts`, `app/api/_route-kinds.test.ts`
  - Docs: `ENV.md`
- Modify: root `package.json` (workspaces add `"apps/nuru"`), `turbo.json` (`tasks.build.env` add `DATABASE_URL`, `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET`, `B2_KEY_ID`, `B2_APPLICATION_KEY`), `scripts/route-kinds.mjs` (add `user: [/requireUser\(/]` with the comment "Nuru: cookie session or bearer token, the caller's own data"), `AGENTS.md` (add a Layout row for `apps/nuru`: "Nuru web + API, `nuru.spiritb.uk`. Own Neon DB and B2; shares only WorkOS identity via `@mcloud/auth/standalone`. Migrations in `apps/nuru/migrations/`.")

Dependencies: `@mcloud/auth`, `@mcloud/ui`, `@mcloud/mail`, `@neondatabase/serverless`, `@workos-inc/authkit-nextjs ^4.4.0`, `next`, `react`, `react-dom`. Dev dependencies are the same set as web. Other libraries are added in the tasks that first use them.

**Interfaces:**
- `lib/db.ts`: `db(): NeonQueryFunction<false, false>`. It uses `neon(process.env.DATABASE_URL!)`, is lazily created and cached, is server-only, and has `import 'server-only'` at the top.
- `lib/session.ts`:
  - `type NuruUser = { id: string; email: string; name: string | null; role: 'user' | 'admin'; canUpload: boolean }`
  - `currentUser(): Promise<NuruUser | null>` works from the cookie, for pages and actions.
  - `requireUser(req: NextRequest): Promise<NuruUser | NextResponse>` uses the bearer token when an `Authorization` header is present (`getMobileSession`), otherwise the cookie (`getSession`). It returns a 401 JSON `{ error: 'Sign in required' }`.
  - `requireAdmin(): Promise<NuruUser>` is for server actions and throws `Error('forbidden')` when the caller isn't an admin.
  - Both resolve through `upsertUser(auth: AuthUser): Promise<NuruUser>`, which is the SQL below.

```sql
insert into users (id, email, name, can_upload)
values ($1, $2, $3, exists (select 1 from waitlist where lower(email) = lower($2) and kind = 'uploads' and status = 'approved'))
on conflict (id) do update set email = excluded.email, name = excluded.name,
  can_upload = users.can_upload or excluded.can_upload
returning id, email, name, role, can_upload
```

- [ ] **Step 1: Write the failing guard tests**

`isolation.test.ts` walks `apps/nuru`, skipping `node_modules` and `.next`, over `.ts`, `.tsx` and `.mjs` files, test files excluded. It asserts that no file matches `/['"](@mcloud\/(db|merchant)|@supabase\/[^'"]*|@mcloud\/auth(\/(server|callback|management))?)['"]/`, and that `package.json` dependencies contain none of `@mcloud/db`, `@mcloud/merchant` or `@supabase/supabase-js`.

`app/api/_route-kinds.test.ts` is a copy of web's with the message "every nuru API route declares and evidences its kind".

- [ ] **Step 2: Write `migrations/20261102_init.sql`**

```sql
create table users (
  id text primary key, email text not null, name text,
  role text not null default 'user' check (role in ('user','admin')),
  can_upload boolean not null default false, created_at timestamptz not null default now());
create table waitlist (
  id uuid primary key default gen_random_uuid(), email text not null, user_id text,
  kind text not null check (kind in ('uploads','institution')), institution_name text, note text,
  ip_hash text,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(), decided_at timestamptz, decided_by text);
create unique index waitlist_email_kind on waitlist (lower(email), kind);
create index waitlist_ip_recent on waitlist (ip_hash, created_at);
create table sources (
  id serial primary key, name text not null, kind text not null check (kind in ('rss','scrape')),
  url text not null unique, homepage text not null,
  category text not null check (category in ('government','university','media')),
  parser text, active boolean not null default true,
  last_fetched_at timestamptz, last_ok_at timestamptz, last_error text);
create table feed_items (
  id bigserial primary key, source_id int not null references sources(id),
  url text not null unique, title text not null, summary text not null default '',
  published_at timestamptz, fetched_at timestamptz not null default now(),
  title_key text not null, why text);
create index feed_items_recent on feed_items ((coalesce(published_at, fetched_at)) desc);
create index feed_items_title_key on feed_items (source_id, title_key);
create table locks (name text primary key, until timestamptz not null default 'epoch');
insert into locks (name) values ('feed');
create table files (
  id uuid primary key, owner_id text not null, b2_key text not null, filename text not null,
  mime text not null default 'application/pdf', bytes int not null, pages int,
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed')),
  error text, created_at timestamptz not null default now());
create index files_owner on files (owner_id, created_at desc);
create table file_pages (
  file_id uuid not null references files(id) on delete cascade, page_no int not null, text text not null,
  tsv tsvector generated always as (to_tsvector('english', text)) stored,
  primary key (file_id, page_no));
create index file_pages_tsv on file_pages using gin (tsv);
create table file_outputs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  kind text not null check (kind in ('notes','questions')), content jsonb not null,
  model text not null, created_at timestamptz not null default now());
create table asks (
  id bigserial primary key, owner_id text not null,
  file_id uuid not null references files(id) on delete cascade,
  page_no int not null, created_at timestamptz not null default now());
create index asks_owner_recent on asks (owner_id, created_at);
```

Two deviations from the spec's data model:
- `waitlist.ip_hash` is new. The unique email index makes counting by email useless for rate limiting, so Task 7 counts by IP instead.
- `locks` replaces `pg_try_advisory_lock`, because the Neon HTTP driver gives each query its own session.

- [ ] **Step 3: Implement the app shell, proxy, auth routes, db and session**

- **`proxy.ts`**: call `prepareMiddleware` from `@mcloud/auth/standalone`, then `finalize(NextResponse.next({ request: { headers: requestHeaders } }))`. Matcher: `['/((?!_next/|favicon.ico|robots.txt).*)']`.
- **`app/callback/route.ts`**: `handleAuth({ returnPathname: '/files' })`.
- **`app/auth/sign-in/route.ts`**: `redirect(await getSignInUrl())`.
- **`app/auth/sign-out/route.ts`**: `signOut({ returnTo: '/' })`, as `apps/web/app/auth/logout/route.ts` does.
- **`layout.tsx`**: renders `<SiteHeader user={await currentUser()} />`, then children, then `<AiBar />`. The bar is fixed to the bottom with the exact disclaimer copy. The header has the Nuru wordmark, Feed, My files (signed in), Admin (admin), and Sign in / Sign out. Load the `frontend-design` skill for the visual pass: a calm, scannable reading layout.
- **`ENV.md`** lists names only:
  - `DATABASE_URL`, `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (`https://nuru.spiritb.uk/callback`)
  - `CRON_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`
  - `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET`, `B2_KEY_ID`, `B2_APPLICATION_KEY`
  - `IP_HASH_SALT`, used by Task 7. Add it to `turbo.json` too.
  - Add a note: "`WORKOS_COOKIE_DOMAIN` must be **unset**."

- [ ] **Step 4: Install and verify**

Run: `npm install && npm test -w @mcloud/nuru && npx turbo run typecheck lint test`
Expected: PASS. Then run `npm run dev -w @mcloud/nuru`, load `http://localhost:3002/` and check that the disclaimer bar renders.

- [ ] **Step 5: Commit**

`git commit -m "feat(nuru): scaffold the Nuru web app with its own database and WorkOS session"`

---

### Task 4: Feed sources, parsing and normalisation

**Files:**
- Create: `apps/nuru/lib/feed/types.ts`, `lib/feed/normalize-logic.ts` (+ `.test.ts`), `lib/feed/rss-logic.ts` (+ `.test.ts`), `lib/feed/__fixtures__/*.xml`, `lib/feed/parsers/index.ts`, `migrations/20261102_seed_sources.sql`
- Dependency: `fast-xml-parser ^5`. Add `node-html-parser` only if a scrape parser is kept.

**Interfaces:**
- `types.ts`:
  - `type Category = 'government' | 'university' | 'media'`
  - `type RawItem = { title?: string; link?: string; description?: string; published?: string }`
  - `type FeedItemInput = { url: string; title: string; summary: string; publishedAt: Date | null; titleKey: string }`
  - `type Source = { id: number; name: string; kind: 'rss' | 'scrape'; url: string; homepage: string; category: Category; parser: string | null }`
- `normalize-logic.ts`:
  - `stripHtml(s: string): string` removes tags, decodes named and numeric entities, and collapses whitespace.
  - `clampSummary(s: string, max = 280): string` cuts at a word boundary and appends `…`.
  - `canonicalUrl(link: string, base: string): string | null` resolves relative links. It returns null unless the result is `http(s)`. It lowercases the host, drops the fragment, and drops `utm_*`, `fbclid` and `gclid`.
  - `titleKey(title: string): string` lowercases, strips punctuation, collapses spaces and keeps the first 80 characters.
  - `normalizeItem(raw: RawItem, homepage: string, now: Date): FeedItemInput | null` returns null when the title or URL is missing. `publishedAt` is null when the date is unparseable or more than one day ahead of `now`.
- `rss-logic.ts`: `parseFeed(xml: string): RawItem[]` handles RSS 2.0 (`item/link`, `description`, `pubDate`) and Atom (`entry/link@href` preferring `rel="alternate"`, `summary` or `content`, `published` or `updated`). It returns `[]` for unparseable XML.
- `parsers/index.ts`: `PARSERS: Record<string, (html: string, base: string) => RawItem[]>`. It may be empty.

- [ ] **Step 1: Probe candidate sources and save fixtures**

Candidates:
- Government: education.go.ke, kuccps.ac.ke, helb.co.ke, cue.or.ke
- Universities: uonbi.ac.ke, ku.ac.ke, jkuat.ac.ke, strathmore.edu, mu.ac.ke, egerton.ac.ke
- Media: nation.africa (education), standardmedia.co.ke (education), the-star.co.ke, capitalfm.co.ke, universityworldnews.com (Africa)

For each, try the homepage `<link rel="alternate" type="application/rss+xml">`, `/feed/` and `/rss`. A source is kept if its feed returns items from the last 30 days that are relevant to higher education. Save one real response per kept feed as `__fixtures__/<slug>.xml`. Keep at most 2 scrape sources, and only for government bodies with no feed. Drop the rest. Record kept, dropped and why in the seed migration as SQL comments. Aim for 6 or more sources across all three categories.

- [ ] **Step 2: Write the failing tests**

`normalize-logic.test.ts`:
```ts
assert.equal(stripHtml('<p>KUCCPS&#8217;s <b>portal</b>&nbsp;opens</p>'), 'KUCCPS’s portal opens')
assert.equal(canonicalUrl('/news/a?utm_source=x&id=2#top', 'https://www.cue.or.ke'), 'https://www.cue.or.ke/news/a?id=2')
assert.equal(canonicalUrl('javascript:alert(1)', 'https://x.ke'), null)
assert.equal(titleKey('HELB: Loans, Now Open!'), titleKey('helb loans now open'))
assert.ok(clampSummary('word '.repeat(100)).length <= 280)
const now = new Date('2026-11-02T00:00:00Z')
assert.equal(normalizeItem({ title: 'T', link: '/a', published: '2027-01-01' }, 'https://x.ke', now)?.publishedAt, null)
assert.equal(normalizeItem({ title: 'T', link: '/a', published: 'not a date' }, 'https://x.ke', now)?.publishedAt, null)
assert.equal(normalizeItem({ link: '/a' }, 'https://x.ke', now), null)
```
`rss-logic.test.ts`: for each fixture, `parseFeed` returns at least one item with a title and link. Add inline RSS and Atom strings covering CDATA descriptions and Atom `rel="alternate"`. `parseFeed('<not xml')` returns `[]`.

- [ ] **Step 3: Run them and confirm they fail**

Run: `cd apps/nuru && node --import ../../scripts/ts-resolve.mjs lib/feed/normalize-logic.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement** the modules above, any kept scrape parsers (each tested against its saved HTML fixture), and the seed migration (`insert into sources (name, kind, url, homepage, category, parser) values …`).

- [ ] **Step 5: Run tests** (`npm test -w @mcloud/nuru`). Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat(nuru): feed sources, RSS/Atom parsing and normalisation"`

---

### Task 5: Ingestion, cron route, schedule and stale fallback

**Files:**
- Create: `apps/nuru/lib/feed/stale-logic.ts` (+ `.test.ts`), `lib/feed/lease.ts`, `lib/feed/ingest.ts`, `app/api/cron/feed/route.ts`, `.github/workflows/nuru-feed.yml`

**Interfaces:**
- `stale-logic.ts`: `isStale(lastFetchedAt: Date | null, now: Date, maxAgeMin = 30): boolean`. Null counts as stale.
- `lease.ts`: `withFeedLease<T>(fn: () => Promise<T>): Promise<T | 'busy'>`.
  - Acquire with `update locks set until = now() + interval '5 minutes' where name = 'feed' and until < now() returning name`. No row returned means `'busy'`.
  - Release in `finally` with `update locks set until = 'epoch' where name = 'feed'`.
- `ingest.ts`:
  - `type SourceResult = { source: string; ok: boolean; inserted: number; error?: string }`
  - `runIngest(): Promise<SourceResult[]>` fetches all active sources with `Promise.allSettled`. Each fetch uses `AbortSignal.timeout(10_000)` and `User-Agent: NuruBot/1.0 (+https://nuru.spiritb.uk)`. Each source records `last_fetched_at` plus either `last_ok_at` or `last_error`, with errors trimmed to 300 characters. It returns new item ids for Task 11.
  - Item insert:
    ```sql
    insert into feed_items (source_id, url, title, summary, published_at, title_key)
    select … where not exists (select 1 from feed_items where source_id = $1 and title_key = $6)
    on conflict (url) do nothing
    ```
  - `maybeRefreshFeed(): Promise<void>` reads `max(last_fetched_at)` from active sources. When `isStale`, it calls `after(() => withFeedLease(runIngest))`.
- `route.ts` (`// @route-kind: cron`): `POST` only, `maxDuration = 60`. It compares `authorization` to `Bearer ${process.env.CRON_SECRET}` with `timingSafeEqual` over equal-length buffers and returns 401 on mismatch. It runs `withFeedLease(runIngest)` and calls `revalidatePath('/')` when anything was inserted. Response: `{ busy: true }` or `{ results: SourceResult[] }`.
- `nuru-feed.yml`: `on: { schedule: [{ cron: '*/30 * * * *' }], workflow_dispatch: {} }`, one job running `curl -fsS -X POST -H "Authorization: Bearer ${{ secrets.NURU_CRON_SECRET }}" https://nuru.spiritb.uk/api/cron/feed`.

- [ ] **Step 1: Write the failing test** for `isStale`: null, 29 minutes (false) and 31 minutes (true).
- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Implement** the modules, route and workflow.
- [ ] **Step 4: Verify**

Run: `npm test -w @mcloud/nuru`. Expected: PASS, including route-kinds.

Against a Neon dev branch with both migrations applied, run `curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3002/api/cron/feed`. Expected: per-source results with `inserted > 0` on the first run and `0` on the second.

- [ ] **Step 5: Commit**

`git commit -m "feat(nuru): feed ingestion, cron route and 30-minute schedule"`

---

### Task 6: Feed page and `GET /api/feed`

**Files:**
- Create: `apps/nuru/lib/feed/queries.ts`, `lib/feed/feed-logic.ts` (+ `.test.ts`), `app/page.tsx`, `components/feed-list.tsx` (client), `app/api/feed/route.ts`

**Interfaces:**
- `queries.ts`:
  - `type FeedRow = { id: number; url: string; title: string; summary: string; at: string /* ISO, coalesce(published_at, fetched_at) */; source: string; category: Category; why: string | null }`
  - `listFeed(opts: { before?: Date; days?: number; limit?: number }): Promise<FeedRow[]>`. Only active sources. Ordered by `at desc, id desc`. With no `before`, it returns the last `days` (7). With `before`, it returns up to `limit` (50) items older than it.
- `feed-logic.ts`:
  - `formatFeedDate(iso: string): string` gives an absolute date like `2 Nov 2026`, in `Africa/Nairobi` time.
  - `parseBefore(v: string | null): Date | null` returns null when invalid.
- `app/page.tsx`: `export const revalidate = 600`. It calls `maybeRefreshFeed()` and renders `<FeedList initial={rows} />`. It never reads `cookies()`, `headers()` or `searchParams`, which would make it dynamic.
- `feed-list.tsx`:
  - Category chips (All, Government, Universities, Media) filter on the client.
  - Rows show the headline link, then source · date, then the summary with `line-clamp-2`. When `why` is set, a small labelled line reads "Nuru's analysis: …".
  - "Show older" fetches `/api/feed?before=<last at>`.
  - After the 5th row, an inline card reads "Connected to an institution? Join the waitlist" and links to `/waitlist?kind=institution`.
  - With no items, show "No news in the last 7 days yet."
- `GET /api/feed` (`// @route-kind: public — read-only public news feed`): `?before=` returns `{ items: FeedRow[], nextBefore: string | null }` with `Cache-Control: public, s-maxage=300`.

- [ ] **Step 1: Write the failing tests.** `formatFeedDate('2026-11-01T22:30:00Z') === '2 Nov 2026'`, because Nairobi is UTC+3. `parseBefore('x') === null`.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify**

Run: `npm test -w @mcloud/nuru && npx turbo run typecheck lint --filter=@mcloud/nuru`. Expected: PASS.

Load `/` in the browser. Check that chips filter, links open in a new tab, the card shows, and "Show older" appends rows.

- [ ] **Step 5: Commit**

`git commit -m "feat(nuru): public feed page and feed API"`

---

### Task 7: Waitlist

**Files:**
- Create: `apps/nuru/lib/waitlist/waitlist-logic.ts` (+ `.test.ts`), `app/api/waitlist/route.ts`, `app/waitlist/page.tsx`, `components/waitlist-form.tsx` (client)

**Interfaces:**
- `waitlist-logic.ts`:
  - `type WaitlistInput = { email: string; kind: 'uploads' | 'institution'; institutionName: string | null; note: string | null }`
  - `parseWaitlistInput(body: unknown): { ok: true; value: WaitlistInput } | { ok: false; error: string }`. Rules:
    - Email: trimmed and lowercased, `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, at most 254 characters.
    - `kind` must be one of the two values.
    - `institutionName` is required for `institution`, trimmed, at most 120 characters.
    - `note` is at most 500 characters.
    - Empty strings become null.
  - `hashIp(ip: string, salt: string): string` is a sha256 hex digest.
- Route (`// @route-kind: public — anyone may join the waitlist; rate limited by IP`):
  - Parse the body, then rate limit: `count(*) from waitlist where ip_hash = $1 and created_at > now() - interval '10 minutes'`. At 5 or more, return 429 "Too many attempts. Please wait a few minutes and try again."
  - The IP is the first entry of `x-forwarded-for`, hashed with `IP_HASH_SALT`. Attach `user_id` when `currentUser()` is set.
  - Insert with `on conflict (lower(email), kind) do nothing returning id`.
  - New row: `sendEmail({ from: SPIRITBULB_FROM, to, ...waitlistEmail({ productLabel: 'Nuru' }) })`, then return `{ ok: true }`.
  - Existing row: return `{ ok: true, already: true }`.
- Page: dynamic. It prefills the email from `currentUser()`, with a read-only field when signed in. It reads `searchParams.kind`, and the institution field shows only for `institution`. Success text: "You're on the list. We'll email you." When `already` is set: "You're already on the list."

- [ ] **Step 1: Write the failing tests**

```ts
assert.deepEqual(parseWaitlistInput({ email: ' A@B.CO ', kind: 'uploads' }), { ok: true, value: { email: 'a@b.co', kind: 'uploads', institutionName: null, note: null } })
assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'institution' }).ok, false)
assert.equal(parseWaitlistInput({ email: 'nope', kind: 'uploads' }).ok, false)
assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'admin' }).ok, false)
assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'uploads', note: 'x'.repeat(501) }).ok, false)
assert.equal(hashIp('1.2.3.4', 's'), hashIp('1.2.3.4', 's'))
```
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify**

Run: `npm test -w @mcloud/nuru`. Expected: PASS.

Manually, submitting the same email twice in different case gives "already on the list" and exactly one row.

- [ ] **Step 5: Commit**

`git commit -m "feat(nuru): waitlist page and API"`

---

### Task 8: Admin, B2 uploads and the files list

**Files:**
- Create:
  - Admin: `apps/nuru/app/admin/page.tsx`, `app/admin/actions.ts`
  - Upload logic and storage: `lib/files/upload-logic.ts` (+ `.test.ts`), `lib/files/b2.ts`, `lib/files/queries.ts`, `lib/files/files-scope.test.ts`
  - API routes: `app/api/files/upload-url/route.ts`, `app/api/files/route.ts`
  - Pages: `app/files/page.tsx`, `components/upload-button.tsx` (client)
- Dependencies: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

**Interfaces:**
- `admin/actions.ts` (`'use server'`):
  - `decideWaitlist(id: string, decision: 'approved' | 'declined'): Promise<void>` calls `requireAdmin()` first. It updates the row's status, `decided_at` and `decided_by`. When approving an `uploads` row, it runs `update users set can_upload = true where id = $user_id or lower(email) = lower($email)`. Finally it calls `revalidatePath('/admin')`.
- `admin/page.tsx`: not an admin means `notFound()`. It shows a pending waitlist table (email, kind, institution, note, date, Approve and Decline buttons) and a sources table (name, category, last OK, last error).
- `upload-logic.ts`:
  - `MAX_BYTES = 25 * 1024 * 1024`
  - `validateUploadRequest(body: unknown): { ok: true; value: { filename: string; bytes: number } } | { ok: false; error: string }` requires mime `application/pdf`, an integer `bytes` between 1 and `MAX_BYTES`, and a non-empty filename string.
  - `safeFilename(name: string): string`
  - `objectKey(ownerId: string, fileId: string, filename: string): string` returns `files/${ownerId}/${fileId}/${safeFilename(filename)}`.
  - `checkUploadedObject(o: { declared: number; actual: number | null; head: Uint8Array }): { ok: true } | { ok: false; error: string }`
- `b2.ts` (server-only; `S3Client` with `endpoint: B2_ENDPOINT`, `region: B2_REGION`, `forcePathStyle: true`):
  - `presignPut(key: string, bytes: number): Promise<string>`, valid 600 s, `ContentType: 'application/pdf'`
  - `presignGet(key: string): Promise<string>`, valid 300 s
  - `headBytes(key: string): Promise<number | null>`
  - `readRange(key: string, end: number): Promise<Uint8Array>`
  - `getBytes(key: string): Promise<Uint8Array>`
  - `deleteObject(key: string): Promise<void>`
- `queries.ts`: every export takes `ownerId: string` as its first parameter.
  - `type FileRow = { id; filename; bytes; pages; status; error; createdAt; b2Key }`
  - `createFile(ownerId, f: { id: string; b2Key: string; filename: string; bytes: number }): Promise<void>`
  - `getFile(ownerId, id): Promise<FileRow | null>`
  - `listFiles(ownerId): Promise<FileRow[]>`
  - `setStatus(ownerId, id, status, extra?: { pages?: number; error?: string | null }): Promise<void>`
  - `deleteFile(ownerId, id): Promise<void>`
  - Task 9 adds `savePages`, `getPages`, `saveOutputs` and `getOutputs`. Task 10 adds `countRecentAsks` and `recordAsk`.
- `POST /api/files/upload-url` (`// @route-kind: user`): `requireUser`, then 403 "Uploads are invite-only for now." unless `canUpload`. It validates the request, sets `id = crypto.randomUUID()`, calls `createFile`, and returns `{ id, uploadUrl }`.
- `GET /api/files` (`// @route-kind: user`): `{ files: FileRow[] }` without `b2Key`.
- `/files` page:
  - Signed out: redirect to `/auth/sign-in`.
  - List each file with filename, size, date and a status chip linking to `/files/[id]`.
  - Without `canUpload`, show "Uploads are invite-only for now. Join the waitlist." linking to `/waitlist?kind=uploads`.
  - `upload-button.tsx`: request the upload URL, `PUT` the file with `Content-Type: application/pdf`, `POST /api/files/[id]/complete` (Task 9), then `router.refresh()`. Show progress and errors. Reject non-PDF or oversize files on the client before uploading.

- [ ] **Step 1: Write the failing tests**

```ts
assert.equal(safeFilename('../../etc/x.pdf'), 'x.pdf')
assert.equal(safeFilename('résumé notes (1).PDF'), 'r-sum-notes-1-.pdf')  // non [A-Za-z0-9._-] → '-', runs collapsed, extension lowercased
assert.equal(safeFilename(''), 'document.pdf')
assert.match(objectKey('user_1', 'f', '../a.pdf'), /^files\/user_1\/f\/[A-Za-z0-9._-]+\.pdf$/)
assert.equal(validateUploadRequest({ filename: 'a.pdf', mime: 'image/png', bytes: 10 }).ok, false)
assert.equal(validateUploadRequest({ filename: 'a.pdf', mime: 'application/pdf', bytes: MAX_BYTES + 1 }).ok, false)
assert.equal(checkUploadedObject({ declared: 5, actual: 5, head: new TextEncoder().encode('%PDF-') }).ok, true)
assert.equal(checkUploadedObject({ declared: 5, actual: 6, head: new TextEncoder().encode('%PDF-') }).ok, false)
assert.equal(checkUploadedObject({ declared: 5, actual: 5, head: new TextEncoder().encode('<html') }).ok, false)
```
`files-scope.test.ts` reads `lib/files/queries.ts` as source. It asserts that every `export async function` has `ownerId: string` as its first parameter, and that every SQL template literal mentioning `files`, `file_pages`, `file_outputs` or `asks` also contains `owner_id`.

- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify** with `npm test -w @mcloud/nuru && npx turbo run typecheck lint --filter=@mcloud/nuru`. Expected: PASS.
- [ ] **Step 5: Commit**

`git commit -m "feat(nuru): admin approvals, B2 upload URLs and the files list"`

---

### Task 9: Upload completion, extraction and generation

**Files:**
- Create:
  - AI: `apps/nuru/lib/ai/extract.ts`, `lib/ai/schema.ts`, `lib/ai/generate-logic.ts` (+ `.test.ts`), `lib/ai/claude.ts`
  - Processing: `lib/files/process.ts`
  - API routes: `app/api/files/[id]/complete/route.ts`, `app/api/files/[id]/retry/route.ts`
- Modify: `lib/files/queries.ts` (add the page and output functions), `docs/CLEANUP.md` (add an item: "Delete mcloud's Nuru code (`apps/web/app/api/mobile/{notes,chat}`, `nuru_*` tables, storage bucket) once the new Nuru mobile app ships; ported to `apps/nuru/lib/ai/`.")
- Dependencies: `@anthropic-ai/sdk`, `unpdf`, `zod`

The text extraction is ported from `apps/web/app/api/mobile/notes/_ingest/extractPdfText.ts`. Copy its fixtures `hello.pdf` and `notext.pdf` into `lib/ai/__fixtures__/`.

The retry route isn't in the spec's API table. It backs the spec's "Try again".

**Interfaces:**
- `extract.ts`: `extractPages(bytes: Uint8Array): Promise<string[]>` uses `extractText(await getDocumentProxy(bytes), { mergePages: false })` and trims each page.
- `schema.ts`:
  - `StudyOutputSchema = z.object({ notes: z.array(z.object({ heading: z.string(), points: z.array(z.object({ text: z.string(), pages: z.array(z.number().int()) })) })), questions: z.array(z.object({ question: z.string(), answer: z.string(), pages: z.array(z.number().int()) })) })`
  - `type StudyOutput = z.infer<typeof StudyOutputSchema>`
- `generate-logic.ts`:
  - `MAX_DOC_CHARS = 600_000`
  - `hasText(pages: string[]): boolean`: at least 200 non-whitespace characters in total.
  - `buildDocumentText(pages: string[]): string | null` returns `<page n="1">…</page>` blocks, or null over `MAX_DOC_CHARS`. Never truncate.
  - `cleanOutputs(o: StudyOutput, pageCount: number): StudyOutput` keeps only page refs in `1..pageCount`, de-duplicated and sorted, and drops points and questions left with none, then headings left with no points.
  - `type FileError = 'no_text' | 'too_long' | 'generation_failed'`
  - `errorMessage(code: string | null): string`:
    - `no_text`: "This PDF has no selectable text (it may be a scan). You can still read it, but Nuru can't make notes from it yet."
    - `too_long`: "This file is too long for notes right now."
    - Anything else: "Nuru couldn't make notes for this file."
  - `canRetry(code: string | null): boolean` is true only for `generation_failed`.
- `claude.ts` (server-only):
  - `MODEL = 'claude-opus-5-5'`
  - `generateStudyOutput(docText: string): Promise<StudyOutput>` calls `client.beta.messages.parse` with `model: MODEL`, `max_tokens: 16000`, `betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'` and `output_config: { effort: 'medium', format: zodOutputFormat(StudyOutputSchema) }`. It throws when `stop_reason === 'refusal'` or `parsed_output` is null. The system prompt says: study notes and practice questions for a university student, drawn only from the document, citing the page numbers each point comes from, no predictions, no facts not in the document.
  - If `beta.messages.parse` rejects `fallbacks` at typecheck or at runtime, drop `fallbacks` and `betas`, and keep the refusal check.
- `queries.ts` additions:
  - `savePages(ownerId, fileId, pages: string[]): Promise<void>` runs one `insert … select … where exists (select 1 from files where id = $1 and owner_id = $2)`.
  - `getPages(ownerId, fileId): Promise<string[]>`
  - `saveOutputs(ownerId, fileId, o: StudyOutput, model: string): Promise<void>` replaces existing rows, writing one `notes` and one `questions` row.
  - `getOutputs(ownerId, fileId): Promise<{ notes: StudyOutput['notes'] | null; questions: StudyOutput['questions'] | null }>`
- `process.ts`:
  - `extractAndStore(ownerId, file: FileRow): Promise<'ok' | FileError>` downloads the object, calls `extractPages`, `savePages` and `setStatus(…, { pages })`. Without text, it sets `failed` with `no_text`.
  - `generateForFile(ownerId, fileId): Promise<void>` sets `processing`, calls `buildDocumentText`, which can fail with `too_long`, then `generateStudyOutput`, `cleanOutputs` and `saveOutputs`, and finally `ready`. Any throw is logged and becomes `failed` with `generation_failed`.
- `POST /api/files/[id]/complete` (`// @route-kind: user`), `maxDuration = 300`:
  - Owner check through `getFile(user.id, id)`, 404 otherwise. Must be in status `uploaded`.
  - `checkUploadedObject` with `headBytes` and `readRange(key, 4)`. On failure, `deleteObject` and `deleteFile`, then return 422 with the error.
  - Otherwise call `extractAndStore`. On `ok`, set `processing` and `after(() => generateForFile(...))`.
  - Return `{ status }`.
- `POST /api/files/[id]/retry` (`// @route-kind: user`), `maxDuration = 300`: owner only. It returns 409 unless the status is `failed` and `canRetry(error)`. Otherwise it sets `processing` and calls `generateForFile` in `after()`.

- [ ] **Step 1: Write the failing tests**

```ts
assert.equal(hasText(['', '  ', '\n']), false)
assert.equal(buildDocumentText(['x'.repeat(MAX_DOC_CHARS + 1)]), null)
assert.match(buildDocumentText(['a', 'b'])!, /<page n="2">b<\/page>/)
const o = { notes: [{ heading: 'H', points: [{ text: 'p', pages: [0, 2, 2, 9] }, { text: 'q', pages: [7] }] }], questions: [{ question: 'Q', answer: 'A', pages: [5] }] }
assert.deepEqual(cleanOutputs(o, 3), { notes: [{ heading: 'H', points: [{ text: 'p', pages: [2] }] }], questions: [] })
assert.equal(canRetry('no_text'), false); assert.equal(canRetry('generation_failed'), true)
```
Using the fixtures: `extractPages(hello.pdf)` returns a page containing its known text, and `hasText(await extractPages(notext.pdf)) === false`.

- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify**

Run: `npm test -w @mcloud/nuru && npx turbo run typecheck lint --filter=@mcloud/nuru`. Expected: PASS.

Manually, with a B2 dev bucket (CORS allowing `PUT` from `http://localhost:3002`), upload a text PDF: it reaches `ready` and has outputs. A scanned PDF ends `failed` with `no_text`.

- [ ] **Step 5: Commit**

`git commit -m "feat(nuru): validate uploads, extract pages and generate cited notes and questions"`

---

### Task 10: Viewer, ask about this page, and the file APIs

**Files:**
- Create:
  - API routes: `apps/nuru/app/api/files/[id]/route.ts`, `app/api/files/[id]/url/route.ts`, `app/api/files/[id]/ask/route.ts`
  - Ask logic and model call: `lib/ai/ask-logic.ts` (+ `.test.ts`); add `answerAboutPage` to `lib/ai/claude.ts`
  - Viewer UI: `app/files/[id]/page.tsx`, `components/pdf-viewer.tsx` (client), `components/study-panel.tsx` (client), `components/ask-dialog.tsx` (client)
- Modify: `lib/files/queries.ts` (add `countRecentAsks(ownerId): Promise<number>` for the last 24 h, and `recordAsk(ownerId, fileId, pageNo): Promise<void>`)
- Dependency: `pdfjs-dist ^5`

**Interfaces:**
- `ask-logic.ts`:
  - `ASK_LIMIT_PER_DAY = 50`
  - `parseAsk(body: unknown, pageCount: number): { ok: true; value: { page: number; question: string } } | { ok: false; error: string }` requires an integer page in `1..pageCount` and a trimmed question of 1 to 500 characters.
- `claude.ts`: `answerAboutPage(page: number, pageText: string, question: string): Promise<string>` uses `messages.create`, the same model, fallbacks and refusal check as Task 9, `max_tokens: 4000` and `effort: 'low'`. The prompt answers only from that page, says so when the page doesn't cover the question, and ends with `(p. N)`.
- `GET /api/files/[id]` (`// @route-kind: user`): `{ file: FileRow minus b2Key, notes, questions, errorMessage, canRetry }`.
- `GET /api/files/[id]/url` (`// @route-kind: user`): `{ url: await presignGet(file.b2Key) }`, with `Cache-Control: no-store`.
- `POST /api/files/[id]/ask` (`// @route-kind: user`): owner only, `ready` or `failed` with pages present. Then `parseAsk`, then 429 "You've reached today's question limit." when `countRecentAsks >= ASK_LIMIT_PER_DAY`. Then `getPages` and `answerAboutPage`, then `recordAsk`. Returns `{ answer, page }`.
- `pdf-viewer.tsx`:
  - Props: `{ url: string; page: number; onPageChange(n: number): void }`.
  - Uses `pdfjs-dist/web/pdf_viewer.mjs`: `PDFViewer`, `EventBus`, `PDFLinkService`, `PDFFindController`, with the text layer on.
  - Worker: `GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`. Import `pdfjs-dist/web/pdf_viewer.css`.
  - A search box at the top is the first tool. It dispatches `find` with `highlightAll: true` and has next/previous buttons (`findagain` with `findPrevious`) and a match count from `updatefindmatchcount`.
  - Searching inside the PDF uses pdf.js's own find. `file_pages.tsv` stays in place for later cross-file search.
- `study-panel.tsx`:
  - Tabs: Notes and Questions. Every page ref is a button that calls `onJump(n)`. Questions hide their answers behind "Show answer".
  - While processing, show "Nuru is reading your file…". The page polls `GET /api/files/[id]` every 4 s until the status leaves `uploaded` or `processing`.
  - On failure, show `errorMessage`, with a "Try again" button posting to `/retry` when `canRetry` is true.
- `app/files/[id]/page.tsx`:
  - Signed out: redirect to sign-in. A file the user doesn't own: `notFound()`.
  - The viewer renders regardless of status.
  - Floating buttons: Make notes (opens the panel on Notes), Questions (opens it on Questions), and Ask about this page (opens `ask-dialog` for the current page and shows one answer, not a thread).

- [ ] **Step 1: Write the failing tests** for `parseAsk`: page 0, page past the end, a fractional page, an empty question and a 501-character question are rejected, and `{ page: 2, question: ' why? ' }` with `pageCount` 3 gives `{ page: 2, question: 'why?' }`.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify**

Run: `npm test -w @mcloud/nuru && npx turbo run typecheck lint test && npx turbo run build --filter=@mcloud/nuru`. Expected: all PASS, and the build succeeds.

In the browser:
- Search highlights matches and next/previous moves between them.
- Page refs jump the viewer.
- Ask returns an answer ending in `(p. N)`.
- Another user's file id returns 404 from the page and every API route.

- [ ] **Step 5: Commit**

`git commit -m "feat(nuru): PDF viewer with search, notes panel and ask-about-this-page"`

---

### Task 11: "Why this matters" line (cut first if behind on Thu 5 Nov)

If this is cut, the column stays null and the UI from Task 6 already hides it. Nothing else changes.

**Files:**
- Create: `apps/nuru/lib/feed/why-logic.ts` (+ `.test.ts`)
- Modify: `lib/ai/claude.ts` (add `whyItMatters`), `lib/feed/ingest.ts` (after inserts, pass the run's new items to `whyItMatters`, at most 20 per run, and `update feed_items set why = $2 where id = $1`)

**Interfaces:**
- `claude.ts`: `whyItMatters(items: { id: number; title: string; summary: string; source: string }[]): Promise<{ id: number; why: string | null }[]>` makes one `messages.parse` call (schema `{ items: [{ id, why: string | null }] }`, effort `low`). The prompt: one plain sentence for a Kenyan university student on why this matters, using only the title and summary. No predictions and no speculation. Return null when the summary doesn't support a sentence.
- `why-logic.ts`: `cleanWhy(s: string | null): string | null` trims, returns null when empty or longer than 200 characters, and returns null when the text contains prediction markers (`/\b(will likely|is expected to|could soon|predict)/i`).

- [ ] **Step 1: Write the failing tests** for `cleanWhy`: an empty string, 201 characters, and "Fees will likely rise" all give null. A normal sentence passes through trimmed.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.** A `whyItMatters` failure is logged and must never fail the ingest run.
- [ ] **Step 4: Verify** with `npm test -w @mcloud/nuru`. Then trigger the cron locally: new items get a `why`, and the feed shows "Nuru's analysis".
- [ ] **Step 5: Commit**

`git commit -m "feat(nuru): optional why-this-matters line on new feed items"`

---

### Task 12: Final verification and launch checklist

- [ ] **Step 1: Run the full check**

Run: `npx turbo run typecheck lint test && npx turbo run build`
Expected: exit 0 everywhere. If the web or storefront build fails only for missing local env or fonts, record that and confirm the same failure on `main`.

- [ ] **Step 2: Confirm with the user before each outward-facing step.** These are the user's to do, or to approve one by one:
  1. Neon: create the project and run `migrations/20261102_init.sql`, then `20261102_seed_sources.sql`. Set your admin row with `update users set role = 'admin' where email = …` after your first sign-in.
  2. B2: create the private bucket and an application key scoped to it. Set CORS to allow `PUT` and `GET` from `https://nuru.spiritb.uk`.
  3. WorkOS: add the redirect URI `https://nuru.spiritb.uk/callback`.
  4. Vercel: create a new project with root `apps/nuru`, and set the env vars from `apps/nuru/ENV.md`. DNS: add a `nuru` CNAME on `spiritb.uk`.
  5. GitHub: add the Actions secret `NURU_CRON_SECRET` (equal to the app's `CRON_SECRET`), then trigger `nuru-feed` by hand once.
- [ ] **Step 3: Smoke test production.**
  - The feed loads and the disclaimer bar shows.
  - A waitlist join sends an email.
  - Sign in lands on `/files`.
  - After admin approval, an upload goes through to notes.
  - The Actions run log shows per-source results.
