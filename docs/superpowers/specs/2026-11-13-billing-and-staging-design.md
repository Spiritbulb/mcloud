# Billing upgrade path and staging awareness

Date: 2026-11-13
Status: approved (approaches A/A/A in conversation)
Source: storefront funnel audit, `docs/test-runs/2026-11-12-storefront-funnel-audit/README.md` (F1, F2)

## Why

- **Billing:** upgrading takes six steps across two apps, and the price of a plan is only in a hover
  tooltip that phones never show. People who want to pay give up before they finish.
- **Staging:** pushes to production matter more now. A staging server on `staging.mcloud.co.ke`
  runs **web only** for now (the storefront follows later). It still shares the production database
  until a separate one is caught up. The app has to know when it is staging, so that crawlers stay
  off it and payments made there don't report back to production. This part ships first, straight to
  `main`, because crawlers are the urgent risk.

## Staging (ships first)

One build-time setting, `NEXT_PUBLIC_DEPLOY_ENV` (`staging`; unset or anything else means
production). A pure helper `isStaging()` reads it.

When staging is set, web:
- serves `robots.txt` with `Disallow: /`, an empty sitemap, `robots: noindex, nofollow` metadata, and
  an `X-Robots-Tag: noindex, nofollow` header on every response;
- shows a thin "Staging" bar at the top of every page, so nobody mistakes it for the live site;
- builds the Daraja STK `CallBackURL` from its own origin (`NEXT_PUBLIC_ADMIN_ORIGIN`) instead of the
  hard-coded `https://mcloud.co.ke`. Production is unchanged, because its origin env is the live
  host. The storefront copy of the route gets the same change (the copies stay identical), using
  `webAppOrigin()`.

Non-goals for now: the sign-in round trip (spiritb.uk's handoff returns to production; needs a
spiritbulb change), the separate database, and the storefront on staging.
Anti-goal: anything that changes production behaviour when the setting is absent.

Approaches considered: a build setting (picked) versus detecting `staging.` in the request host
(needs no setting, but the callback and the client-side bar cannot reliably see the host, so half
of it would need the setting anyway).

## Billing F1: top up from the shortfall

Picked: the shortfall message gets a "Top up KSh X with M-PESA" button (managers only). It opens
`WalletTopupModal` with the amount set to the shortfall (rounded up, at least KSh 20) and remembers
the store and plan. After the prompt is sent, Billing re-reads the balance every 5 s for up to
2 minutes. When the balance covers the plan, the usual confirm dialog opens. On timeout, a message
says the payment hasn't arrived yet and the plan buttons stay. The charge still happens only on
confirm, through `purchaseStorePlan`.

Rejected: buying automatically when the top-up webhook lands (money moves without a confirm, and
it touches the payment webhook); pre-filling only (keeps a step).

## Billing F2: what a plan gives you

Picked: a "Plans" panel above the store table with Hobby and Pro side by side: price per month and
two short benefit lines derived from `PLAN_LIMITS` (pure, tested), so they cannot drift from what the
app unlocks. Plan buttons show the price (e.g. "Choose Hobby · KSh 795/mo"), and the `title` tooltip
goes away.

Rejected: benefits under each store row (repeats on every row).

## Top-up service fee

PalPluss charges KSh 3 per top-up. The person pays it: the STK prompt asks for the amount plus
`TOPUP_FEE_KES = 3`, and the wallet is credited the amount they typed. The top-up box shows
"Amount · M-PESA fee KSh 3 · You pay". Applies to every wallet top-up (Billing and Servers share the
route). The webhook credits `confirmed − min(max(confirmed − requested, 0), fee)`, so a top-up started
before this shipped (paid exactly the requested amount) is still credited in full, and the amount
still comes only from PalPluss. No migration: `wallet_topups.amount_cents` stays the requested credit.

## Left to the builder

Exact copy of the benefit lines, the bar's styling (thin, high-contrast, not dismissable), the poll
interval within reason. Tests: `isStaging`, callback URL builder, benefit lines, shortfall top-up
amount.
