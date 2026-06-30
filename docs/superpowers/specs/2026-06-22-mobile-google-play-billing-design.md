# Mobile Google Play Billing — Design

**Date:** 2026-06-22
**Status:** Approved (design), pending implementation
**Scope:** Wire Pro subscriptions for stores through Google Play Billing in the Expo
mobile app, with backend purchase-token verification against the Google Play
Developer API. Google Play becomes the sole Pro billing provider.

---

## 1. Goal & context

The web app no longer sells Pro (the upgrade flow was removed; web points merchants
to the mobile app + `/beta`). This work makes the mobile app the place merchants
actually subscribe, using Google Play Billing for real money, verified server-side.

Pro entitlement is **per-store**: `stores.is_pro`. A purchase token is bound to one
`store_id` in our DB. One Google account may buy Pro for multiple stores as separate
Play purchases (distinct tokens); that is acceptable.

**Android package name:** `cloud.menengai.twa`.

### Out of scope (deferred fast-follow)
- **Real-Time Developer Notifications (RTDN)** for renewals/cancellations/expiry via
  Pub/Sub. This pass verifies at purchase time only. Renewal/cancel state will drift
  until RTDN (or a periodic re-check) is added. Documented as a known limitation.
- iOS / App Store billing.
- Mobile-side Pro feature gating parity with web (this pass only flips the badge and
  unlocks anything already keyed off `is_pro`).

---

## 2. Architecture & data flow

```
Mobile app (expo-iap)                Web backend (/api/mobile)         Google
─────────────────────                ─────────────────────────         ──────
1. User taps "Get Pro" on a store
2. requestSubscription(SKU)        ─────────────────────────────────▶  Play purchase sheet
3. Play returns { purchaseToken, productId, orderId }
4. POST /api/mobile/stores/[slug]/subscribe
   { purchaseToken, productId }    ─▶ 5. verify token via Play
                                        Developer API (service acct) ─▶ subscriptionsv2.get
                                     6. if ACTIVE & SKU matches & token
                                        not bound to another store:
                                        - upsert store_subscriptions
                                          (provider='google_play')
                                        - set stores.is_pro = true
                                     7. return { ok, pro: true, expiresAt }
8. finishTransaction(ack)          ─────────────────────────────────▶  acknowledge purchase
```

**Acknowledgement rule (critical):** a Play purchase must be acknowledged within 3
days or Google auto-refunds it. Acknowledgement (step 8) happens **only after** the
backend confirms the grant. If the backend fails verification, the client does NOT
acknowledge — the purchase auto-refunds, and the user is not charged for a failed grant.

---

## 3. Data model & migration

`store_subscriptions` becomes Google-Play-only. Paystack/IntaSend columns are unused
(no live data) and are dropped.

### Migration (prod — gated, see safety check)
**Safety check first:** `SELECT count(*) FROM store_subscriptions WHERE
paystack_reference IS NOT NULL;` — abort the whole migration if this is non-zero
(would mean live Paystack data exists).

- **Drop** columns: `paystack_reference`, `paystack_subscription_code`,
  `paystack_email_token`, `paystack_customer_code`, `paystack_paid_at`.
- **Add** columns:
  - `google_play_purchase_token text`
  - `google_play_order_id text`
  - `google_play_product_id text`
- **Add** unique index on `google_play_purchase_token` (idempotent upsert key; prevents
  double-grant from the same purchase).
- **Keep**: `id`, `store_id`, `status`, `plan`, `amount`, `currency`, `provider`
  (now always `'google_play'`), `period_start`, `period_end`, `created_at`.

### Status vocabulary
Standardize on: `active` | `cancelled` | `expired` | `pending`. Retire the old
Paystack `complete`/`pending` vocabulary.

