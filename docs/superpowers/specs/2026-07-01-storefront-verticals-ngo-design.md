# Storefront Verticals — NGO (Deliverable A)

> ⚠️ **SUPERSEDED (2026-07-01).** During execution we discovered a pre-existing Shopify-style **Liquid** theming system and pivoted: storefront rendering will move to Liquid (pages-as-data), not a React NGO theme. This spec's React-theme approach is abandoned. Only the **donation-endpoint** design survives, and it moves to a later sub-project. See `2026-07-01-storefront-liquid-pipeline-design.md` and memory `project_storefront_liquid`. Do not implement this document.

**Date:** 2026-07-01
**Status:** SUPERSEDED — do not implement
**Scope:** Deliverable A only — the storefront-side vertical seam, the NGO theme, and the donation flow. Flipping a store to `type='ngo'` is done directly in the DB / superadmin for now. The polished merchant admin (vertical picker in onboarding, relabeled item editors) is a **separate, later spec (Deliverable B)** and is explicitly out of scope here.

---

## 1. Problem & Goal

The `storefront` app is hardcoded to e-commerce. A "store" always renders products, collections, services, cart, and checkout. We want the app to support other **verticals** — starting with **NGOs** (mission/programs/impact + real donations), and later portfolios and others — without re-plumbing the app each time.

The near-term goal (confirmed): NGOs can build a **working, real** site (mission, programs, impact, contact) **and accept donations** (real money), reusing the existing payment rails (M-Pesa/Daraja/PayPal/Pesapal/Intasend) reframed as giving.

The strategy: make a storefront's **vertical** a first-class concept driven by the existing `stores.type` column. The vertical drives three things:

1. **Content** — which item kinds a site holds and what they're called.
2. **Presentation** — which theme family renders it.
3. **Checkout meaning** — purchase vs. donation.

NGO is the first non-shop vertical; the seam is designed so portfolios etc. slot in later with no re-plumbing.

---

## 2. Current State (grounding)

- A storefront is a row in `stores`. `stores.type` **already exists** (TEXT, default `'shop'`; all 19 current rows are `'shop'`). `stores.settings` is a freeform JSON blob (heroTitle, themeId, socialLinks, heroSlides, galleryPhotos, …).
- Rendering pipeline: `apps/storefront/app/store/[slug]/page.tsx` loads the store + products + collections + featured + services, then `resolveTheme(settings.themeId)` → renders `@mcloud/themes/classic/StoreFront`. Only one theme exists today (`classic`).
- `@mcloud/themes` (`packages/themes/src/`) holds the theme components and shared prop types (`packages/themes/src/types.ts`). `StoreFrontProps = { store, products, collections, featuredProducts, services }`.
- Content lives in `products` and `services` tables; both already have an `item_type` TEXT column (currently descriptive, not a hard discriminator).
- Checkout is `apps/storefront/app/api/store/[slug]/checkout/route.ts` (+ `checkout/mpesa-code`). Cart is client-side (`contexts/CartContext.tsx`, `CartIsland`).
- Store creation is `apps/web/lib/merchant/stores.ts::createStoreForUser` — it does **not** set `type` (relies on DB default `'shop'`). (Deliverable B territory.)

**Decisions already made in brainstorming:**

- Content model: **one underlying content engine, type-driven** (generic items + `kind`), not per-vertical tables and not a block builder.
- Rendering: **separate NGO theme(s)**, but the NGO theme **reuses shared primitives** (nav, footer, checkout/donate island, currency) — "separate theme" means a separate page-level `StoreFront` + section set, **not a fork of everything**.
- Donations: **item with a donation pricing mode** — a campaign is an item; donor enters/picks an amount; reuse the existing checkout endpoint; no cart; order tagged as a donation.

---

## 3. Architecture

### 3.1 The Vertical descriptor (the seam)

A single source of truth, defined once in `@mcloud/themes` (new file `packages/themes/src/verticals.ts`), keyed by `stores.type`:

```ts
export type VerticalId = 'shop' | 'ngo' // extensible

export interface Vertical {
  id: VerticalId
  /** Item kinds this vertical surfaces, in the item tables' item_type. */
  itemKinds: string[]              // shop: ['product'] ; ngo: ['program', 'campaign']
  /** Theme family prefix used by the resolver. */
  themeFamily: string              // shop: 'classic' ; ngo: 'ngo-classic'
  /** What checkout means for this vertical. */
  checkout: 'purchase' | 'donation'
  /** UI copy the theme/labels read from, instead of hardcoding "Add to cart". */
  labels: {
    itemNoun: string               // 'product' | 'program'
    itemNounPlural: string
    ctaPrimary: string             // 'Add to cart' | 'Donate'
    checkoutVerb: string           // 'Checkout' | 'Give'
  }
}

export const VERTICALS: Record<VerticalId, Vertical> = { /* shop, ngo */ }

/** Resolve a store's vertical, defaulting to 'shop' for unknown/legacy types. */
export function getVertical(storeType: string | null | undefined): Vertical
```

