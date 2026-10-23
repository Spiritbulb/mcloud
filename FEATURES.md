# Features

What the Menengai Cloud platform does today, and what it should do. Priorities and ordering live in
[docs/ROADMAP.md](docs/ROADMAP.md); architecture in [docs/architecture.md](docs/architecture.md).

**Status key:** ✅ shipped · 🟡 partial or stubbed · ❌ missing (desired) · 🔒 plan-gated (Free / Hobby / Pro per `packages/merchant/src/plans.ts`)

Compiled 2026-10-14 from code reading and greps, not from a running app. Evidence is the path in the
last column. Add new features as rows; keep the **ID** stable so the roadmap can refer to it.

**Surfaces:** `SF` storefront, `WEB` platform site, `MOB` merchant app, `NUR` nuru, `SB` spiritbulb (`~/spiritbulb`), `RCH` reach (`~/reach`).

## 1. Public store (SF)

| ID | Feature | Status | Notes / evidence |
|---|---|---|---|
| ST-1 | Section-based pages rendered from Liquid templates, with React fallback | ✅ | `packages/liquid`, `lib/render-page.ts` |
| ST-2 | Sections: hero, collections grid, featured and all products, services, gallery, contact | ✅ | `themes/classic/sections` |
| ST-3 | Product list and detail, variants | ✅ | `store/[slug]/products` |
| ST-4 | Services list and detail | ✅ | `store/[slug]/services` |
| ST-5 | Blog | ✅ 🔒 | Hobby and up |
| ST-6 | Custom pages | ✅ | `p/[pageSlug]` |
| ST-7 | Cart and guest checkout, server-priced, idempotent | ✅ | `api/store/[slug]/checkout` |
| ST-8 | Delivery zones at checkout | ✅ | `delivery-zones` |
| ST-9 | Pay by M-PESA STK push | ✅ | Daraja; verify live (ROADMAP N1) |
| ST-10 | Pay by manual M-PESA code | ✅ | `checkout/mpesa-code` |
| ST-11 | Pay by PayPal (USD, fixed rate) | 🟡 | Rate is `0.0077` constant |
| ST-12 | Pay by Pesapal / IntaSend | 🟡 | UI exists, backend routes do not |
| ST-13 | Pay by card, Airtel Money | ❌ | |
| ST-14 | Order tracking page | ✅ | `orders/[orderNumber]`, anonymous basic view |
| ST-15 | Shopper accounts (orders, profile, addresses) | ✅ | Per-store Supabase Auth |
| ST-16 | Wishlist, product reviews | ✅ | |
| ST-17 | Discount code at checkout | ❌ | Table exists, `discount` is always 0 |
| ST-18 | Order confirmation by SMS / email / WhatsApp | ❌ | |
| ST-19 | Tax, invoices and receipts | ❌ | `tax` stored as 0 |
| ST-20 | Abandoned cart recovery | ❌ | |
| ST-21 | SEO: OG tags | 🟡 | Home, product, blog only |
| ST-22 | SEO: sitemap, robots, JSON-LD, per-page fields | ❌ | |
| ST-23 | Custom domains | ✅ 🔒 | `proxy.ts` host lookup |
| ST-24 | Cached public pages with purge on write | ✅ | `docs/caching.md`; DB-trigger purge ❌ |
| ST-25 | Branding removal | ✅ 🔒 | Pro |
| ST-26 | Multi-currency, Swahili / i18n | ❌ | KSh and USD only, English only |
| ST-27 | Themes | 🟡 | One theme (`classic`) |
| ST-28 | Gift cards, bundles, ad pixels | ❌ | |

## 2. NGO vertical (SF)

| ID | Feature | Status | Notes |
|---|---|---|---|
| NG-1 | Programs, campaigns, impact, mission sections | ✅ | |
| NG-2 | One-off donations (orders tagged `isDonation`) | ✅ | `api/store/[slug]/donate` |
| NG-3 | Donor receipts / tax certificates | ❌ | |
| NG-4 | Recurring donations | ❌ | Not seen |
| NG-5 | Events vertical | 🟡 | Defined, no templates, not in `/start` |

## 3. Merchant settings (SF, `/org/{org}/{store}/settings`)