### Code consequences (same pass — build breaks otherwise)
- **Delete** `apps/web/app/api/webhooks/paystack/route.ts` (reads `paystack_*`, obsolete).
- **Delete** `apps/web/app/api/webhooks/intasend/route.ts` (old IntaSend upgrade path, obsolete).
- **Update** admin subs pages (`apps/web/app/admin/page.tsx`,
  `apps/web/app/admin/subs/page.tsx`): switch any `paystack_*` display to Play fields
  or to provider/status.
- **Keep** `apps/web/app/api/admin/subscriptions/activate/route.ts` — provider-agnostic
  manual override (admin grants Pro); unaffected.
- **Regenerate** `packages/db/src/database.types.ts` after the migration.

**Not touched:** storefront customer checkout (Paystack/M-Pesa at the cart) is a
separate system from Pro subscription billing and is unaffected.

---

## 4. Backend: Play verification endpoint

Rework `POST /api/mobile/stores/[slug]/subscribe` from "Paystack init → return URL"
to "verify Play token → grant Pro".

**Request:** `{ purchaseToken: string, productId: string }` — bearer-authed via
`requireMobileUser`.

**Flow:**
1. Auth; load store by slug; assert caller is `owner`/`admin` of that store
   (existing `store_members` membership check).
2. Verify with Google: `GET androidpublisher/v3/applications/cloud.menengai.twa/
   purchases/subscriptionsv2/tokens/{purchaseToken}` using a service-account JWT.
   Require:
   - `subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE'` (grace period also accepted),
   - the line item's `productId` equals `GOOGLE_PLAY_PRO_SKU`,
   - the token is not already bound to a **different** `store_id` in our DB.
3. Grant: upsert `store_subscriptions` (provider `google_play`, the three
   `google_play_*` fields, `status='active'`, `period_end` from the API `expiryTime`),
   set `stores.is_pro = true`. Upsert keyed on `google_play_purchase_token`
   (idempotent — safe to call twice; covers retry of an interrupted acknowledgement).
4. Return `{ ok: true, pro: true, expiresAt }`. On verification failure return a 4xx
   with a clear error and **do not** grant.

**New shared module** `apps/web/app/api/mobile/_google-play.ts` — wraps the
service-account auth + the `subscriptionsv2` verify call. Keeps the route thin and the
Google plumbing isolated/testable.

### Credentials (reused, no new secrets)
Reuse the existing service-account key already used for beta-group management:
- `GOOGLE_SA_EMAIL` — service account `client_email`.
- `GOOGLE_SA_PRIVATE_KEY` — service account private key (PEM; `\n`-escaped handled).

**Difference from the Directory API usage** (`apps/web/lib/google-group.ts`):
- Scope is `https://www.googleapis.com/auth/androidpublisher` (not directory).
- **No `sub` impersonation** — Play auth is the SA acting as itself (domain-wide
  delegation is Directory-only).

New env var:
- `GOOGLE_PLAY_PRO_SKU` — the Pro subscription product id from Play Console.

**Shared JWT helper:** extract the base64url + RS256 self-signed-JWT → access-token
logic (currently inline in `google-group.ts`) into a small shared helper
(`apps/web/lib/google-jwt.ts`), parameterized by scope and optional `subject`. Both
`google-group.ts` and `_google-play.ts` consume it. In-scope cleanup (second consumer
of the same pattern), no behavior change for the existing group flow.

### One-time external setup (user — cannot be automated here)
- Add `GOOGLE_SA_EMAIL` to **Play Console → Users & permissions** with "View financial
  data, orders, and cancellation survey responses" / manage orders & subscriptions on
  the `cloud.menengai.twa` app.
- Enable the **Google Play Android Developer API** in the SA's Google Cloud project.
- Create the **Pro subscription product** in Play Console; set its id as
  `GOOGLE_PLAY_PRO_SKU` (backend) and `EXPO_PUBLIC_PLAY_PRO_SKU` (mobile).

---

## 5. Mobile client (expo-iap)

