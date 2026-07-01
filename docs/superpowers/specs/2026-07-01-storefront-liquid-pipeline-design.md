# Storefront Liquid Render Pipeline (Sub-project 1)

**Date:** 2026-07-01
**Status:** Design in review
**Supersedes:** the rendering approach in `2026-07-01-storefront-verticals-ngo-design.md` (React NGO theme). That spec's donation-endpoint idea survives and moves to a later sub-project; its React-theme approach is abandoned.

---

## 0. Context: the bigger picture (why this sub-project exists)

**North star (decided with the user):** Liquid becomes THE storefront rendering layer for every vertical (shop, NGO, portfolio, …). Sites are **templates (pages)** composed of **sections** — all Liquid text, i.e. *data*, not React routes — so any vertical/user can define any number of pages. Commerce routes (cart/checkout/product detail) stay bespoke. The React `@mcloud/themes/classic` is retired at the end.

The full effort decomposes into ordered sub-projects:
1. **Liquid render pipeline in the storefront** — render the shop home from Liquid at visual parity with today's React theme. **← THIS SPEC.**
2. Pages & sections data model (templates/pages become user-created data).
3. Per-vertical default template sets (shop, ngo).
4. NGO donations (campaign section + `/donate` endpoint).
5. Page editor (merchant admin).
6. Retire React `classic`.

This spec is **only sub-project 1**. It proves the engine end-to-end on the *existing* shop vertical, from repo-file templates, before any data model, vertical, or donation work. Success is invisible to end users: the shop home looks the same, but it's rendered by Liquid.

---

## 1. Goal

Render the storefront **home page** (`/store/[slug]`) via the Liquid engine instead of the React `@mcloud/themes/classic` StoreFront, at visual + behavioral parity with today, for shop stores. No end-user-visible change; this swaps the rendering mechanism and establishes the pipeline everything else builds on.

Explicit non-goal: changing any other route (products, product detail, cart, blog, services stay React for now), building a data model for pages, or supporting NGO. Those are later sub-projects.

---

## 2. Current State (grounding)

**The storefront (`apps/storefront`) today:**
- `app/store/[slug]/page.tsx` fetches `store`, `products`, `collections`, `featuredProducts` (from a `featured` collection), `services`, and review aggregates, then renders `<StoreFront>` via `resolveTheme(themeId)` → React `@mcloud/themes/classic/StoreFront`.
- `app/store/[slug]/layout.tsx` + `components/store/layout-wrapper.tsx` wrap every page with `StoreNav`, `StoreFooter`, `CartIsland`, `WishlistIsland`, set the `--sf-*` CSS variables from the `store_themes` row, and already include a **`LiquidScriptRunner`** that re-executes `<script>` tags inside a `[data-liquid]` container after render. The storefront was already built anticipating injected Liquid HTML.

**The Liquid system (lives in `apps/web`, NOT wired to the storefront):**
- `apps/web/lib/liquid.ts` — a `liquidjs` `Liquid` engine configured with an **in-memory filesystem** backed by a compiled manifest, plus Shopify-style filters: `money`, `date_format`, `reading_time`, `img_tag`.
- `apps/web/src/liquid-themes/classic/` — `templates/index.liquid` (full shop home: hero + collections + featured + product grid), `templates/products.liquid`, and `sections/{hero, featured-products, collections-grid, product-card}.liquid`. These already mirror the React classic home and reference `store`, `collections`, `featuredProducts`, `products`, and `store.settings.heroSlides`.
- `apps/web/scripts/generate-theme-manifest.ts` (and `.mjs`) — globs `src/liquid-themes/**/*.liquid` into `src/lib/theme-manifest.ts` (`themeFiles: Record<string,string>`), run via `apps/web`'s `prebuild`.
- `liquidjs@^10.25.2` is a dependency of `apps/web` only.
- Templates emit `/store/{{ store.slug }}/...` links, `sf-*` classes/CSS-vars, and `<script>` blocks. `{% raw %}` is used around SVG paths that contain `{`.

