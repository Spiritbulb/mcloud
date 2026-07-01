# Per-Vertical Default Template Sets (Sub-project 3)

**Date:** 2026-07-01
**Status:** Design approved, ready for implementation plan
**Depends on:** SP1 (Liquid pipeline) + SP2 (pages & sections data model) — both DONE on branch `feat/storefront-liquid-pipeline`. This sub-project continues the same branch.

---

## 0. Context

North star: Liquid renders every vertical; sites are pages made of sections (data); commerce routes stay bespoke; React `classic` retired at the end. SP2 made pages data (a `pages` table + section-list renderer + storefront section registry; home falls back to a default section list when no row exists).

**SP3 (this spec):** introduce the **vertical** concept keyed by `stores.type`, seed a vertical's **default page set** when a store is created, and author the **NGO section templates** so an NGO store renders a real, informational NGO home (mission / programs / impact / contact). Donations/campaigns are SP4.

Ordered decomposition: 1) render pipeline (DONE) · 2) pages+sections data model (DONE) · **3) per-vertical default template sets (THIS)** · 4) NGO donations · 5) page editor (admin; the write path) · 6) retire React.

**Access note:** all `pages`/`stores` access is via the server-side service-role client, per the platform-wide `route_everything_no_anon` decision. SP3 adds no anon table access; `pages` RLS is not an SP3 concern (anon cleanup is its own future pass).

---

## 1. Goal

- A shared `@mcloud/verticals` package: descriptors keyed by `stores.type` (`shop`, `ngo`), each with a **default page set**.
- Four new NGO Liquid section templates (mission, programs, impact, contact), styled with the existing `sf-*` system, reading content from `stores.settings`, guarded on empty (SP2 pattern).
- The storefront section registry + home fallback become **vertical-aware**: an NGO store with no page row renders the NGO home; shop stores unchanged.
- `createStoreForUser` accepts an optional validated `type` (default `shop`), sets it on the store, and **seeds the vertical's default pages** as `pages` rows (best-effort). No onboarding UI (SP5). No backfill of the 19 existing stores.

**Non-goals:** donations/campaigns (SP4), onboarding vertical picker / any admin UI (SP5), NGO-specific DB tables (content lives in `stores.settings`), editing seeded pages (no write path yet).

---

## 2. Current State (grounding)

- `stores.type` exists (TEXT, default `'shop'`; all live stores `'shop'`). `stores.settings` is freeform JSON already used by the shop hero (`heroSlides`, `socialLinks`, etc.).
- `apps/storefront/lib/sections.ts` (SP2): `SectionType = 'hero'|'collections'|'featured'|'all-products'`, `SECTION_REGISTRY` (type → `{templateKey, pickContext}`), `DEFAULT_HOME_SECTIONS`. The registry passes `store` (incl. `.settings`) into each section — so sections read `store.settings.*` in Liquid (the shop hero already does this).
- `apps/storefront/app/store/[slug]/page.tsx` (SP2): home renders `getPublishedPage(store.id,'')?.sections ?? DEFAULT_HOME_SECTIONS` via `renderPage`, in a `data-liquid` container, React fallback on error.
- Section `.liquid` files: `hero`, `collections-grid`, `featured-products`, `all-products`, `product-card`. collections/featured/all-products are empty-guarded (SP2 fix). No NGO sections exist.
- `apps/web/lib/merchant/stores.ts` → `createStoreForUser({orgId, name, slug}, userId)`: inserts a store (does NOT set `type` → DB default `shop`) + an owner `store_members` row. Framework-agnostic (used by web action + mobile API).
- No live `getVertical`/`VERTICALS` code (only in the superseded React-NGO docs).
- `@mcloud/liquid` and other `packages/*` are raw-TS-source packages (no build step), consumed via `exports`.

---

## 3. Architecture

### 3.1 `@mcloud/verticals` package

New workspace package `packages/verticals` (`@mcloud/verticals`), raw-TS-source (mirrors `@mcloud/liquid`: `exports` → `./src/index.ts`, no build step).

```ts
export type VerticalId = 'shop' | 'ngo'

export interface SeedSection { type: string }   // names a section type (mapped to a template by the storefront registry)
export interface SeedPage {
  slug: string                                   // '' = home
  title: string
  position: number
  sections: SeedSection[]
}
export interface Vertical {
  id: VerticalId
  label: string                                  // 'Shop' | 'NGO'
  defaultPages: SeedPage[]
}

export const VERTICALS: Record<VerticalId, Vertical> = {
  shop: { id: 'shop', label: 'Shop', defaultPages: [
    { slug: '', title: 'Home', position: 0, sections: [
      { type: 'hero' }, { type: 'collections' }, { type: 'featured' }, { type: 'all-products' } ] } ] },
  ngo: { id: 'ngo', label: 'NGO', defaultPages: [
    { slug: '', title: 'Home', position: 0, sections: [
      { type: 'mission' }, { type: 'programs' }, { type: 'impact' }, { type: 'contact' } ] } ] },
}

export function getVertical(type: string | null | undefined): Vertical   // unknown/null → VERTICALS.shop
export function isVerticalId(type: string): type is VerticalId
```