| ID | Feature | Status | Notes |
|---|---|---|---|
| MS-1 | Live-preview Editor for theme and sections | ✅ | Signed preview token, `postMessage` bridge |
| MS-2 | Products CRUD with plan limit | ✅ | `lib/admin/catalog-actions.ts` |
| MS-3 | Services | ✅ | |
| MS-4 | Collections management | ❌ | Render only, no editor |
| MS-5 | Orders: status and fulfilment, stats | ✅ | `order-settings.tsx` |
| MS-6 | Explicit "confirm payment" for manual M-PESA | ❌ | 21 of 47 orders pending but fulfilled |
| MS-7 | Refund with money reversal | ❌ | Label only |
| MS-8 | Discount code manager | ❌ | Permission key exists |
| MS-9 | Customers list | ✅ 🔒 | No segments, notes, export |
| MS-10 | Review moderation | ❌ | |
| MS-11 | Analytics | 🟡 🔒 | Visits and orders; no funnel or product reports |
| MS-12 | Blog editor | ✅ 🔒 | |
| MS-13 | Delivery options and order tracking (beta) | 🟡 🔒 | Flat zones only; no couriers, labels, rates |
| MS-14 | Team members and invites | ✅ 🔒 | Per-plan seat limits |
| MS-15 | Domain settings | ✅ 🔒 | |
| MS-16 | Integrations: payments, socials | ✅ 🔒 | |
| MS-17 | Integrations: notifications (WhatsApp) | 🟡 | Pro-gate stub only |
| MS-18 | Shop contact email setting | ❌ | NGO only today |
| MS-19 | Product CSV import / export | ❌ | |
| MS-20 | Low-stock alerts | ❌ | |
| MS-21 | Monthly order limit enforcement | 🟡 | Marketing copy only |

## 4. Onboarding, plans, billing (WEB, SF)

| ID | Feature | Status | Notes |
|---|---|---|---|
| OB-1 | `/start` wizard: type, name, slug; seeded pages | ✅ | `onboarding-logic.ts` |
| OB-2 | First-run checklist | ❌ | |
| OB-3 | Plans Free / Hobby (KES 795) / Pro (KES 2,795) | ✅ | One source: `resolvePlan()` |
| OB-4 | Org wallet, PalPluss top-up, plan purchase | ✅ | No nav tab; reach by link |
| OB-5 | Plan expiry job for wallet-paid plans | 🟡 | Confirm `purchase_store_plan` expires rows |
| OB-6 | Web pricing copy matches `plans.ts` | 🟡 | Drift |
| OB-7 | Org hub: stores, members, settings, integrations | ✅ | `apps/web` |
| OB-8 | Servers (UpCloud) with hourly billing | 🟡 | Pages exist; production readiness unverified |
| OB-9 | Trading apps | 🟡 | API only, no UI |

## 5. Platform (WEB)

| ID | Feature | Status | Notes |
|---|---|---|---|
| PL-1 | Magic-code login, WorkOS AuthKit, SSO handoff | ✅ | Cookie shared on `.mcloud.co.ke` |
| PL-2 | Admin console: overview charts, stores, users, subscriptions, orders, webhooks, docs editor | ✅ | `requireAdmin()`. Orders, users and webhook logs paginate on the server. Webhook logs are empty until something writes to `webhook_logs`. |
| PL-2a | Admin audit log (append-only) and handoff recovery email | ✅ | `/admin/audit`, `/admin/handoff-recovery` |
| PL-3 | Docs, changelog, support, beta signup | ✅ | |
| PL-4 | Mobile API (`/api/mobile/*`) | ✅ | Bearer tokens |
| PL-5 | Partner API (`/api/partner/*`) | ✅ | `x-partner-secret` |
| PL-6 | Push notifications (new orders) | 🟡 | Failures swallowed, no receipts or pruning |
| PL-7 | Route-kind security gates, tested | ✅ | `scripts/route-kinds.mjs` |
| PL-8 | Schema validation and rate limits on routes | ❌ | Per-route today |

## 6. Merchant mobile app (MOB)