**Data-shape note:** the Liquid templates already assume the exact objects `page.tsx` already builds (`store.settings.heroSlides`, `collection.image_url`, `product.images`, `product.price`, etc.). So the render *context* is essentially what `page.tsx` already has in hand.

---

## 3. Architecture

### 3.1 Extract Liquid into a shared package `@mcloud/liquid`

The engine and templates currently sit in `apps/web` but must be used by `apps/storefront` (and later the editor). Create a workspace package `packages/liquid` (`@mcloud/liquid`) that owns:
- `liquidjs` as a dependency + the engine factory (ported from `apps/web/lib/liquid.ts`), including the custom filters.
- The `.liquid` theme sources (moved from `apps/web/src/liquid-themes/` to `packages/liquid/themes/`).
- The manifest generation (ported from the generate script) producing an importable `themeFiles` map inside the package, so consumers import compiled templates with no disk access at runtime (matches the existing in-memory-FS design).
- A single public API: `renderTemplate(templateKey, context) => Promise<string>`.

`apps/web`'s existing `lib/liquid.ts` and `src/liquid-themes/` are replaced by re-exports/imports from `@mcloud/liquid` so there is one engine and one template set (DRY). `apps/web`'s `prebuild` manifest step is removed in favor of the package's build step.

**Why a package, not copy into storefront:** the north star has both the storefront (render) and the web app (editor/preview) using the same engine + templates. Two copies would diverge immediately. This is the DRY boundary the whole effort needs.

### 3.2 Render context builder

A pure function in the storefront maps the data `page.tsx` already fetches into the plain-object context the templates expect:

```
buildHomeContext({ store, products, collections, featuredProducts }) => {
  store: { id, name, slug, description, logo_url, currency, settings },
  products: [...], collections: [...], featuredProducts: [...]
}
```

This is deliberately the *same* shape the React path uses, so the templates (which were authored against it) render unchanged. It lives beside `page.tsx` (e.g. `lib/liquid-context.ts`) and is unit-testable in isolation.

### 3.3 Rendering in the page

`app/store/[slug]/page.tsx` changes so that, for the home route:
1. Fetch data (unchanged).
2. Build the context (§3.2).
3. `const html = await renderTemplate('classic/templates/index', context)`.
4. Return the HTML into the existing `[data-liquid]` container so `LiquidScriptRunner` activates the embedded scripts:
   `<div data-liquid dangerouslySetInnerHTML={{ __html: html }} />`.

The React `StoreFront` import/branch for the home is removed. `resolveTheme` and the React `classic` theme remain in place for the *other* routes (products/detail/cart/blog/services) — untouched this sub-project.

**Template selection:** hardcoded to `classic/templates/index` for now. Which template renders a given page becomes data in sub-project 2; this sub-project does not build that indirection (YAGNI).

### 3.4 Security: Liquid output is trusted-authored, but escape data

Templates are authored by us (repo files), so rendering them is safe. Liquid auto-escapes `{{ variable }}` output by default, so store/product data interpolated into templates is HTML-escaped — a product named `<script>` renders as text, not markup. We rely on Liquid's default escaping and do NOT disable it. The only executable `<script>` blocks are the static ones authored in the templates themselves (carousel, scroll observer), which `LiquidScriptRunner` already runs. No user-supplied HTML is rendered as markup in this sub-project.

### 3.5 Rendering cost & caching

`renderTemplate` runs server-side per request. The page already sets `export const revalidate = 60`, so rendered output is covered by Next's route cache exactly as today. The engine uses `cache: true` in production for parsed templates (matching the existing config). No new caching layer.

---

## 4. Components / Units

