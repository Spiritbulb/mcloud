# Nuru

`apps/nuru` is the Nuru web app and API at `nuru.spiritb.uk` (dev port 3002). It is a study
tool for Kenyan university students: a news feed, and PDF uploads that Claude turns into
page-cited notes and practice questions, with a viewer that answers questions about one page.

It is **isolated from the rest of the monorepo**. Its own Neon Postgres database, its own B2
bucket, its own session on its own host. The only thing it shares with mcloud is WorkOS
identity, through `@mcloud/auth/standalone` (no legacy `auth0|` linking). `isolation.test.ts`
pins this. Do not point it at Supabase and do not set `WORKOS_COOKIE_DOMAIN`.

## Where things live

| Concern | Lives in |
|---|---|
| Session and the signed-in user | `lib/session.ts` (`currentUser()` for pages, `requireUser()` for routes: cookie or bearer token) |
| Database | `lib/db.ts` (Neon serverless). Migrations in `migrations/`, applied by hand in filename order. |
| Feed (RSS/HTML sources, normalising, "why this matters" lines) | `lib/feed/*`, served by `app/api/feed`, refreshed by `app/api/cron/feed` |
| Files (upload to B2, extraction, notes and questions, ask-about-this-page) | `lib/files/*`, `lib/ai/*`, `app/api/files/*` |
| Waitlist (uploads access; approval sets `users.can_upload`) | `lib/waitlist/*`, `app/api/waitlist` |
| Admin | `app/admin` |

Logic is in `*-logic.ts` files with sibling tests, as elsewhere in the repo.

## Behaviour worth knowing

- **Model:** `MODEL` in `lib/ai/claude.ts` (Haiku 5.5). Haiku 5.5 does not support the
  server-side fallback params; don't add them.
- **Uploads:** the browser PUTs to B2 with a presigned URL (`api/files/upload-url`), then calls
  `api/files/[id]/complete`. Only users with `can_upload` may upload. Stuck files are recovered
  by `retry`; never delete an upload that may still be in progress.
- **Generation** must fit two attempts inside the route's `maxDuration`.
- **Feed refresh** is driven by `.github/workflows/nuru-feed.yml` (every 30 minutes, `POST` with
  `CRON_SECRET`), not Vercel cron. It holds a lease (`lib/feed/lease.ts`) so overlapping runs
  don't double-ingest, and nothing refreshes at build time.
- **Database down:** routes return 503 rather than throwing (`dbUnavailableOrThrow`).
- **Route kinds:** `app/api/_route-kinds.test.ts` enforces them; Nuru adds the `user` kind
  (see [api.md](api.md)).

## Setup

Env var names, the B2 CORS rules and the WorkOS sign-out redirects are in
[`apps/nuru/ENV.md`](../apps/nuru/ENV.md). Anything read at build time must also be in the root
`turbo.json` `tasks.build.env`.

## What this replaced

Nuru used to be `apps/web` `/api/mobile/{notes,chat}` plus `nuru_*` tables in Supabase, used by
`~/nuru-mobile`. That code still exists until the new mobile app ships; see
[CLEANUP.md](CLEANUP.md) (Nuru).