`stores.type` is the discriminator — **no schema change to `stores`** for the vertical itself. `getVertical` defaults unknown/legacy types to `shop` so the 19 existing stores are unaffected.

### 3.2 Content model (items)

One content engine, type-driven. We use the existing `item_type` column on `products`/`services` as the **kind** discriminator:

- **shop:** `item_type='product'` (existing products; treated as the default kind — see migration note).
- **ngo:** two kinds:
  - `item_type='program'` — a thing the NGO does. Informational, price null/0, not purchasable.
  - `item_type='campaign'` — a cause that accepts money. Carries a **donation pricing mode** in its `metadata`.

**Donation pricing mode** lives in the campaign item's `metadata` JSON (no new columns):

```jsonc
// products.metadata (or services.metadata) for an item_type='campaign'
{
  "pricingMode": "donation",     // vs "fixed" (normal products)
  "donationPresets": [500, 1000, 2500],  // suggested amounts, optional
  "goalAmount": 100000,          // optional, for a progress bar
  "allowCustomAmount": true
}
```

No new content tables. `page.tsx` queries the item tables filtered by the vertical's `itemKinds` instead of always pulling `product`-shaped rows.

**Migration note (data):** existing products have historical `item_type` values (currently descriptive, not `'product'`). During the plan we must decide the shop default: either (a) treat "anything not a known ngo kind" as a shop product (so shop needs no data backfill), or (b) backfill `item_type='product'`. **Chosen: (a)** — `getVertical('shop').itemKinds` acts as an allowlist, but the shop query keeps its current behavior (all active products) rather than filtering by kind, so existing shop data is untouched. Only NGO queries filter by kind. This is called out again in §7.

### 3.3 Rendering (NGO theme reusing shared primitives)

- New theme module `packages/themes/src/ngo-classic/` with its own `StoreFront.tsx` composed of NGO sections: **mission hero, programs grid, impact stats, campaigns/donate CTA, team, contact.** No product grid, no cart island.
- **Reuse shared primitives.** Before building, extract the genuinely shared pieces out of `classic/` into a shared location within the themes package (e.g. `packages/themes/src/shared/`): navigation, footer, currency formatting, and the checkout/payment island (reframed as a **DonateIsland** wrapper over the same payment UI). `ngo-classic` imports these; it only owns its page layout + NGO-specific sections. If a primitive is currently entangled with product concepts, the extraction untangles just enough to be reusable — no gratuitous refactor of `classic`.
- **Resolver** (`packages/themes/src/resolver.ts`) picks the theme by **vertical first, then themeId within the family**:
  - `getVertical(store.type).themeFamily` selects the family (`classic` vs `ngo-classic`).
  - `settings.themeId` selects a variant within the family (only one per family for now).
  - Unknown/legacy → `classic`, preserving current behavior.
- `apps/storefront/components/store/Storefront.tsx` (the dynamic-import registry) gains the `ngo-classic` entry alongside `classic`.
- `StoreFrontProps` generalizes: instead of the shop-specific `{ products, collections, featuredProducts, services }`, page-level data is passed as a vertical-aware shape. Minimal approach: keep the existing fields for `classic` and add an optional `items`/vertical-scoped payload the NGO theme reads. The plan will settle the exact prop shape; the constraint is **`classic` keeps working unchanged**.

### 3.4 Data loading (`page.tsx`)

`page.tsx` reads `getVertical(store.type)` and branches the data fetch:

- **shop:** unchanged — products + collections + featured + services + review aggregates.
- **ngo:** fetch items where `item_type IN vertical.itemKinds` (programs + campaigns), split by kind, plus the store settings sections (mission text, impact stats — stored in `settings`). No reviews/wishlist fetch needed for NGO.

Other storefront routes (`/cart`, `/[product-slug]`, `/products`, `/services`) remain shop-only for now. NGO campaigns get a detail route reusing the item-detail machinery, but with the donate flow instead of add-to-cart. The plan will decide whether NGO reuses `/[item-slug]` or gets `/campaigns/[slug]`; **recommendation: reuse the existing `/[product-slug]` dynamic segment** rendered by the NGO theme's campaign-detail component, to avoid new routing.

### 3.5 Donations (reuse rails)

- A campaign item with `pricingMode='donation'` renders a **Donate** action in the NGO theme: preset amounts + optional custom amount (respecting `allowCustomAmount`).
- Selecting an amount goes **straight to the existing checkout endpoint** (`api/store/[slug]/checkout/route.ts`) — **no cart**. The donation is a single line: the campaign item at the donor-chosen amount, quantity 1.
- The order is **tagged as a donation** so reporting can distinguish gifts from sales. Mechanism: an `isDonation`/`kind:'donation'` flag written into the order's `metadata` (or an equivalent existing order field — the plan confirms the orders schema). No new orders table.
- All payment providers (M-Pesa/Daraja/PayPal/Pesapal/Intasend) work unchanged — the checkout endpoint already handles them; donations just carry a caller-supplied amount and the donation tag.
- Guest donor details reuse the existing `GuestDetails` shape (email/phone), plus optional donation extras (dedication note) deferred unless trivial.