Consumed by **apps/web** (seed pages on create; validate the `type` param) and **apps/storefront** (vertical-aware home fallback). The section `type → templateKey` mapping is NOT here — it stays in the storefront registry (§3.3). Verticals only *name* section types, keeping this package free of Liquid/template knowledge.

### 3.2 NGO section templates (4 new)

New files under `packages/liquid/themes/classic/sections/`, styled with the existing `sf-*` CSS vars, reading from `store.settings`, each **self-contained** (own container) and **empty-guarded** (SP2 pattern — emit nothing when their data is absent), except `mission` which always renders:

- **`mission.liquid`** — identity band (hero-like but non-commerce: no carousel, no "Shop now"). Renders `settings.mission` (a statement) under a headline. **Always renders** — falls back to `store.name` + `store.description` when `settings.mission` is absent, so an NGO home is never headerless (mirrors how the shop hero falls back to store name).
- **`programs.liquid`** — grid of `settings.programs = [{ title, description, image }]`. Guard: `{% if settings.programs and settings.programs.size > 0 %}`.
- **`impact.liquid`** — stat row of `settings.impactStats = [{ label, value }]` (e.g. value "5,000", label "People served"). Guard: `size > 0`.
- **`contact.liquid`** — contact block from `settings.contact = { email, phone, address }`, plus reuse `settings.socialLinks`. Guard: renders only if at least one contact field or a social link is present.

All data comes from `stores.settings` (JSON) — no new tables. All values interpolated with Liquid auto-escaping (on since SP1). The dormant `img_tag`/URL-scheme carry-forwards stay dormant (these sections use plain `{{ }}` for text and `<img src="{{ ... }}">` for settings-provided image URLs authored by the store owner via settings, not untrusted end users — same trust level as the shop hero image today).

### 3.3 Vertical-aware storefront registry + fallback

`apps/storefront/lib/sections.ts`:
- Extend `SectionType` to include `'mission' | 'programs' | 'impact' | 'contact'`.
- Add four `SECTION_REGISTRY` entries, each `templateKey: 'classic/sections/<name>'`, `pickContext: (ctx) => ({ store: ctx.store })` (they read `store.settings`).
- Replace the constant `DEFAULT_HOME_SECTIONS` with a function `defaultHomeSections(storeType?: string | null): PageSection[]` that returns the Home page's sections from `getVertical(storeType).defaultPages` (the page with `slug === ''`). Keep a `DEFAULT_HOME_SECTIONS` export = `defaultHomeSections('shop')` if any other caller relies on the constant (grep; there is one caller — the home route — which switches to the function).

`apps/storefront/app/store/[slug]/page.tsx`: the fallback becomes `defaultHomeSections(store.type)` instead of the constant. Effect: an NGO store with no seeded row still renders the NGO home; shop stores unchanged (the 19 legacy stores render exactly as today).

### 3.4 Seeding at store creation

