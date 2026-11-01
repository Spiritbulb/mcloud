# Nuru web MVP design

**Date:** 2026-11-01
**Status:** approved design, ready for implementation plan
**Source:** "Nuru MVP plan" (1 Nov 2026), settled in a planning session.
**Deadline:** web build live by ~7 Nov 2026.

## Goal

Ship `nuru.spiritb.uk`: a public live feed of Kenyan higher-education news, a waitlist, and a
signed-in PDF viewer with search, generated notes and questions. Nuru is its own product with
its own database; it shares only WorkOS identity and UI/mail packages with mcloud.

## Decisions

| Topic | Decision |
|---|---|
| Where the backend lives | New `apps/nuru` Next 16 App Router app in this monorepo: the web app **and** the JSON API the future mobile app calls. |
| Mobile apps | Both Expo apps (`apps/mobile`, `apps/nuru`) leave the monorepo and become standalone repos like `~/reach`. Nuru mobile is reworked later, modelled on Reach (`src/app`, `lib/api.ts`, `lib/auth.ts`), against `apps/nuru`'s API. |
| Domain | `nuru.spiritb.uk` now; the NuruDB domain later (add a WorkOS redirect URI and DNS). |
| Hosting | New Vercel project. |
| Scheduling | **No Vercel Cron.** GitHub Actions scheduled workflow every 30 min calls `POST /api/cron/feed` with `CRON_SECRET`; plus a stale check on feed page load (refresh in `after()` if the last fetch is older than 30 min). |
| Database | Neon Postgres via `@neondatabase/serverless`, server-side only. Hand-written SQL migrations in `apps/nuru/migrations/YYYYMMDD_name.sql`, applied manually. |
| Files | Backblaze B2 via its S3-compatible API, presigned PUT/GET. Neon holds object keys only. |
| Identity | Nuru user id = raw WorkOS user id (`user_…`), stored as plain text. No cross-database joins. |
| Existing Nuru data | Test data only. Start empty on Neon. No migration. |
| Feed scope | Kenyan higher education, national (not one school): Ministry of Education, KUCCPS, HELB, Commission for University Education, university news pages, education desks of major outlets. |
| Feed shape | Scannable item list, not articles. Summary is the source's own description, not LLM text. |
| Out of scope | Exam timetable feature (own spec after the MVP), trust statuses and history, feedback flags, institutions, notices, chains, rumour tracking, visible-silence audit, notifications, mobile rework. |

## Architecture

### `apps/nuru`

- Workspace package. Uses `@mcloud/ui`, `@mcloud/mail`, `@mcloud/auth`, `@mcloud/config`.
- Must **not** import `@mcloud/db`, `@mcloud/merchant`, or any Supabase package. A guard test
  (like `browser-db.test.ts`) scans `apps/nuru` and fails on those imports.
- All database access is server-side (route handlers, server components, server actions).
- New build-time env vars go in `turbo.json` `tasks.build.env`. Names only in
  `apps/nuru/ENV.md`.

### Auth

- `@mcloud/auth`'s legacy `auth0|` linking (`ensureLinked()` in `providers/workos.ts`) queries
  mcloud's Supabase with the service-role key. Split it out as an **opt-in hook**: web and
  storefront register it at startup and behave exactly as today; `apps/nuru` does not, so the
  package never touches Supabase there and `AuthUser.id` is the raw WorkOS id.
  - Do not remove the linking or change mcloud behaviour (see AGENTS.md "Identity").
- Web: AuthKit session cookie scoped to `nuru.spiritb.uk` (no `WORKOS_COOKIE_DOMAIN`), same
  WorkOS client as mcloud with an added redirect URI. WorkOS's hosted session gives
  already-signed-in users a silent pass.
- API: also accepts WorkOS bearer access tokens (JWKS verification, as `getMobileSession`).
- A `users` row is upserted on first authenticated request.

### Scheduling

