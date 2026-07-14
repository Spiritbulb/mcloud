# Storefront Pages & Sections Data Model (Sub-project 2)

**Date:** 2026-07-01
**Status:** Design approved, ready for implementation plan
**Depends on:** Sub-project 1 (Liquid render pipeline) — DONE on branch `feat/storefront-liquid-pipeline`. This sub-project builds on the same branch.

---

## 0. Context: where this sits

North star (unchanged): Liquid is the storefront rendering layer for every vertical; sites are **pages** made of **sections** (data, not React routes); commerce routes stay bespoke; React `classic` retired at the end.

Sub-project 1 shipped: a shared `@mcloud/liquid` package renders the shop **home** from a hardcoded template key (`classic/templates/index`) at parity, with a React fallback.

**Sub-project 2 (this spec):** make **pages data**. A store gets a `pages` table; each page is an ordered list of section types. The storefront renders a page by looping its sections and rendering each repo section template. This unlocks multiple, user-orderable pages per store (the foundation for per-vertical page sets and, later, an editor). **Sections remain trusted repo `.liquid` files** — no user-authored markup yet, so the security carry-forwards (`img_tag` escaping, URL-scheme sanitization) stay dormant until a later sub-project.

Ordered decomposition: 1) render pipeline (DONE) · **2) pages+sections data model (THIS)** · 3) per-vertical default page sets · 4) NGO donations · 5) page editor · 6) retire React.

---

## 1. Goal

Introduce a `pages` data model and render pages from it:
- A `pages` table: store → N pages (slug, title, position, published, ordered `sections` JSON).
- The storefront home renders from the store's `slug=''` page when present, else a hardcoded default section list that reproduces today's home **byte-for-byte** (no backfill of the 19 existing stores).
- Non-home content pages are served by falling through the existing product route: unmatched product slug → published page with that slug → else 404.
- Rendering loops a page's `sections` array, rendering each section type as a repo `.liquid` file and concatenating.

**Non-goals (later sub-projects):** per-vertical seeding (SP3), NGO/donations (SP4), a page/section editor UI (SP5), user-authored section markup or per-section settings actually driving output (the `settings` field exists but is inert this sub-project), retiring React (SP6).

---

## 2. Current State (grounding)

- `apps/storefront/app/store/[slug]/page.tsx` (home) fetches store/products/collections/featured and calls `renderTemplate('classic/templates/index', buildHomeContext(...))`, injecting into `<div data-liquid suppressHydrationWarning dangerouslySetInnerHTML>`, with a React `<StoreFront>` fallback on error. (Sub-project 1.)
- `@mcloud/liquid` exposes `renderTemplate(key, context)`; templates are repo files under `packages/liquid/themes/classic/`, compiled to a committed manifest. Auto-escaping is on.
- Section files today: `sections/hero.liquid`, `sections/collections-grid.liquid`, `sections/featured-products.liquid`, and `sections/product-card.liquid` (a sub-partial rendered *inside* grids). The **all-products grid is inline in `templates/index.liquid`**, not a standalone section.
- Routes under `[slug]/`: `[product-slug]` (product detail — a catch-all-ish dynamic segment), plus `products`, `cart`, `blog`, `services`, `account`, `settings`. A path like `/store/x/about` currently resolves through `[product-slug]` as a product lookup.
- No `pages` table exists. 19 live stores, all `type='shop'`.

---

## 3. Architecture

### 3.1 `pages` table

```sql
create table pages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  slug text not null,                 -- '' = home; 'about', 'programs', ...
  title text not null,
  position int not null default 0,    -- ordering for nav/listings
  is_published boolean not null default true,
  sections jsonb not null default '[]'::jsonb,  -- ordered [{ type, settings }]
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (store_id, slug)
);
create index pages_store_published_idx on pages (store_id, is_published);
```

`sections` shape: `[{ "type": "hero", "settings": {} }, { "type": "all-products", "settings": {} }]`. `settings` is reserved for the future editor (per-section config); **inert this sub-project** — sections read from the render context as they do today. RLS/access: reads go through the storefront's service-role client (same as products/collections today — the storefront already reads store data server-side); no anon table access is added. Writes are out of scope (no editor yet); rows are created manually/by SP3 seeding.