| ID | Feature | Status | Notes |
|---|---|---|---|
| MO-1 | Sign in (Google, code); session survives network loss | ✅ | |
| MO-2 | Orgs and stores: list, create | ✅ | |
| MO-3 | Today tab: unfulfilled orders, quick fulfil, totals | ✅ | |
| MO-4 | Products CRUD with multi-image upload | ✅ | |
| MO-5 | Orders list, status change, manual "New sale" | ✅ | No detail view |
| MO-6 | Branding, manual M-PESA till, 30-day analytics, delete store | ✅ | |
| MO-7 | Push alerts for new orders; tap opens store | ✅ | Does not open the order |
| MO-8 | Offline cache (24 h), demo mode | ✅ | |
| MO-9 | "Open on web" handoff for editor, domain, members, billing | ✅ | |
| MO-10 | Services, blog, collections, discounts, customers, reviews | ❌ | Web only |
| MO-11 | Barcode scan, POS, receipts | ❌ | |
| MO-12 | Roles UI, notification preferences | ❌ | |
| MO-13 | Biometric lock, tablet layout, i18n | ❌ | |

## 7. Nuru (NUR)

| ID | Feature | Status | Notes |
|---|---|---|---|
| NU-1 | AI chat, streaming, sessions, chat about a note | ✅ | Azure or Anthropic |
| NU-2 | Notes: list, client-side search, create from text, file, photo | ✅ | |
| NU-3 | Note edit and delete | 🟡 | Editor shown, edits not saved |
| NU-4 | Chat session rename and delete; share and export | ❌ | |
| NU-5 | Voice input, camera attach, tools | 🟡 | "Coming soon" rows |
| NU-6 | Source citations in chat, feedback and retry | ❌ | |
| NU-7 | Offline cache and queue | ❌ | |

## 8. Reach (RCH)

Marketplace app: vendors list products, buyers pay by M-PESA. Server side lives in `apps/web` (`api/mobile/reach`, `lib/reach`).

| ID | Feature | Status | Notes |
|---|---|---|---|
| RC-1 | Google sign-in via mcloud, role picker, vendor key login | ✅ | |
| RC-2 | Buyer: catalogue, detail, cart, STK checkout with polling | ✅ | |
| RC-3 | Vendor: dashboard, mark delivered, edit product, stock, images | 🟡 | Image upload endpoint is gone (ROADMAP N3) |
| RC-4 | Escrow-style payouts (held, released), manual payout | ✅ | No vendor view |
| RC-5 | Buyer order history and status | ❌ | |
| RC-6 | Push notifications | ❌ | |
| RC-7 | Delivery address, courier role, tracking | ❌ | |
| RC-8 | Search, filters, categories | ❌ | |
| RC-9 | Ratings, chat, disputes, refunds, cancellation | ❌ | |
| RC-10 | Vendor create and delete products, in-app vendor signup | ❌ | PATCH only |
| RC-11 | Idempotent checkout and stock reservation | ❌ | Retry can duplicate orders |
| RC-12 | Tests | ❌ | None in repo |

## 9. Spiritbulb site (SB, spiritb.uk)

| ID | Feature | Status | Notes |
|---|---|---|---|
| SP-1 | Umbrella marketing site for Nuru, Reach, Tufike, MCloud | ✅ | Subdomain rewrites |
| SP-2 | Login (email OTP, Google), `/home` hub, handoff to mcloud | ✅ | Via partner API |
| SP-3 | Contact form to HubSpot, careers, contribute, legal pages | ✅ | Turnstile on contact |
| SP-4 | Waitlist / RSVP | 🟡 | Hard-coded to Tufike, no Turnstile or rate limit |
| SP-5 | Sitemap, robots, JSON-LD | ✅ | `lastModified` always now |
| SP-6 | Error boundary, loading states, analytics, Swahili | ❌ | |
| SP-7 | Passing tests and env docs | 🟡 | 7 of 54 tests fail on env name mismatch |

## 10. Cross-cutting UX debt

| ID | Item | Status |
|---|---|---|
| UX-1 | Accessible labels on checkout, cart, mobile and Reach controls | ❌ |
| UX-2 | Error boundaries and loading skeletons | 🟡 (3 `loading.tsx`, no `error.tsx` in storefront) |
| UX-3 | Styled dialogs instead of `window.confirm` | ❌ |
| UX-4 | Consistent naming ("Logistics" vs "Delivery Options", "Tracking" vs "Track orders") | ❌ |
| UX-5 | Contrast and touch targets (Reach theme, steppers) | ❌ |
| UX-6 | Empty, error and retry states on mobile analytics and orders | 🟡 |
