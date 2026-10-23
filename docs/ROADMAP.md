# Roadmap (Now / Next / Later)

Priorities across the Menengai Cloud platform and its satellites: `apps/web`, `apps/storefront`,
`apps/mobile`, `apps/nuru`, **spiritbulb** (`~/spiritbulb`, spiritb.uk) and **reach** (`~/reach`).
What exists today is in [FEATURES.md](../FEATURES.md); this file only says what to do about the gaps.

Source: a read-only audit on 2026-10-14 (code reading and greps, not a running app). Items marked
**(verify)** were not confirmed against production. Known tech debt stays in [CLEANUP.md](CLEANUP.md);
this file links to it rather than repeating it.

**How to read it.** *Now* = broken, unsafe, or blocks money/onboarding; do before new features.
*Next* = the biggest merchant-facing gaps. *Later* = valuable but not urgent, or needs a decision first.
Size: **S** under a day, **M** a few days, **L** a week or more. Area tags: `SF` storefront, `WEB`, `MOB` mobile,
`NUR` nuru, `SB` spiritbulb, `RCH` reach.

## Now

| # | Item | Area | Why | Size |
|---|---|---|---|---|
| N1 | Verify live checkout end to end: STK push, manual M-PESA code, PayPal, on a custom domain | SF, WEB | Payment fixes and the origin fix (`api-base.ts`) were verified only in code. See CLEANUP "Do first". | S |
| N2 | Remove or build the **Pesapal / IntaSend** buttons | SF | Checkout calls `/payments/pesapal/create-order` and `/intasend/create-order`, which exist in neither app. Buyers can hit a dead button. | S (remove) |
| N3 | Reach image upload targets deleted `mcloud.co.ke/api/upload` | RCH, WEB | `reach/src/lib/upload.ts` PUTs to a route removed in the cleanup, with no bearer token. Vendors likely cannot add product photos. **Done in code:** the app posts to `/api/mobile/reach/vendor/products/[id]/photo` with the bearer token (the route checks ownership and picks the path). Left: one real photo upload from a phone to confirm (SPI-9). | S |
| N4 | Visible errors at checkout | SF | `checkout/page.tsx` only `console.error`s when integrations or delivery zones fail to load, so the buyer sees no payment methods and no message. Also add an `error.tsx` boundary to storefront and `/org`. | S |
| N5 | Nuru note editor silently loses edits | NUR | `app/note/[id].tsx` is editable but `services/notes.ts` has no update or delete. Add the API and a save button, or make the screen read-only. | M |
| N6 | Reach double-charge on retry | RCH, WEB | A timed-out poll keeps the cart; resubmitting creates a second order and STK push. Add an idempotency key or resume the pending order. Plan: the app generates a key per checkout attempt and keeps it until success, failure or a cart change; `POST /api/mobile/reach/orders` returns the existing order for the same key; a unique index on the key stops a simultaneous double submit (needs a migration). Confirmed still open 2026-10-23 (SPI-10). | M |
| N7 | Fix spiritbulb env and tests | SB | The tests now use `MCLOUD_BASE` (the code appends `/auth/handoff`, so the value is `https://www.mcloud.co.ke/api/partner`). Left: check `.env.example` says the same, rerun the suite, and make the waitlist route fail clearly when env is missing. | S |
| N8 | Close out the DB lockdown: move the `bill-servers` cron token to Vault and rotate it | WEB | Tables and functions are already locked in production (verified 2026-10-14). The cron job now reads the token from Vault (2026-10-23); only the rotation is left. See CLEANUP §9.2. | S |
| N9 | Live-test the Daraja STK Query path; add a rate limit on the order-status endpoint | WEB | The code fix is done on a local branch (CLEANUP §1.5). Needs one real payment and a Cloudflare rule. | S |
| N10 | Login form accessibility and flow (spiritbulb) | SB | No labels, no `autocomplete="one-time-code"`, no `role="alert"` on errors, no resend or change-email. This is the front door for every partner-site user. | S |

## Next