### 3.2 Section registry (storefront-side)

A registry in `apps/storefront/lib/sections.ts` maps a section `type` → (a) its repo template key and (b) which slice of the render context it needs. It lives storefront-side because it encodes storefront data knowledge (products, collections); `@mcloud/liquid` stays a dumb renderer.

```ts
type SectionType = 'hero' | 'collections' | 'featured' | 'all-products'

interface SectionDef {
  templateKey: string  // e.g. 'classic/sections/hero'
  // pick the context this section needs from the full page context
  pickContext: (ctx: PageRenderContext) => Record<string, unknown>
}

const SECTION_REGISTRY: Record<SectionType, SectionDef>
```

- `hero` → `classic/sections/hero`, needs `{ store }`
- `collections` → `classic/sections/collections-grid`, needs `{ store, collections }`
- `featured` → `classic/sections/featured-products`, needs `{ store, products: featuredProducts }`
- `all-products` → `classic/sections/all-products`, needs `{ store, products }`

A section entry whose `type` is not in the registry is **skipped** (logged), never throws.

### 3.3 Extract the all-products grid into a section

Create `packages/liquid/themes/classic/sections/all-products.liquid` containing the "All Products" `<section id="products">` block currently inline in `templates/index.liquid` (including its empty-state and the product-card loop + the scroll-fade `<script>`), behavior-identical. This makes all four page-level sections independently renderable — required for the loop-and-concat renderer.

### 3.4 Page renderer

`apps/storefront/lib/render-page.ts`:

```ts
async function renderPage(sections: PageSection[], ctx: PageRenderContext): Promise<string> {
  let html = ''
  for (const s of sections) {
    const def = SECTION_REGISTRY[s.type as SectionType]
    if (!def) { console.warn(`[storefront] unknown section type: ${s.type}`); continue }
    html += await renderTemplate(def.templateKey, { ...def.pickContext(ctx), settings: s.settings ?? {} })
  }
  return html
}
```

The current `templates/index.liquid` wrapper markup (the outer `<div class="min-h-screen">` and the `max-w-6xl` container around collections/featured) is reproduced structurally: the renderer wraps the concatenated section HTML in the same outer `<div class="min-h-screen">`. (The inner max-width container was cosmetic grouping; sections carry their own containers — verified during the all-products extraction and the parity test guards it.)

`templates/index.liquid` is then **deleted** — the default section list is the single source of truth for the home composition.

### 3.5 Home route

`[slug]/page.tsx`: after loading the store + data, look up the store's page `slug=''` (published). If found, `renderPage(page.sections, ctx)`. If not found, use `DEFAULT_HOME_SECTIONS = ['hero','collections','featured','all-products']` (as `[{type},...]`). Either way, inject into the existing `data-liquid` container; keep the React fallback on render error. Result for the 19 existing (page-less) stores is byte-identical to today.

### 3.6 Content-page route

