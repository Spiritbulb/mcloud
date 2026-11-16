# Dashboard guidance: setup checklist, doc links and light graphics

Date: 2026-11-12
Status: approved design, pending implementation plan

## Goal

New merchants land on the store Overview and see numbers and text with nothing that tells them
what to do next. The docs on `mcloud.co.ke/docs` explain each settings area, but the dashboard
links to them only from the header menu. This work makes the dashboard and the docs guide people
together:

- an illustrated **setup checklist** on Overview whose steps tick themselves from real data and
  link to both the settings page and the matching doc;
- a **help link** on each settings page, pointing at its doc;
- **light graphics**: a 14-day sales/donations trend and a few spot illustrations;
- **copy**: the word "NGO" leaves user-facing text in favour of "non-profit" (or wording that
  avoids a label altogether).

Success: a brand-new shop or non-profit can reach a store that takes payments by following the
checklist alone, and every checklist step and settings page is one click from its doc.

Out of scope: guided tours/popovers, an in-app doc drawer, the org hub on web, step analytics.

## 1. Setup checklist

Location: Overview (`apps/storefront/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/`),
below the stat strip, above the theme update panel. It replaces the "Set up payments" panel.

Panel: title "Get your store ready" (non-commerce: "Get your site ready"), an "N of M" progress
ring, a spot illustration, and one row per step. Each row: tick (done) or empty circle, step
title, one-line description, a primary link to the settings page and, for undone steps, a quiet
"Learn how →" link to the doc (new tab, `webUrl()`-based, `openExternal` in the TWA).

Steps (derived, never stored):

| Step | Commerce | Non-commerce | Done when | Settings page | Doc |
| --- | --- | --- | --- | --- | --- |
| Add a product | ✓ | | `product_count > 0` | `products` | `/docs/products` |
| Add a campaign | | ✓ | `campaign_progress.length > 0` | `content` | guide `collect-donations-online-for-your-ngo` |
| Set up payments | ✓ | ✓ | `payments_enabled` | `integrations/payments` | `/docs/payments` |
| Set delivery zones | ✓ | | `delivery_zone_count > 0` | `logistics` | `/docs/delivery` |
| Add your logo | ✓ | ✓ | `logo_url` set | `brand` | `/docs/general` |
| Share your link | ✓ | ✓ | `order_count > 0` (incl. donations) or `link_shared` | copy-link action | guide `start-an-online-shop-in-kenya` / donations guide |
| Connect a domain (optional) | | ✓ | `custom_domain_set` | `domain` | `/docs/domain` |

Optional steps do not count toward "N of M".

States:
- **In progress**: rows as above, "Hide" in the panel's action slot.
- **All done**: compact "You're all set" with the all-done illustration and a "Hide" button.
- **Hidden**: panel not rendered.

Persistence: `stores.settings.setup_checklist` (jsonb, no migration) holding
`{ hidden?: true, link_shared?: true }`. Written by one server action in
`apps/storefront/lib/admin/` (session, `requireManagedStore`, `store_id`-scoped, merges into
`settings` without clobbering other keys). "Copy link" on Overview sets `link_shared`.
No `revalidateStore` needed: nothing visitors see changes.

Pure logic: `settings/setup-checklist-logic.ts` (+ `.test.ts`) exports
`checklistSteps(input, commerce)` returning `{ id, title, description, done, optional, href, docHref }[]`
and the progress count. Copy lives here so it is testable and editable in one place.

Data: `getStoreOverview` (`packages/merchant/src/store-data.ts`) adds `delivery_zone_count`
(count on `delivery_zones` by `store_id`) and `setup_checklist` (from `settings`).

## 2. Help links on settings pages

`PageHeader` (`@mcloud/ui/kit/page-header`) gains an optional `help?: { href: string; label: string }`
rendered as a small "Help ↗" link beside the description. A single map in
`apps/storefront/lib/help-links.ts` (+ test) goes from settings tab to doc URL; the checklist
reads the same map so the two never disagree. Initial map: products, orders, customers,
payments, logistics→delivery, general, domain, editor, analytics, blog, services, tracking, reach, socials,
members. Only slugs that exist are mapped; the test pins the list against the known doc and
guide slugs (`apps/web/content/guides/index.ts` cannot be imported across apps, so the test
holds an explicit allow-list and a comment to update it).

Each settings page passes `help={helpFor('<tab>')}`. Pages without a doc pass nothing.

## 3. Graphics

### Trend panel
"Last 14 days" panel on Overview, placed directly above the funnel.
Shows the period total and a `Sparkline` (`@mcloud/ui/kit/sparkline`) in `text-primary`.
Commerce: revenue from paid orders per day. Non-commerce: donations raised per day.
Hidden when the store has no orders at all (the empty states and checklist carry new stores).

Data: `getStoreOverview` adds `daily: { date: string; amount: number; count: number }[]`,
14 entries, oldest first, from one query on `orders` (`store_id`, `created_at >= 14 days ago`,
paid-like statuses). Bucketing by Africa/Nairobi calendar day with missing days filled with 0 is a
pure function in `packages/merchant/src/overview-series.ts` (+ test).

### Spot illustrations
New `packages/ui/src/kit/illustrations.tsx` (`@mcloud/ui/kit/illustrations`): four small
inline-SVG illustrations, `setup`, `all-done`, `first-sale`, `first-donation`. Simple line +
soft-fill style; strokes use `currentColor`, fills use the `--primary` token at low opacity, so
they follow light/dark mode and store accent with no extra assets. `aria-hidden`, fixed viewBox,
~96px tall.

`EmptyState` gains an optional `illustration` prop that renders in place of the icon. Overview's
recent-orders/donations empty state uses `first-sale` / `first-donation`; the checklist uses
`setup` / `all-done`. Other pages may adopt them later; not in this change.

## 4. Copy: no "NGO" in user-facing text

The vertical id `ngo` stays (it is data). Visible wording changes:

- `packages/verticals/src/index.ts`: label `NGO` → `Non-profit` (update `index.test.ts`).
- `apps/storefront/app/(marketing)/start/start-client.tsx`: "An NGO or cause" → "A non-profit or cause".
- `apps/storefront/app/(marketing)/page.tsx`: "Pick shop or NGO" → "Pick a shop or a non-profit site".
- `apps/storefront/app/(marketing)/layout.tsx` title/description: "shop or NGO site" →
  "shop or non-profit site"; "merchants and NGOs" → "merchants and non-profits".
- `apps/storefront/lib/theme-presets.ts` Giving preset: "for NGOs" → "for causes".
- New copy in this work never says "NGO".

Left alone: the guide slug `collect-donations-online-for-your-ngo` (a live URL) and the body of
the web guides, which target the search phrase "NGO". Revisit separately if wanted.

## 5. Testing

- `setup-checklist-logic.test.ts`: steps per vertical, done rules, optional steps excluded from
  the count, all-done detection, every step has an href and doc href.
- `help-links.test.ts`: every mapped URL is in the allow-list.
- `overview-series.test.ts`: 14 entries, Nairobi day boundaries, gaps filled, unpaid ignored.
- Server action: rejects without session or store access; merges into `settings`.
- `verticals` tests updated for the label.
- `/run-mcloud` screenshots: new shop, new non-profit, store with sales; light and dark.
- `npx turbo run typecheck lint test --concurrency=1`.