- `.github/workflows/nuru-feed.yml`: `schedule: */30 * * * *` plus `workflow_dispatch`;
  `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://nuru.spiritb.uk/api/cron/feed`.
  The secret is a GitHub Actions secret.
- Fallback: feed page load checks the newest `sources.last_fetched_at`; if older than 30 min,
  run the fetch in `after()` (guarded so concurrent visits don't start parallel runs, e.g. a
  `pg_try_advisory_lock`).

### Background generation

- After an upload completes, extract pages, then generate notes and questions in `after()`.
  `files.status` tracks progress; the viewer polls it. No queue service in the MVP.
- LLM and PDF extraction code is **ported** (copied and trimmed) from
  `apps/web/app/api/mobile/{notes,chat}` into `apps/nuru/lib/ai/`, not shared: mcloud's copies
  are deleted once the new mobile app ships.

## Data model (Neon)

| Table | Columns | Notes |
|---|---|---|
| `users` | `id` text PK (WorkOS id), `email`, `name`, `role` (`user`/`admin`, default `user`), `can_upload` bool default false, `created_at` | Admins set by hand in SQL. |
| `waitlist` | `id`, `email`, `user_id` null, `kind` (`uploads`/`institution`), `institution_name` null, `note` null, `status` (`pending`/`approved`/`declined`), `created_at`, `decided_at`, `decided_by` | Unique (`lower(email)`, `kind`). Approving an `uploads` row sets `users.can_upload` for the matching user (by `user_id`, else email on next sign-in). |
| `sources` | `id`, `name`, `kind` (`rss`/`scrape`), `url`, `homepage`, `category` (`government`/`university`/`media`), `parser` null, `active`, `last_fetched_at`, `last_ok_at`, `last_error` | `parser` names a scrape parser implemented in code. |
| `feed_items` | `id`, `source_id`, `url` unique (canonical), `title`, `summary`, `published_at`, `fetched_at`, `title_key`, `why` null | No full text. `summary` is the feed description, HTML stripped, ≤ ~280 chars. `title_key` dedupes the same story under different URLs within a source. `why` is the optional "why this matters" line, labelled "Nuru's analysis"; first to cut. |
| `files` | `id`, `owner_id`, `b2_key`, `filename`, `mime`, `bytes`, `pages` null, `status` (`uploaded`/`processing`/`ready`/`failed`), `error` null, `created_at` | Key: `files/<owner_id>/<file_id>/<filename>`. |
| `file_pages` | `file_id`, `page_no`, `text`, `tsv` generated `tsvector` | PK (`file_id`, `page_no`). GIN index on `tsv`. |
| `file_outputs` | `id`, `file_id`, `kind` (`notes`/`questions`), `content` jsonb, `model`, `created_at` | Each entry in `content` cites page numbers. |

## Pages

Public:

- **`/`**: the feed. Last 7 days, newest first, "older" paging, category chips. Each row:
  headline linking out (`rel="noopener"`), source name, absolute date, summary clamped to two
  lines. A persistent "Nuru is AI and can make mistakes" bar. Inline card: "Connected to an
  institution? Join the waitlist" → `/waitlist?kind=institution`. ISR, `revalidate = 600`.
- **`/waitlist`**: email, kind, institution name, note. Prefilled when signed in. Rate limited
  by counting recent rows (as `apps/web/app/api/partner/waitlist`). Confirmation email via
  `@mcloud/mail`.

Signed in:

- **`/files`**: list with status. Without `can_upload`, the upload control is replaced by
  "Uploads are invite-only for now. Join the waitlist."
- **`/files/[id]`**: pdf.js viewer with text layer; search with highlight and next/previous is
  the first tool. Side panel with notes and questions, page links jump the viewer. Floating
  buttons: Make notes, Questions, Ask about this page (one scoped answer citing the page, not a
  chat thread).