| # | Item | Area | Why | Size |
|---|---|---|---|---|
| X1 | **Customer notifications**: order confirmation by SMS or email, and WhatsApp for merchants | SF, WEB | Nothing is sent to shoppers today. Merchants only get push on the mobile app. Notifications settings page is a Pro-gate stub. For Kenyan shops, SMS/WhatsApp matters more than email. | L |
| X2 | **Discount codes** end to end | SF, MOB | `discount_codes` table and `manage_discounts` permission exist; no merchant UI, no checkout field, `discount` is hard-coded to 0. | L |
| X3 | **Order detail and management** on mobile and web | MOB, SF | Mobile orders tap-cycle a status with no detail, search or customer view. Add detail screen, filters, cancel with reason, and an explicit "confirm payment" step (21 of 47 orders were `pending` but `fulfilled`). | M |
| X4 | **Refunds** with real reversal | SF, WEB | `refunded` is a label only. Add PayPal refund and a Daraja reversal or a manual refund ledger. | M |
| X5 | **Collections editor** | SF | Collections render on the site but merchants cannot manage them. | M |
| X6 | Plan limits actually enforced | SF | `monthlyOrders` is marketing copy only. Also reconcile nav "Pro" badges with the plan features table, and web pricing copy (1,499 / 2,999) with `plans.ts` (795 / 2,795). | S |
| X7 | Reach buyer order history and status | RCH | The buyer cannot see past orders or delivery state. Add `GET /orders` and a screen. | M |
| X8 | Reach push notifications and vendor earnings view | RCH, WEB | Vendors learn of orders only by pulling the dashboard; they cannot see held versus released payouts. Reuse the mcloud push pipeline. | M |
| X9 | Push reliability | WEB, MOB | `send-push.ts` swallows failures, has no receipts check, no dead-token pruning; the `device_push_tokens` table is missing from generated types. Notification tap should open the order (`orderId` is already in the payload). | M |
| X10 | SEO basics for stores | SF | No sitemap, robots or JSON-LD for stores; OG data only on home, product and blog. Add per-page SEO fields and `sitemap.xml` per store domain. | M |
| X11 | Accessibility pass | SF, MOB, NUR, RCH | Checkout and cart have no labels; mobile and nuru have almost no `accessibilityLabel`; Reach has none outside login. Fix touch targets under 44px (Reach stepper) and low-contrast text (Reach `_theme.ts`). | M |
| X12 | Replace `window.confirm/alert` with the app's dialog | SF | Used for destructive actions in services, editor and campaigns. | S |
| X13 | Onboarding: first-run checklist | SF, WEB | `/start` is three fields (good), then an empty store. Add a checklist: add product, set payment, set delivery, share link. | M |
| X14 | Consolidate duplicated payment routes and `lib/merchant/*` | WEB, SF | Divergence is already causing bugs. CLEANUP §2.5–2.6. | L |
| X15 | Rate-limit and validate route input | WEB, SF | No schema library yet; order status endpoint is unlimited. | M |

## Later

| # | Item | Area | Why / decision needed | Size |
|---|---|---|---|---|
| L1 | More payment rails: card (Pesapal or Flutterwave), Airtel Money | SF | Decide the provider first (N2 depends on it). | L |
| L2 | Courier and delivery: rate tables, labels, courier role, live tracking | SF, RCH | Reach has no courier role, no delivery address in the order payload, and no maps. | L |
| L3 | Swahili and i18n; multi-currency | SF, MOB, SB | `currency.ts` is KSh and USD only; PayPal uses a fixed 0.0077 rate. | L |
| L4 | More themes; finish the `events` vertical | SF | One theme (`classic`) exists; `events` references sections with no templates. | L |
| L5 | Abandoned cart, low-stock alerts, product CSV import/export | SF, MOB | Standard merchant expectations. | M each |
| L6 | NGO: donor receipts, recurring donations | SF | Donations exist; receipts and monthly giving do not. | M |
| L7 | Barcode scan and POS mode in the mobile app | MOB | Barcode is typed by hand today. | L |
| L8 | Roles and team management in mobile; notification preferences | MOB | Web-only today. | M |
| L9 | Mobile parity: services, blog, discounts, customers | MOB | Mobile covers products and orders only; everything else hands off to web. | L |
| L10 | Biometric lock, tablet layout, deep links to orders | MOB | | M |
| L11 | Nuru: chat session rename and delete, sharing and export, server-side search, offline queue, voice and camera attach | NUR | Several "coming soon" rows already in the UI. | L |
| L12 | Reach: ratings, disputes and refunds, search and filters, vendor product create and delete, vendor signup form in-app | RCH | | L |
| L13 | Analytics: funnels, product reports, and an analytics tool on spiritbulb | SF, SB | Basic visits and orders only. | M |
| L14 | Spiritbulb: multi-product waitlist, hub copy driven by data, lazy-load hero effects, real README | SB | Waitlist is hard-coded to Tufike. | M |
| L15 | One origin for the merchant area | WEB, SF | CLEANUP §7: two origins for one product. | L |
| L16 | Trading apps UI; servers (UpCloud) production readiness | WEB | API with no UI; billing and wallet have no nav tab. Decide whether to keep. | M |
| L17 | Shared stylesheet package; Dockerfile Node upgrade; per-app turbo env | WEB, SF | CLEANUP §2.7, §3. | M |

## Cross-project connections (for context)

- **spiritbulb → mcloud:** `/api/partner/auth/{send-code,verify,handoff}` and `/api/partner/waitlist`, with `x-partner-secret`. Same WorkOS project, so one login across spiritb.uk and mcloud.
- **mobile, nuru, reach → web:** bearer tokens against `/api/mobile/*`. Reach also uses the `reach_*` tables and the PalPluss webhook.
- **web ⇄ storefront:** shared session cookie on `.mcloud.co.ke`; cross-links via `webUrl()` and `storeSettingsUrl()`.
- **reach ⇄ spiritbulb:** only terms and privacy links, and marketing pages. No API link.

## Suggested way to keep this alive

- Keep this file to one line per item. When an item gets real work, open an issue and put its number in the `#` column.
- Move finished items to the changelog (`apps/web/CHANGELOG.md`) and delete the row; don't tick-and-leave.
- Re-sort Now/Next/Later at the start of each month.
