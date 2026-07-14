# SP5 — Vertical-aware merchant admin (content authoring)

**Date:** 2026-07-14
**Status:** design, approved
**Sub-project:** SP5 of the storefront Liquid vertical roadmap (final)

---

## 1. Problem

An NGO tenant's site cannot be authored. Mission, programs, impact stats, contact and
campaigns all live in `stores.settings` JSON and are written by hand with SQL. SP4 shipped
the donate flow end to end, so an NGO can *take* money, but only if someone opens a DB
console to create the campaign first. That is not a product.

The admin is also visibly a shop. The settings nav groups are **Store / Catalog /
Commerce**, the Overview page renders **Top Product**, `product_count`, `revenue_total` and
an *add-to-cart → checkout* funnel. An NGO merchant lands on a dashboard measuring a
journey their visitors never take.

SP5 closes both: author your site from the admin, and stop calling it a shop.

---

## 2. Goals

- An NGO merchant can create, edit, reorder and delete campaigns without SQL.
- An NGO merchant can author mission, programs, impact stats and contact from the admin.
- The settings nav shows only what the vertical actually has.
- The Overview page shows donation metrics for a non-commerce vertical.
- Merchant-facing copy says **site**, not store/shop.

**Non-goals:**

- Renaming the `stores` table, `store_id` columns, `[storeSlug]` routes or
  `apps/storefront`. That is a schema/identifier refactor across ~199 `store_id` type
  references and ~74 route files, with a prod migration. It is its own project. SP5 changes
  **copy only**.
- A donation-aware Orders *page* (donor / campaign / dedication columns). The Orders list
  is relabelled and grouped under Donations for NGOs, but its internals are unchanged.
- Recurring / monthly giving. Still a future sub-project (SP4 non-goal, unchanged).
- Campaign detail pages or new storefront routes.
- Fixing `uploadImage`'s anon-client storage write (see §8).
- Introducing a real test runner (see §7).

---

## 3. Context (what already exists)

- **`updateStoreSettings`** — `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.ts`.
  A WorkOS-session-authorized, `canManage`-gated, **service-role** write to `stores.settings`,
  field-whitelisted so a caller cannot smuggle other columns through. **This is the write
  path SP5 uses.** No new write path is needed.
- **`Vertical` descriptor** — `packages/verticals/src/index.ts`. Now carries
  `commerce: boolean` (`shop: true`, `ngo: false`), added when the storefront nav was made
  vertical-aware. `getVertical(type)` resolves a store type and never throws (unknown → shop).
- **Campaign shape + readers** — `apps/storefront/lib/campaigns.ts`. `readCampaigns` is
  **tolerant**: it silently drops any entry lacking a string `id` and `title`.
  `loadCampaignsWithProgress(storeId, settings)` already sums completed donation orders per
  campaign — the NGO Overview reuses it directly.
- **Settings nav** — `settings-shell.tsx` exports a static `SECTIONS` array; `TabId` is
  derived from it (`ALL_TABS[number]['id']`).
- **Image upload** — `apps/web/lib/upload.ts` (`uploadImage(file, bucket, path)`) and
  `apps/web/components/store/image-upload.tsx` (`<ImageUpload bucket=… />`). Both are
  generic and already support the `store-assets` bucket. **Reused, not rebuilt.**
- **Settings page convention** — each tab is `page.tsx` (server) + `*-client.tsx` (client)
  + optional `actions.ts`.

---

## 4. Design

### 4.1 Vertical-aware nav

`SECTIONS` becomes `sectionsFor(vertical: Vertical): NavSection[]`. `TabId` derives from the
**union of all verticals'** tabs so routing and the active-tab resolver stay exhaustive
regardless of which vertical is mounted.

| Group | Shop | NGO |
|---|---|---|
| **Site** | Overview, General, Design | Overview, General, Design |
| **Catalog** | Products, Services | *(hidden)* |
| **Commerce** | Orders, Analytics, Customers, Blog | *(hidden)* |
| **Donations** | *(hidden)* | Orders *(relabelled "Donations")*, Analytics, Blog |
| **Content** | *(hidden)* | **Content** ← new |
| **Advanced** | Members, Domain, Integrations | same |
| **Account** | Billing | same |

Gating is driven by `vertical.commerce`, not by `type === 'ngo'`, so a third vertical
(portfolio) inherits sensible behaviour without touching the nav.

Hiding a tab must also **guard its route**: navigating directly to `/settings/products` on
an NGO renders a "not available for this site" state rather than a broken page. Hidden ≠
inaccessible unless the route says so.

### 4.2 The Content page (new)

Route: `settings/content` — `page.tsx` (server, loads store + settings) + `content-client.tsx`.

Rendered sections are chosen by vertical:

**NGO**

| Section | `stores.settings` key | Shape |
|---|---|---|
| Mission | `missionHeadline`, `mission` | two strings |
| Programs | `programs` | `{ title, description, image }[]` |
| Impact stats | `impactStats` | `{ label, value }[]` |
| Contact | `contact` | `{ address, email, phone }` |
| Campaigns | `campaigns` | see below |

