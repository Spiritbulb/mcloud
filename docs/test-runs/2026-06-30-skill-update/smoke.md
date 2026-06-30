# Test run — run-mcloud skill update smoke

Date: 2026-06-30
Purpose: Verify the corrected run-mcloud skill (monorepo turbo command + Turbopack +
WorkOS in-app login) and the `nav` path-conversion fix actually work.

## Setup
```
npx turbo run dev --filter=@mcloud/web -- --port 3000   # Next 16 Turbopack, ready ~1.1s
```

## Command
```
SHOT_DIR=docs/test-runs/2026-06-30-skill-update/shots \
  node .claude/skills/run-mcloud/driver.mjs smoke
```

## Result — PASS

| route | status |
|---|---|
| `/` | ✓ |
| `/docs` | ✓ |
| `/changelog` | ✓ |
| `/support` | ✓ |
| `/auth/login` | ✓ (200, in-app WorkOS form — stays on localhost, no external redirect) |
| `/api/health` | ✓ `{"status":"ok"}` |

Also verified `nav /auth/login` no longer crashes on Git Bash (driver `nav` now applies the
same `/Program Files/Git` path correction as `screenshot`).

Screenshots: `./shots/`
