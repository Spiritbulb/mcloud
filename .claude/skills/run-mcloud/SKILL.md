---
name: run-mcloud
description: Build, run, and drive mcloud (Menengai Cloud). Use when asked to start mcloud, run it, take a screenshot of its UI, test a page, check if a change renders, or interact with the running app.
---

mcloud is a Next.js (v16, Turbopack) multi-tenant SaaS platform (Menengai Cloud) — a
managed e-commerce / storefront builder for Kenyan businesses. As of the Turborepo split it
is an **npm-workspaces monorepo**: the merchant/admin app is `apps/web` (`@mcloud/web`), the
customer storefront is `apps/storefront`, shared code lives in `packages/*`. Drive the
running app via `node .claude/skills/run-mcloud/driver.mjs`, or via raw Playwright importing
from `node_modules/playwright`.

## Prerequisites

Node 20+ and npm already in this repo. No additional OS packages needed on Windows.

Playwright browser binaries must be installed once:

```bash
npx playwright install chromium
```

## Setup

```bash
npm install
```

Env vars are in `.env.local` (committed; Supabase, WorkOS, Paystack/M-Pesa keys). No extra
setup needed for local dev.

## Run (agent path)

This is a Turborepo monorepo, so `npm run dev` at the root runs **every** app's dev server.
To run just the web app on a fixed port, filter to it and pass `--port` AFTER `--` (the `--`
is required — turbo rejects `--port` as its own flag, which is the #1 way this breaks):

```bash
# Terminal 1 — start the web app (blocks; run in background or separate shell)
npx turbo run dev --filter=@mcloud/web -- --port 3000
# Equivalent: (cd apps/web && npm run dev -- --port 3000)

# Wait for ready (Git Bash poll loop — avoids fixed sleeps):
for i in $(seq 1 50); do curl -sf http://localhost:3000/api/health >/dev/null 2>&1 && { echo ready; break; }; sleep 1; done
# PowerShell:
# while (-not (try { Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing -ErrorAction Stop } catch { $null })) { Start-Sleep 1 }

# Terminal 2 — use the driver
node .claude/skills/run-mcloud/driver.mjs smoke
node .claude/skills/run-mcloud/driver.mjs screenshot /
node .claude/skills/run-mcloud/driver.mjs screenshot /docs
node .claude/skills/run-mcloud/driver.mjs nav /auth/login
```

The storefront app is `--filter=@mcloud/storefront` (run it on a different port, e.g. 3001).

Driver commands:

| command | what it does |
|---|---|
| `smoke` | Screenshots all key public routes, checks `/api/health` |
| `screenshot <path> [out.png]` | Navigate and screenshot one page |
| `nav <path>` | Print final URL + title (follows redirects) |

Screenshots land in `$SHOT_DIR` (default `/tmp/mcloud-shots/`; on Windows that's
`C:\Users\<you>\AppData\Local\Temp\mcloud-shots\`). Override with `SHOT_DIR=...` — useful for
keeping a run's shots alongside its logged results (see "Logging test runs" below).

**Inline Playwright script** — for custom flows, import directly:

```js
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/package.json');
const { chromium } = require('playwright');

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:3000');
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/shot.png' });
await browser.close();
```

**Auth:** login is **in-app WorkOS Magic Auth** (email → magic code → cookie), NOT an
external redirect. `/auth/login` returns 200 and renders a local form — `nav /auth/login`
stays on `localhost:3000`. `/auth/logout` is the WorkOS sign-out route. (The old Auth0 /
`auth.menengai.cloud` redirect is gone.)

**Auth-gated pages** (`/admin`, `/org/...`, `/onboarding`) need a real WorkOS session cookie
— you can't screenshot them headless without one; they redirect to `/auth/login`. Use the
public pages (`/`, `/docs`, `/changelog`, `/support`, and storefront `/store/<slug>`) for UI
verification, or do the magic-code login flow manually first.

**Health check** (no browser needed):

```bash
curl http://localhost:3000/api/health   # → {"status":"ok"}
```

## Logging test runs (manual-verification docs)

Capture each meaningful manual test as a dated note so results accumulate and the process
can be improved over time. Write to `docs/test-runs/YYYY-MM-DD-<topic>.md` with: what was
tested, the command(s), pass/fail per route, and the screenshot dir used. Point `SHOT_DIR`
at a per-run folder so shots travel with the note, e.g.:

```bash
SHOT_DIR=docs/test-runs/2026-06-30-anon-cleanup/shots \
  node .claude/skills/run-mcloud/driver.mjs smoke | tee docs/test-runs/2026-06-30-anon-cleanup/smoke.log
```

(`docs/` is tracked in git as of 2026-06-30.) This is a lightweight convention, not a rigid
schema — refine it as we learn what's useful.

## Run (human path)

```bash
(cd apps/web && npm run dev)   # → http://localhost:3000  (Ctrl-C to stop)
```

## Gotchas

- **`--port` must come after `--`** — `npm run dev -- --port 3000` at the repo root passes
  `--port` to *turbo*, which errors with "unexpected argument '--port'". Use the
  `--filter=@mcloud/web -- --port 3000` form, or run from inside `apps/web`.
- **Dev uses Turbopack** — the web `dev` script is `next dev --turbopack`. (Build uses plain
  `next build`.) This is Next.js 16.
- **Git Bash path conversion on Windows** — `/support` becomes
  `C:/Program Files/Git/support` when passed as a CLI arg. The driver auto-corrects this for
  both `screenshot` and `nav`. To disable globally in Git Bash, prefix with `MSYS_NO_PATHCONV=1`.
  PowerShell does not do this conversion.
- **`/changelog` renders blank on first load** — client component, ~1.5s to hydrate. The
  driver's `waitForTimeout(1500)` covers it; `networkidle` alone is insufficient (Next fires
  it before hydration completes).
- **Benign hydration console warnings** — pages may log a React "hydration mismatch" warning
  (often a browser-extension `caret-color` tweak). The smoke test flags these with ⚠ but they
  are not failures.
- **Supabase calls need connectivity** — `.env.local` points at a live Supabase project
  (`cuptlifacdkeagrrofni.supabase.co`). Empty data in dev usually means a network issue.

## Troubleshooting

- **`unexpected argument '--port' found`**: you ran the root `npm run dev -- --port`; see the
  first gotcha — put `--port` after `--` on a `turbo --filter` command.
- **`Cannot find module 'playwright'`**: `npm install` from the repo root, then
  `npx playwright install chromium`.
- **`EADDRINUSE :3000`**: another dev server holds the port. Find and stop it
  (`pkill -f "next dev"` on Linux/Mac; on Windows find the PID on the port and stop it).
- **Driver screenshots are blank white**: increase `waitForTimeout` from 1500 to 3000.
- **`Cannot navigate to invalid URL ...Program Files/Git...`**: an old driver without the
  `nav` path fix, or a path arg the auto-correct missed — pass `MSYS_NO_PATHCONV=1`.