---

## 4. Components / Units

| Unit | Location | Responsibility | Depends on |
|---|---|---|---|
| `Vertical` descriptor + `getVertical` | `packages/themes/src/verticals.ts` | Single source of truth mapping `stores.type` → kinds/theme/checkout/labels | none |
| Shared theme primitives | `packages/themes/src/shared/` | Nav, footer, currency, payment/checkout island (extracted from `classic`) | `verticals`, existing payment UI |
| NGO theme | `packages/themes/src/ngo-classic/` | NGO `StoreFront` + sections (mission, programs, impact, donate CTA, campaign detail) | shared primitives, `verticals` |
| Resolver update | `packages/themes/src/resolver.ts` | Pick theme by vertical family then themeId | `verticals` |
| Theme registry | `apps/storefront/components/store/Storefront.tsx` | Dynamic-import `ngo-classic` | themes |
| Page loader branch | `apps/storefront/app/store/[slug]/page.tsx` | Fetch item kinds per vertical | `verticals`, db |
| Donate flow | NGO theme donate section + reuse `checkout/route.ts` | Amount entry → existing checkout, tag order as donation | checkout endpoint |

---

## 5. Data Flow

**NGO home render:**
`GET /store/{slug}` → load `stores` row → `getVertical(store.type)` = ngo → fetch items where `item_type IN ('program','campaign')`, read mission/impact from `settings` → resolver picks `ngo-classic` → NGO `StoreFront` renders sections.

**Donation:**
Donor picks campaign + amount → NGO DonateIsland → `POST /api/store/{slug}/checkout` with `{ items: [{ id: campaignId, price: amount, quantity: 1 }], guest, provider, metadata: { isDonation: true } }` → existing payment provider flow → order recorded, tagged donation.

---

## 6. Error Handling

- `getVertical` never throws — unknown `type` → `shop` (safe default; protects the 19 legacy stores and any future type set before its theme ships).
- Resolver falls back to `classic` if a vertical's theme family isn't registered yet.
- NGO page: if a store is `type='ngo'` but has no campaigns, render the informational sections and hide the donate CTA rather than erroring.
- Donation amount validation (min > 0, numeric, within any configured bounds) happens client-side before checkout and is re-validated server-side in the checkout endpoint.

---

## 7. Migration & Backwards Compatibility

- **No `stores` schema change** — `type` already exists.
- **No `products`/`services` schema change** — `item_type` and `metadata` already exist.
- **Existing shop data untouched:** the shop code path does **not** start filtering by `item_type`. Only NGO queries filter by kind (`program`/`campaign`). `getVertical` defaults everything unknown to `shop`. (See §3.2 chosen approach (a).)
- **Flipping a store to NGO** (this spec): set `stores.type='ngo'` directly via SQL/superadmin, create `program`/`campaign` items with the right `item_type` + `metadata`, and set mission/impact in `settings`. A polished admin UI for this is Deliverable B.
- Orders: donation tag goes in existing order `metadata` (confirm exact field in plan) — no new table, existing sale orders unaffected.

---

## 8. Testing

- **Unit:** `getVertical` mapping (shop, ngo, unknown→shop); resolver family selection (ngo→ngo-classic, legacy→classic).
- **Rendering:** NGO `StoreFront` renders its sections given a store + programs + campaigns; shop `StoreFront` renders unchanged (regression).
- **Data loader:** ngo store fetches only program/campaign kinds; shop store fetch unchanged.
- **Donation flow:** amount entry → checkout payload has donor amount + donation tag; server records order tagged as donation; each payment provider path still reachable.
- **Manual smoke:** flip a test store to `type='ngo'`, seed a program + a campaign, load the storefront, complete one donation via M-Pesa sandbox.

---

## 9. Out of Scope (this spec)

- Merchant admin: vertical picker in onboarding/`createStoreForUser`, relabeled item editors, storefront editor changes (→ **Deliverable B**).
- Portfolio and other verticals (the seam supports them; not built here).
- Recurring/anonymous/dedication donation features beyond a single one-off gift (deferred).
- Multiple theme variants per family (one per family for now).

---

## 10. Open Items for the Plan

1. Exact generalized `StoreFrontProps` shape (keep `classic` untouched; add vertical-scoped payload for ngo).
2. Confirm orders schema field used for the donation tag.
3. Confirm NGO campaign detail routing (recommendation: reuse `/[product-slug]` segment).
4. Precise list of `classic` primitives to extract into `shared/` and how entangled they are.