- **`/admin`** (`role = admin`): approve/decline waitlist entries; source health (last OK, last
  error).

## API

Every `app/api/**/route.ts` starts with `// @route-kind: <kind>`; extend
`scripts/route-kinds.mjs` (and its test) to cover `apps/nuru`.

| Route | Kind | Rule |
|---|---|---|
| `GET /api/feed` | public | Paged items, for mobile later. |
| `POST /api/waitlist` | public | Validated, rate limited. |
| `POST /api/files/upload-url` | session/bearer | Requires `can_upload`. PDF only, ≤ 25 MB. Creates the `files` row and returns a presigned PUT. |
| `POST /api/files/[id]/complete` | session/bearer | Owner only. HEAD the object: size matches and ≤ 25 MB; first bytes are `%PDF`. Extract pages, set `processing`, generate in `after()`. |
| `GET /api/files` | session/bearer | Caller's files only. |
| `GET /api/files/[id]` | session/bearer | Owner only; includes outputs. |
| `GET /api/files/[id]/url` | session/bearer | Owner only; short-lived presigned GET. |
| `POST /api/files/[id]/ask` | session/bearer | Owner only. `{ page, question }`, answer cites the page. |
| `POST /api/cron/feed` | cron | `Authorization: Bearer $CRON_SECRET`. |

Admin writes are server actions that re-check `role = admin` on every call. A file id alone
never grants access: every file query is scoped by `owner_id`.

## Feed ingestion

1. Load active sources. Fetch each independently with a 10 s timeout.
2. Parse: RSS/Atom for `rss` sources; named parser for `scrape` sources.
3. Normalise (pure, tested): strip HTML, decode entities, trim summary, canonicalise URL
   (drop `utm_*`, fragments), compute `title_key`.
4. Upsert on `url`; skip if the same `title_key` already exists for that source.
5. Record `last_fetched_at`, and `last_ok_at` or `last_error` per source.

Source list is decided in implementation step 1 by checking each candidate for usable RSS;
those without one get a scrape parser or are dropped for the MVP.

## Error handling

- One failing source never stops the run; its error is stored and shown in `/admin`.
- Generation failure sets `status = failed` with `error`; the viewer offers "Try again".
- Upload completion that fails validation deletes the B2 object and the row.
- Cron route returns a per-source summary so the Actions log shows what happened.

## Testing

`node:test` files beside `*-logic.ts` modules, run by `scripts/run-tests.mjs`:

- Feed normalisation and dedupe.
- Each parser against saved fixtures (no network in tests).
- Waitlist validation.
- Access rules: owner scoping, `can_upload`, admin.
- Upload validation (size, mime, magic bytes).
- Guard: no Supabase or `@mcloud/db` imports in `apps/nuru`.
- `@mcloud/auth`: linking hook runs when registered and is skipped when not.

Before done: `npx turbo run typecheck lint test` and `npx turbo run build`.

## Order of work

0. Move `apps/mobile` and `apps/nuru` (Expo) out of the monorepo into standalone repos; update
   AGENTS.md, docs and `android-build.yml`.
1. Check candidate RSS sources; save fixtures.
2. `@mcloud/auth` linking hook.
3. Scaffold `apps/nuru`: Next app, Neon client, migrations, auth, `users` upsert.
4. Feed: ingestion, cron route, GitHub workflow, stale fallback, `/` page.
5. Waitlist and `/admin`.
6. Files: B2 upload, extraction, generation, viewer.

If the build slips by Thursday 5 Nov: drop `why`, ship the plain feed, protect study time.

## Later

- Delete mcloud's Nuru code (`apps/web/app/api/mobile/{notes,chat}`, `nuru_*` tables, storage
  bucket) once the new mobile app ships. Track in `docs/CLEANUP.md`.
- Exam timetable feature: own spec.
- Trust statuses, feedback flags, institutions, notices, chains, visible silence: per the plan,
  after 25 Nov.
