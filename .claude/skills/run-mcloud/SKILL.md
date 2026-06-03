---
name: run-mcloud
description: Build, run, and drive mcloud (Menengai Cloud). Use when asked to start mcloud, run it, take a screenshot of its UI, test a page, check if a change renders, or interact with the running app.
---

mcloud is a Next.js multi-tenant SaaS platform (Menengai Cloud) — a managed e-commerce / storefront builder for Kenyan businesses. Drive it via `node .claude/skills/run-mcloud/driver.mjs` against the dev server, or via raw Playwright scripts importing from `node_modules/playwright`.

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

Env vars are in `.env.local` (committed, includes Auth0, Supabase, Paystack keys). No extra setup needed for local dev.

## Run (agent path)

Start the dev server, then run the driver:

```bash
# Terminal 1 — start server (blocks; run in background or separate shell)
npm run dev -- --port 3000

# Wait for server to be ready
timeout 30 bash -c 'until curl -sf http://localhost:3000/api/health >/dev/null; do sleep 1; done'
# Or on PowerShell:
# while (-not (Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing -ErrorAction SilentlyContinue)) { Start-Sleep 1 }

# Terminal 2 — use the driver
node .claude/skills/run-mcloud/driver.mjs smoke
node .claude/skills/run-mcloud/driver.mjs screenshot /
node .claude/skills/run-mcloud/driver.mjs screenshot /docs
node .claude/skills/run-mcloud/driver.mjs nav /changelog
```

Driver commands:

| command | what it does |
|---|---|
| `smoke` | Screenshots all key public routes, checks `/api/health` |
| `screenshot <path> [out.png]` | Navigate and screenshot one page |
| `nav <path>` | Print final URL + title (follows redirects) |

Screenshots land in `/tmp/mcloud-shots/` (Windows: `C:\Users\<you>\AppData\Local\Temp\mcloud-shots\`).

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

**Auth-gated pages** (`/org/...`, `/settings`, `/onboarding`) redirect to Auth0 at `auth.menengai.cloud` — you cannot screenshot these without a real session cookie. Use the public pages (`/`, `/docs`, `/changelog`, `/support`, `/store/<slug>`) for UI verification.

**Health check** (no browser needed):

```bash
curl http://localhost:3000/api/health
# → {"status":"ok"}
```

## Run (human path)

```bash
npm run dev
# → http://localhost:3000  (Ctrl-C to stop)
```

## Gotchas

- **Git Bash path conversion on Windows** — `/support` becomes `C:/Program Files/Git/support` when passed as a CLI arg. The driver auto-corrects this. On PowerShell there's no conversion. Use `MSYS_NO_PATHCONV=1` in Git Bash to disable conversion globally.
- **`/changelog` renders blank on first load** — it's a React client component that takes ~1.5s to hydrate. `waitForTimeout(1500)` in the driver covers this. Raw `waitForLoadState('networkidle')` alone is insufficient because Next.js fires `networkidle` before client hydration completes.
- **`/auth/login` always redirects to `auth.menengai.cloud`** — this is expected. The Auth0 tenant is external; there's no local login form. `nav /auth/login` reports the redirect target as confirmation the auth flow is wired.
- **`/onboarding` and merchant routes are blank without auth** — these require a valid Auth0 session cookie. The middleware at `middleware.ts` blocks unauthenticated access and redirects to Auth0.
- **`npm run dev` uses `--webpack` flag** — Turbopack is configured in `next.config.ts` but the dev script explicitly uses webpack. Both modes work; the dev script is the reliable path.
- **Supabase calls fail in dev if `NEXT_PUBLIC_SUPABASE_URL` is wrong** — the `.env.local` has a live Supabase project URL. If calls return empty data, check network connectivity to `cuptlifacdkeagrrofni.supabase.co`.

## Troubleshooting

- **`Cannot find module 'playwright'`**: Run `npm install` from the project root, then `npx playwright install chromium`.
- **`EADDRINUSE :3000`**: Another dev server is running. Kill it with `pkill -f "next dev"` (Linux/Mac) or find and stop the process holding port 3000.
- **Driver screenshots are blank white**: The page may need more hydration time. Increase `waitForTimeout` from 1500 to 3000 in the driver script.
- **`Missing required environment variable: APP_BASE_URL`**: `.env.local` is missing. It should be at the project root and committed in this repo.