`apps/web/lib/merchant/stores.ts` → `createStoreForUser`:
- Signature gains optional `type`: `createStoreForUser({ orgId, name, slug, type? }, userId)`. Validate with `isVerticalId`; default `'shop'`. Set `type` on the store insert.
- After the store + owner `store_members` insert succeed, insert the vertical's default pages: for each `SeedPage` in `getVertical(type).defaultPages`, insert a `pages` row `{ store_id, slug, title, position, is_published: true, sections }`.
- **Best-effort:** if the page-seed insert errors, log it and still return success (the store exists; the storefront's vertical-aware fallback (§3.3) renders the correct default anyway). Seeding must never block store creation.
- Callers: the web server action and the mobile store-create API call `createStoreForUser`. They pass no `type` today → default `shop` → behavior unchanged for existing callers. NGO stores are created by passing `type: 'ngo'` (a tooling/test call for now; the onboarding picker is SP5).

---

## 4. Components / Units

| Unit | Location | Responsibility | Depends on |
|---|---|---|---|
| `@mcloud/verticals` | `packages/verticals/src/index.ts` | Vertical descriptors + default page sets; `getVertical`/`isVerticalId` | — |
| mission/programs/impact/contact | `packages/liquid/themes/classic/sections/*.liquid` | NGO section templates reading `store.settings`, empty-guarded | `sf-*` CSS |
| registry + fallback | `apps/storefront/lib/sections.ts` | NGO section types in registry; `defaultHomeSections(type)` | `@mcloud/verticals` |
| home route | `apps/storefront/app/store/[slug]/page.tsx` | Vertical-aware fallback | `defaultHomeSections` |
| seeding | `apps/web/lib/merchant/stores.ts` | Accept+validate `type`, set on store, seed default pages (best-effort) | `@mcloud/verticals` |

---

## 5. Data Flow

**Create NGO store:** `createStoreForUser({..., type:'ngo'})` → insert store `{type:'ngo'}` → insert owner member → insert `pages` rows from `VERTICALS.ngo.defaultPages` (best-effort) → store ready.

**Render NGO home:** `GET /store/{slug}` → `getPublishedPage(id,'')` → row (seeded) → `renderPage([mission,programs,impact,contact], ctx)` where ctx.store carries `.settings` → sections read `settings.mission/programs/impactStats/contact`, empty-guarded → HTML in `data-liquid` div. If no row (e.g. an existing store flipped to `ngo` without seeding), `defaultHomeSections('ngo')` yields the same section list.

**Render shop home:** unchanged from SP2 — seeded shop rows or `defaultHomeSections('shop')`.

## 6. Error Handling

- `getVertical`/`isVerticalId` never throw; unknown/null type → shop.
- Seeding is best-effort: page-insert failure is logged, store creation still succeeds; fallback covers rendering.
- NGO sections empty-guard on missing settings (programs/impact/contact render nothing); mission always renders (store name/description fallback).
- Invalid `type` passed to `createStoreForUser` → coerced to `shop` (via `isVerticalId` check), not an error.

## 7. Migration & Backwards Compatibility

- **No schema change.** Uses existing `stores.type`, `stores.settings`, and the SP2 `pages` table.
- **No backfill.** Existing 19 shop stores have no `pages` rows and render via `defaultHomeSections('shop')` = today's home. Untouched.
- Existing `createStoreForUser` callers (web action, mobile API) pass no `type` → default `shop` → seed a shop Home page for NEW stores (a behavior addition: new shop stores now get an explicit editable Home row, but it renders identically to the fallback, so no visible change).
- New `@mcloud/verticals` dep added to `apps/web` and `apps/storefront`.

## 8. Testing

- **`getVertical`/`isVerticalId`** (`@mcloud/verticals` tsx test): shop/ngo/unknown→shop; `defaultPages` shapes.
- **`defaultHomeSections(type)`** (storefront tsx test): ngo→`[mission,programs,impact,contact]`, shop→`[hero,collections,featured,all-products]`, unknown→shop set.
- **NGO section parity/guard** (liquid tsx test): each of mission/programs/impact/contact renders expected markup given fixture `store.settings`; programs/impact/contact render nothing when their settings are empty; mission renders store name when `settings.mission` absent.
- **Registry**: the 4 NGO types map to existing template keys; `pickContext` returns `{store}`.
- **Seeding** (unit against the seed logic): given `type:'ngo'`, the rows inserted equal `VERTICALS.ngo.defaultPages` (shape/slug/sections); given `type:'shop'` or omitted, the shop set. Best-effort: a simulated insert error still returns store-created success.
- **Manual smoke:** create an `ngo` store (call `createStoreForUser` with `type:'ngo'`, or seed `type` + settings via SQL for a test store), set `settings.mission/programs/impactStats/contact`, load `/store/<slug>` → NGO home renders the four sections; empty settings → programs/impact/contact suppressed, mission shows store name; a shop store still renders the shop home. Verify against the running app (`run-mcloud`), 0 hydration errors.

## 9. Out of Scope (this sub-project)

- Donations / campaigns / `/donate` (SP4).
- Onboarding vertical picker or any admin UI (SP5).
- NGO-specific DB tables — content is `stores.settings` JSON.
- Editing seeded pages (no write path until SP5).
- Nav generation from pages, multiple NGO pages beyond Home (the seed is Home-only; the model supports more but SP3 seeds one page per vertical).
- Activating per-section `settings` (still inert; NGO content comes from `store.settings`, not per-section settings).

## 10. Open Items for the Plan

1. Confirm the exact `stores` insert in `createStoreForUser` can take `type` (it can — column exists) and that setting it doesn't disturb the returned `select('id, slug')`.
2. Confirm the mobile store-create API path (`apps/web/app/api/mobile/orgs/[orgSlug]/stores/route.ts`) still compiles with the new optional param (it passes no `type`; optional → fine). Plan verifies.
3. Confirm whether any code imports the `DEFAULT_HOME_SECTIONS` constant besides the home route (grep). If only the home route, convert cleanly to `defaultHomeSections`; else keep the constant as `defaultHomeSections('shop')` for back-compat.
4. Pin each NGO section's exact settings keys + markup structure from the shop sections' conventions (so styling is consistent) during authoring; the parity tests lock them.