| Unit | Location | Responsibility | Depends on |
|---|---|---|---|
| `@mcloud/liquid` engine | `packages/liquid/src/engine.ts` | Configured liquidjs engine + custom filters + in-memory FS | `liquidjs`, compiled manifest |
| `.liquid` themes | `packages/liquid/themes/classic/**` | Template + section sources (moved from apps/web) | — |
| manifest build | `packages/liquid/scripts/build-manifest.*` | Compile `.liquid` → `themeFiles` map | `glob` |
| `renderTemplate` | `packages/liquid/src/index.ts` | Public API: `(key, ctx) => Promise<string>` | engine |
| context builder | `apps/storefront/lib/liquid-context.ts` | Map fetched data → template context | theme types |
| home render | `apps/storefront/app/store/[slug]/page.tsx` | Fetch → build ctx → render → inject HTML | `@mcloud/liquid`, context builder |
| web re-wire | `apps/web/lib/liquid.ts`, `src/liquid-themes/` | Re-point web to `@mcloud/liquid`; drop dup manifest step | `@mcloud/liquid` |

---

## 5. Data Flow

`GET /store/{slug}` (home) → fetch store/products/collections/featured (unchanged) → `buildHomeContext(...)` → `renderTemplate('classic/templates/index', ctx)` → HTML string → `<div data-liquid dangerouslySetInnerHTML>` → `LiquidScriptRunner` activates carousel/observer scripts. `LayoutWrapper` still supplies nav/footer/cart/CSS-vars around it.

---

## 6. Error Handling

- **Missing template / render throw:** `renderTemplate` errors are caught in `page.tsx`; on failure, fall back to rendering the existing React `classic` StoreFront so a template bug cannot take a live store down. Log the error server-side. (This fallback is a sub-project-1 safety net; once Liquid is proven and React is retired in sub-project 6, the fallback goes away.)
- **Empty data:** templates already guard `products.size > 0` etc., matching the React empty states.
- **Escaping:** relies on Liquid default auto-escape (§3.4).

---

## 7. Migration & Backwards Compatibility

- **No schema change.** Uses the same data `page.tsx` already fetches.
- **No visual change** for the 19 live shop stores — parity with the React home is the acceptance bar.
- `apps/web` keeps working: its `lib/liquid.ts` becomes a thin re-export of `@mcloud/liquid`; the `src/liquid-themes/` sources move into the package; the `prebuild` manifest step is removed (the package handles it). Any current `apps/web` importer of `engine`/`themeFiles` is updated to the package API. (Grep shows `lib/liquid.ts` is currently imported nowhere else, so blast radius is minimal.)
- Other storefront routes unchanged (still React).

---

## 8. Testing

- **Unit (`renderTemplate`):** render `classic/templates/index` with a fixture context (a store with 2 products, 1 collection, 1 featured) → assert the HTML contains the product names, the collection name, and the hero title; assert an XSS attempt in a product name is escaped (`&lt;script&gt;`). Run via `npx tsx` (repo has no test framework — matches existing convention).
- **Unit (context builder):** `buildHomeContext` maps a raw fetched shape to the template context with the right keys and defaults.
- **Build:** `turbo run build --filter=@mcloud/liquid --filter=storefront --filter=@mcloud/web` all green.
- **Manual parity smoke:** run the storefront (`run-mcloud` skill), open a real shop store home, and compare against the current React render — hero (incl. multi-slide carousel), collections filter pills, featured grid, product grid, empty states, in-store links, and the fade-in scroll animation all work. Confirm `apps/web` still builds and boots.

---

## 9. Out of Scope (this sub-project)

- Pages/sections **data model** — templates are repo files here (sub-project 2).
- Template **selection indirection** — home is hardcoded to `classic/templates/index` (sub-project 2).
- **NGO / verticals / donations** (sub-projects 3–4).
- Migrating products/detail/cart/blog/services routes to Liquid (later; sub-project 6 retires React).
- Page **editor** (sub-project 5).

---

## 10. Open Items for the Plan

1. Exact package build mechanism for the manifest: a prebuilt committed `manifest.ts`, a `tsup`/`tsc` build step, or a tiny generate script run in the package's `build`/`prebuild`. Plan picks the one matching how other `packages/*` build (check `packages/themes`, `packages/ui`).
2. Confirm no other `apps/web` module imports `engine`/`themeFiles` beyond `lib/liquid.ts` (grep says none; plan re-verifies before moving files).
3. Whether the render context needs `services`/reviews for the home template (current `index.liquid` does not reference them; confirm and omit if unused — YAGNI).