**Shop** — Hero (`heroTitle`, `heroSubtitle`, `heroImage`, `heroSlides`).

Each list section is an **inline list editor**: rows render as expandable cards, "Add"
appends, rows can be reordered and removed, everything edits in place. One **Save** writes
the whole settings blob through `updateStoreSettings`.

### 4.3 Campaign editor

Fields: `title`, `description`, `image`, `goalAmount?`, `presets?: number[]`,
`allowCustomAmount?`, `minAmount?`.

**Campaign `id` is generated on create and immutable.** It is never rendered as an editable
field. This is a correctness constraint, not a preference: donation orders are tagged with
`metadata.campaignId`, and `loadCampaignsWithProgress` sums by that id. Changing an id
silently orphans every donation the campaign has ever received, and the progress bar resets
to zero with no error anywhere.

Deleting a campaign is therefore the only way to sever that link. **Deleting a campaign that
has raised funds must warn first**, naming the amount raised, because the donation orders
survive but stop being attributable to anything the merchant can see.

### 4.4 NGO Overview

For `!vertical.commerce`, the Overview swaps its commerce tiles for donation ones:

| Shop tile | NGO tile |
|---|---|
| Revenue total | **Total raised** |
| Product count | **Active campaigns** |
| Top product | **Top campaign** (by raised) |
| add-to-cart → checkout → orders funnel | **Per-campaign progress** (raised / goal) |
| Recent orders | **Recent donations** |

Source: `loadCampaignsWithProgress` already returns `raised`, `percent`, `goalLabel` per
campaign — the tiles are a presentation of data SP4 already computes. Recent donations are
`orders` filtered on `metadata.isDonation = 'true'`.

The payment-setup nudge ("Connect M-Pesa or PayPal…") is vertical-neutral and stays, with
its copy adjusted to donations.

### 4.5 Copy rename

Merchant-facing strings only: nav group "Store" → "Site", headings, button text, empty
states, the `storefront` icon on General. Identifiers (`stores`, `store_id`, `storeSlug`,
`apps/storefront`, `useStoreHref`, component filenames) are **untouched**.

---

## 5. Data flow

**Author:** Content page loads `stores.settings` → merchant edits a local draft → Save →
`updateStoreSettings(slug, { settings })` (session-authorized, `canManage`, service-role) →
`stores.settings` updated.

**Render:** unchanged. `/store/{slug}` → `loadCampaignsWithProgress` → Liquid `campaigns`
section. SP5 writes the same JSON shape SP4 already reads; no storefront change.

**Image:** `<ImageUpload bucket="store-assets" path={`${storeId}/campaigns/${id}`} />` →
public URL → stored as the `image` string.

---

## 6. Validation & error handling

`readCampaigns` **silently drops** malformed entries. A campaign saved with an empty title
would simply vanish from the storefront with no error shown anywhere. The editor must
therefore validate **before** save, not rely on the reader:

- `title` required and non-empty (else the campaign disappears on render).
- `goalAmount`, `minAmount`, `presets[]` must be positive finite numbers.
- If `allowCustomAmount === false`, `presets` must be non-empty — otherwise
  `validateDonationAmount` rejects *every* amount a donor can enter and the campaign cannot
  receive money at all.
- Programs / impact stats: drop blank rows on save rather than persisting empty objects.

Save surfaces the server action's `{ error }` inline; the draft is retained on failure so a
merchant never loses typed content.

---

## 7. Testing

The repo's existing tests are plain **`node:assert` scripts run with `tsx`** (not vitest —
`npx vitest` reports "no test suite found" because there are no `describe`/`it` blocks). SP5
follows that convention.

The logic worth testing is pure and extractable:

- `sectionsFor(vertical)` — NGO hides Catalog/Commerce; shop keeps them; both keep
  Advanced/Account; `TabId` stays exhaustive.
- Campaign draft validation — rejects empty title; rejects `allowCustomAmount: false` with
  empty presets; rejects non-positive amounts.
- Draft → settings serialization — blank rows dropped; ids preserved across an edit
  (the orphaning guard).

The absence of a real test runner is a genuine gap, but fixing it is not a rider on SP5.

---

## 8. Known debt (flagged, not fixed here)

`uploadImage` uses `@mcloud/db/client` — the **anon** browser client — to write directly to
Supabase storage. That is at odds with the "route everything, no anon" direction. It is
pre-existing and works, and SP5 reuses it rather than expanding the anon surface. The
anon-cleanup project should sweep it up.

---

## 9. Open risks

- **Analytics for NGOs.** The Analytics tab is kept under Donations but its internals were
  not audited. It may carry the same commerce assumptions Overview does. If so, that is a
  follow-up, not SP5 scope creep.
- **Hidden-tab route guards.** Every hidden tab needs its route guarded, not just its nav
  entry removed. Easy to miss one.
