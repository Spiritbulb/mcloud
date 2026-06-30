# Daily Subscription Reconcile (Pro revocation) — Design

**Date:** 2026-06-22
**Status:** Approved (design), pending implementation
**Scope:** Revoke `stores.is_pro` when a Google Play subscription is cancelled and
expires, via a daily Vercel Cron job that re-verifies each active subscription
against the Play API. Closes the gap left by purchase-time-only verification.

---

## 1. Problem

Pro is granted at purchase time (`/api/mobile/stores/[slug]/subscribe` →
`verifyPlaySubscription` → `is_pro = true`). Nothing reacts to state changes
*after* purchase, so when a user cancels on Google Play and the period ends,
`stores.is_pro` stays `true` and `store_subscriptions.status` stays `'active'`
forever — the store keeps Pro for free.

RTDN (real-time webhook) was considered and rejected for value-per-effort: it
needs Pub/Sub + a public OIDC-verified endpoint, and is lossy without a
reconciliation backstop anyway. A daily re-check is self-healing, needs no new
external services, and ~24h revocation latency is acceptable for a monthly B2B plan.

---

## 2. Approach

A daily Vercel Cron hits a protected API route that, for every active Google Play
subscription, re-verifies the purchase token against the Play API and sets
`is_pro` from the *current* truth.

```
Vercel Cron (daily 03:00 UTC)
  └─ GET /api/cron/reconcile-subscriptions   (Authorization: Bearer CRON_SECRET)
       rows = store_subscriptions WHERE provider='google_play' AND status='active'
       for each row:
         result = verifyPlaySubscription(row.google_play_purchase_token)   # existing
         if !result.ok: log + skip (transient → next run retries)
         else:
           stores.is_pro      = result.active                 WHERE id = row.store_id
           store_subscriptions.status     = result.active ? 'active' : 'expired'
           store_subscriptions.period_end = result.expiryTime  WHERE id = row.id
       return { checked, revoked, errors }
```

**Why re-verify (not act on a status field):** idempotent, order-independent,
self-healing. Canceled-but-still-active keeps Pro because the Play API still
reports `active` until period end; Pro drops only once Google reports it inactive.

---

## 3. Components

- **`vercel.json`** (new). **Location caveat:** this monorepo's Vercel project uses
  the **repo root** as Root Directory (see project memory: build via turbo filter,
  Root Dir empty). Vercel reads `vercel.json` from the Root Directory, so it goes at
  **repo root**. The cron `path` is the deployed route as served at the domain root
  (`/api/cron/reconcile-subscriptions`). If the first deploy shows the cron not
  registering, that's the monorepo path-resolution gotcha — verify against Vercel's
  Cron dashboard after deploy and adjust location/path then. One cron entry:
  ```json
  { "crons": [{ "path": "/api/cron/reconcile-subscriptions", "schedule": "0 3 * * *" }] }
  ```
- **`apps/web/app/api/cron/reconcile-subscriptions/route.ts`** (new, `GET`):
  - Auth: require `Authorization: Bearer ${process.env.CRON_SECRET}`; else 401.
  - Loop active google_play subs, re-verify, update store + subscription rows.
  - Returns a JSON summary `{ checked, revoked, errors }`.
  - `export const maxDuration = 60` (headroom for sequential Play calls at current
    scale).
- **Reused untouched:** `verifyPlaySubscription` (`apps/web/app/api/mobile/_google-play.ts`),
  the `google_play_purchase_token` column, the `active`/`expired` status vocabulary.

---

## 4. Configuration

- **New env (Vercel):** `CRON_SECRET` — random string; gates the endpoint. Vercel
  Cron is configured to send it as a bearer token.
- **Reused, already set:** `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` (re-verify),
  `GOOGLE_PLAY_PRO_SKU` (not strictly needed here — the row already holds the SKU —
  but `verifyPlaySubscription` is SKU-agnostic; reconcile reads `result.active`).

**Note:** `vercel.json` `crons` only run on Vercel production deployments; no local
scheduler. Manual test = curl the route with the bearer secret.

---

## 5. Error handling

| Case | Behavior |
|---|---|
| Missing/incorrect bearer secret | 401, no work done |
| `verifyPlaySubscription` transient failure for a row | log, skip that row, continue; next daily run reconciles it |
| Token not found on Play (deleted/refunded) | API returns non-active → `is_pro=false`, status `expired` |
| Cancelled but still in paid period | API still `active` → Pro retained until period end |
| No active subscriptions | loop is a no-op, returns `{ checked: 0, ... }` |

A single run being skipped (deploy, outage) only delays revocation; the next run
is fully reconciling. No event can be "lost" — state is recomputed each run.

---

## 6. Testing

- **Auth:** request without bearer → 401; with correct secret → 200.
- **Manual reconcile:** curl the endpoint against a known store; confirm a still-
  active sub stays `is_pro=true`, and (using a test account that has expired/
  cancelled past period end) a now-inactive sub flips to `is_pro=false`, status
  `expired`.
- **Idempotency:** run twice back-to-back → no change on the second run.
- **Transient resilience:** a row whose Play call errors is skipped, others still
  processed; summary reports `errors >= 1`.

---

## 7. Out of scope / future

- **Batching / pagination** for large subscription counts (sequential Play calls
  could approach `maxDuration`). Not needed at current scale; revisit if active
  subs grow into the hundreds.
- **RTDN** (real-time revocation) — deferred; daily latency is acceptable. If
  added later, this cron becomes its reconciliation backstop.

---

## 8. Manual checkpoints

- `CRON_SECRET` set in Vercel before the cron can authenticate.
- First commit and any deploy are the user's call.