Extend `[slug]/[product-slug]/page.tsx`: the existing product lookup runs first. If **no product** matches the slug, look up a **published** `pages` row with that slug for the store; if found, build the page context and `renderPage` it into the `data-liquid` container (same layout as home); else `notFound()`. Products always win a slug tie — no existing product URL changes. (The page's own detail-client React path is only used for products; a content page renders the Liquid HTML directly like the home route.)

---

## 4. Components / Units

| Unit | Location | Responsibility | Depends on |
|---|---|---|---|
| `pages` table + migration | Supabase | Store's pages + ordered sections | — |
| generated DB types | `packages/db/src/database.types.ts` | `pages` row types | migration |
| `all-products.liquid` | `packages/liquid/themes/classic/sections/` | All-products grid as a standalone section | — |
| section registry | `apps/storefront/lib/sections.ts` | type → template key + context slice; safe skip on unknown | `@mcloud/liquid` keys |
| `renderPage` | `apps/storefront/lib/render-page.ts` | Loop sections → concat HTML | registry, `renderTemplate` |
| page lookup helpers | `apps/storefront/lib/pages.ts` | Fetch a published page by (store, slug); DEFAULT_HOME_SECTIONS | `@mcloud/db` |
| home route | `apps/storefront/app/store/[slug]/page.tsx` | Home page-or-default → renderPage | pages helpers, renderPage |
| content-page route | `apps/storefront/app/store/[slug]/[product-slug]/page.tsx` | Product-miss → published page → 404 | pages helpers, renderPage |

---

## 5. Data Flow

**Home:** `GET /store/{slug}` → load store+data → `getPage(store.id,'')` → sections (row or DEFAULT_HOME_SECTIONS) → `renderPage(sections, ctx)` → inject `data-liquid` → React fallback on error.

**Content page:** `GET /store/{slug}/{path}` → product lookup by `path` → if product, existing product render; else `getPublishedPage(store.id, path)` → if page, `renderPage(page.sections, ctx)` inject `data-liquid`; else 404.

---

## 6. Error Handling

- Unknown section `type` → skipped + logged; rest of page renders.
- `renderPage` throw on home → existing React `<StoreFront>` fallback. On a content page → `notFound()` (no React equivalent to fall back to; a broken content page 404s rather than shells).
- Empty `sections` array → empty body (valid, e.g. a deliberately blank page).
- Unpublished page (`is_published=false`) → treated as not found (product route 404s).
- Missing store → existing `notFound()`.

## 7. Migration & Backwards Compatibility

- **New `pages` table only**; no change to `stores`/`products`. `on delete cascade` from stores.
- **No backfill** — page-less stores render via `DEFAULT_HOME_SECTIONS`, byte-parity with today. The 19 live stores are untouched and unchanged.
- Deleting `templates/index.liquid` is safe: home no longer resolves a template file; the default section list reproduces its output (guarded by the parity test in §8).
- Existing product URLs unaffected (products win slug ties).
- Regenerate `packages/db/src/database.types.ts` after the migration.

## 8. Testing

- **`all-products.liquid` parity:** render the new section with a fixture (2 products) and assert it contains the same grid markup + empty-state + product names as the old inline block. Guards the extraction.
- **`renderPage` unit:** given `['hero','all-products']` + fixture ctx, output contains hero markup and product names, in order; an unknown type (`'bogus'`) is skipped (not present, no throw).
- **Section registry:** each known type maps to an existing template key; `pickContext` returns the expected keys.
- **Home default vs row:** with no page row, home output equals the sub-project-1 home output (parity — reuse the SP1 fixture/manual shot). With a `slug=''` row whose sections reorder (e.g. featured before collections), output order changes accordingly.
- **Content-page routing (manual smoke):** create a test `pages` row `{slug:'about', sections:[{type:'hero'}]}` for a store; `/store/<slug>/about` renders it; an existing product slug still resolves to the product; a random slug 404s. Home still renders unchanged.
- Tests are `npx tsx` scripts (repo convention); routing verified via the running app (`run-mcloud`).

## 9. Out of Scope (this sub-project)

- Per-vertical default page seeding (SP3) — this sub-project only has the shop's DEFAULT_HOME_SECTIONS fallback.
- NGO sections/donations (SP4).
- Page/section **editor** and any write path (SP5). Rows are created by migration/manual SQL for testing.
- `settings` per-section actually affecting render output (reserved field, inert now).
- User-authored section markup; the `img_tag`/URL-scheme security items remain dormant.
- Nav auto-generation from pages (a page has `position`/`title` for it, but wiring nav to the pages list is deferred).

## 10. Open Items for the Plan

1. Confirm the exact outer-wrapper markup `renderPage` must emit so home stays byte-parity (compare against `index.liquid`'s `<div class="min-h-screen">` + inner container). The plan pins this from the file and the parity test enforces it.
2. Confirm the content-page route can render Liquid HTML directly without the product detail-client React wrapper interfering (the product path is a separate branch; a page returns the `data-liquid` div like home).
3. Confirm the storefront's DB client can read `pages` server-side with the same access pattern as products/collections (service-role/server client) — no new anon exposure.