**Dependency & config:** add `expo-iap` + its config plugin to `apps/mobile/app.json`.
Native module → requires a new EAS dev/preview build (won't run in Expo Go).

**New module** `apps/mobile/src/lib/iap.ts` — wraps expo-iap so screens don't touch the
SDK directly:
- `useIap()` hook: initializes the connection; exposes `proProduct` (fetched by
  `EXPO_PUBLIC_PLAY_PRO_SKU`), `purchasePro(storeSlug)`, and `loading`/`error` state.
- `purchasePro(storeSlug)`:
  1. `requestSubscription(sku)`.
  2. On the purchase-updated **event**, read `{ purchaseToken, productId }`.
  3. Call `api.subscribePro(slug, { purchaseToken, productId })`.
  4. On backend `{ pro: true }`, `finishTransaction(purchase, /*isConsumable*/ false)`
     to acknowledge; then resolve.
  5. On backend failure: do NOT acknowledge; surface error (Play auto-refunds in 3 days).
- Bridges expo-iap's listener/event model into an awaitable promise the screen uses.

**API client:** add `subscribePro(slug, { purchaseToken, productId })` to
`apps/mobile/src/lib/api.ts` → `POST /api/mobile/stores/[slug]/subscribe`.

**Edge cases:**
- User cancels Play sheet → no-op, clear loading.
- Already-owned / unacknowledged purchase on launch → expo-iap surfaces it; re-send to
  backend to finish a grant interrupted between purchase and acknowledgement.
- Network failure mid-flow → purchase stays unacknowledged → retried next app open.

---

## 6. UI entry point & Pro status

**Entry points** (shown only when `!is_pro` and `canManage`):
- **Store hub** (`apps/mobile/app/(app)/store/[storeSlug]/index.tsx`) — an "Upgrade to
  Pro" card/row that opens the Pro sheet.
- **"More" menu** (`apps/mobile/app/(app)/store/[storeSlug]/more.tsx`) — a "Subscription"
  row showing current plan (Free/Pro); when Free, opens the Pro sheet.

**Pro sheet** — bottom sheet with plan, **price from `proProduct.displayPrice`** (Play's
localized price, not hardcoded), feature list, and a "Subscribe" button calling
`purchasePro(slug)`. States: idle → purchasing (Play sheet) → verifying (backend) →
success (✓, refetch hub so `is_pro` flips and gates unlock) / error (message, no grant).

**Management (YAGNI):**
- No plan toggle (single SKU).
- No in-app cancel flow. When `is_pro`, the Subscription row links out to the Play Store
  subscription center (the Play-policy-compliant management path).

---

## 7. Error handling summary

| Failure | Behavior |
|---|---|
| Play sheet cancelled | No-op, clear loading. No backend call. |
| Backend verification fails (token invalid / SKU mismatch / wrong store) | 4xx, no grant, no acknowledge → Play auto-refunds. Error shown. |
| Token already bound to another store | 4xx conflict, no grant. |
| Network failure after purchase, before ack | Purchase unacknowledged; retried on next launch. Idempotent upsert makes re-grant safe. |
| Already `is_pro` with same token | Idempotent upsert; success. |
| Missing env (`GOOGLE_SA_*`, `GOOGLE_PLAY_PRO_SKU`) | Endpoint fails loudly (500 with clear message); no silent grant. |

---

## 8. Testing

- **Backend verify module:** unit-test the token-binding logic (token→store binding,
  SKU match, state check) with a mocked Google response.
- **Real Play test purchase:** requires an internal-track build + a license-tested
  Google account. End-to-end: purchase → verify → `is_pro` true → acknowledge.
- **Idempotency:** call the verify endpoint twice with the same token → single grant,
  no duplicate row (unique index).
- **Failure path:** simulate a verification failure → confirm no grant and no
  acknowledgement.

---

## 9. Manual checkpoints (not automated)

1. **Prod migration** runs only after explicit go-ahead (and the non-null safety check
   passes).
2. **First commit** of this work is manual.
3. **External Play/GCP setup** (section 4) is a user prerequisite before end-to-end test.
