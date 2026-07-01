# Storefront Pages & Sections Data Model (Sub-project 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make storefront pages data: a `pages` table (store → N pages, each an ordered list of section types), rendered by looping the section list and rendering each repo `.liquid` section. Home falls back to a default section list at byte-parity (no backfill); content pages are served by product-route fallthrough.

**Architecture:** Sections become self-contained repo `.liquid` files (each owns its own width/container). A storefront-side registry maps a section `type` → its template key + the context slice it needs. `renderPage(sections, ctx)` loops the array, renders each section via `@mcloud/liquid`'s `renderTemplate`, and concatenates inside a single `<div class="min-h-screen">`. The home route uses the store's `slug=''` page if present, else `DEFAULT_HOME_SECTIONS`. Content pages ride the existing `[product-slug]` route: unmatched product slug → published page → else 404.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Supabase (`@mcloud/db`, service-role server client), `@mcloud/liquid`, Turborepo. No unit-test framework — pure-logic units tested via `npx tsx`; UI/routing via build + manual smoke.

## Global Constraints

- **No end-user-visible change to the home page.** The 19 live stores (all page-less) must render home byte-for-byte as today via `DEFAULT_HOME_SECTIONS`. Parity is the acceptance bar. — spec §1, §7.
- **Sections are self-contained after this sub-project:** each section `.liquid` owns its own width/container (`max-w-6xl mx-auto px-12 md:px-0` for collections/featured/all-products; hero is full-width). `renderPage` adds only the outer `<div class="min-h-screen">`. — resolved design decision (was spec §10.1).
- **No user-authored markup.** Sections stay trusted repo files; per-section `settings` is a reserved JSON field, **inert** (does not affect output this sub-project). The `img_tag`/URL-scheme security items stay dormant. — spec §0, §9.
- **Products win slug ties.** Content pages only render when NO product matches the slug; no existing product URL changes. — spec §3.6, §7.
- **No schema change beyond the new `pages` table.** `stores`/`products` untouched; `pages` has `on delete cascade` from stores. Regenerate DB types after migration. — spec §7.
- **DB reads use the storefront server client** (`createClient` from `@mcloud/db/server`, service-role) exactly as the product/home routes already read `stores`/`products` — no new anon table exposure. — spec §3.1, §10.3.
- **Unknown section type is skipped + logged, never throws.** — spec §3.2, §6.
- **`@mcloud/liquid` stays a dumb renderer.** The section registry (which encodes storefront data knowledge) lives in `apps/storefront/lib`. — spec §3.2.
- Reuse sub-project 1's render container + fallback: inject page HTML into `<div data-liquid suppressHydrationWarning dangerouslySetInnerHTML>`; home keeps the React `<StoreFront>` fallback on render error. — spec §3.5.

---

## File Structure

**Create:**
- `packages/liquid/themes/classic/sections/all-products.liquid` — the All-Products grid extracted from `index.liquid` (self-contained, owns `max-w-6xl`).
- `apps/storefront/lib/sections.ts` — `SectionType`, `SECTION_REGISTRY`, `DEFAULT_HOME_SECTIONS` + test.
- `apps/storefront/lib/render-page.ts` — `renderPage(sections, ctx)` + test.
- `apps/storefront/lib/pages.ts` — `getPage` / `getPublishedPage` DB helpers + `PageRow` type.
- Supabase migration for the `pages` table.

**Modify:**
- `packages/liquid/themes/classic/sections/collections-grid.liquid` — add `max-w-6xl mx-auto px-12 md:px-0` wrapper (was supplied by index.liquid).
- `packages/liquid/themes/classic/sections/featured-products.liquid` — same.
- `apps/storefront/app/store/[slug]/page.tsx` — home renders via `renderPage` (page row or default).
- `apps/storefront/app/store/[slug]/[product-slug]/page.tsx` — product-miss → published page → 404.
- `packages/db/src/database.types.ts` — regenerated with `pages`.
- `packages/liquid/src/themes-manifest.ts` — regenerated (new/edited sections).

**Delete:**
- `packages/liquid/themes/classic/templates/index.liquid` — home composition now = `DEFAULT_HOME_SECTIONS`.

---

### Task 1: `pages` table migration + DB types

**Files:**
- Create: Supabase migration (via MCP `apply_migration`, name `create_pages_table`)
- Modify: `packages/db/src/database.types.ts` (regenerate)

**Interfaces:**
- Produces: `pages` table; `Database['public']['Tables']['pages']['Row']` with `{ id, store_id, slug, title, position, is_published, sections, created_at, updated_at }`.

- [ ] **Step 1: Apply the migration**

Apply this SQL to the `commerce` project (`cuptlifacdkeagrrofni`) via Supabase MCP `apply_migration` (name: `create_pages_table`):

```sql
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  slug text not null,
  title text not null,
  position int not null default 0,
  is_published boolean not null default true,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (store_id, slug)
);
create index pages_store_published_idx on public.pages (store_id, is_published);
```

- [ ] **Step 2: Verify the table exists**

Via MCP `list_tables` (or `execute_sql`: `select column_name, data_type from information_schema.columns where table_name='pages' order by ordinal_position;`). Expected: the 9 columns above.

- [ ] **Step 3: Regenerate DB types**

From `apps/web` (it owns the typegen script): `npm run sb-typegen` (runs `supabase gen types typescript --project-id cuptlifacdkeagrrofni > ../../packages/db/src/database.types.ts`).
Expected: `packages/db/src/database.types.ts` now contains a `pages:` table block. Verify: `grep -n "pages:" packages/db/src/database.types.ts` shows a Tables entry.

- [ ] **Step 4: Typecheck db package**

Run: `cd packages/db && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/database.types.ts
git commit -m "feat(db): add pages table (store pages + ordered sections)"
```

---

### Task 2: Extract all-products section; make collections/featured self-contained

**Files:**
- Create: `packages/liquid/themes/classic/sections/all-products.liquid`
- Modify: `packages/liquid/themes/classic/sections/collections-grid.liquid`, `packages/liquid/themes/classic/sections/featured-products.liquid`
- Modify (generated): `packages/liquid/src/themes-manifest.ts`
- Test: `packages/liquid/src/sections-parity.test.ts`

**Interfaces:**
- Produces: manifest keys `classic/sections/all-products`, and updated `collections-grid`/`featured-products` that each carry their own `max-w-6xl mx-auto px-12 md:px-0` container.

- [ ] **Step 1: Write the parity test (failing)**

Create `packages/liquid/src/sections-parity.test.ts`. It renders the new all-products section and asserts the grid + product-card + empty-state markup is present, and that collections/featured now carry the `max-w-6xl` container:

```ts
import assert from 'node:assert/strict'
import { renderTemplate } from './index'

const store = { id: 's', name: 'S', slug: 's', currency: 'KES', settings: {} }
const products = [
  { id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null },
  { id: 'p2', name: 'Beta', slug: 'beta', price: 200, images: [], compare_at_price: null },
]
const collections = [{ id: 'c1', name: 'Coll', slug: 'coll', image_url: null, description: null }]

// all-products: grid + both product names + section id
const ap = await renderTemplate('classic/sections/all-products', { store, products })
assert.ok(ap.includes('id="products"'), 'all-products has #products section')
assert.ok(ap.includes('Browse Everything'), 'all-products heading present')
assert.ok(ap.includes('Alpha') && ap.includes('Beta'), 'all-products renders product cards')

// all-products empty state
const apEmpty = await renderTemplate('classic/sections/all-products', { store, products: [] })
assert.ok(apEmpty.includes('No products yet'), 'all-products empty state')

// collections + featured are now self-contained (own max-w-6xl)
const coll = await renderTemplate('classic/sections/collections-grid', { store, collections })
assert.ok(coll.includes('max-w-6xl'), 'collections-grid carries its own max-w-6xl container')
const feat = await renderTemplate('classic/sections/featured-products', { store, products })
assert.ok(feat.includes('max-w-6xl'), 'featured-products carries its own max-w-6xl container')

console.log('sections-parity.test.ts: all assertions passed')
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/liquid && npx tsx src/sections-parity.test.ts`
Expected: FAIL — `ENOENT` for `classic/sections/all-products` (not created yet).

- [ ] **Step 3: Create `all-products.liquid`**

Create `packages/liquid/themes/classic/sections/all-products.liquid` with the exact block currently inline in `templates/index.liquid` (lines 16–83: the `<section id="products">` through its closing `</section>` PLUS the scroll-fade `<script>`), but with its container already self-contained (it already uses `container mx-auto max-w-6xl px-12 md:px-0`). Copy verbatim:

```liquid
{{- - ALL PRODUCTS - -}}
<section id="products" class="py-12 md:py-20">
  <div class="container mx-auto max-w-6xl px-12 md:px-0">
    <div class="mb-10 md:mb-14">
      <div class="flex items-center gap-4 mb-3">
        <div class="h-px flex-1" style="background-color: var(--sf-border)"></div>
        <span class="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs font-medium">
          All Products
        </span>
        <div class="h-px flex-1" style="background-color: var(--sf-border)"></div>
      </div>
      <h2 class="sf-heading text-3xl md:text-4xl font-light text-center tracking-tight">Browse Everything</h2>
    </div>

    {%- if products and products.size > 0 -%}
      <div
        class="grid gap-4 md:gap-6"
        style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))"
      >
        {%- for product in products -%}
          {%- render 'classic/sections/product-card', store: store, product: product -%}
        {%- endfor -%}
      </div>
    {%- else -%}
      <div class="text-center py-24 space-y-3">
        <svg
          class="mx-auto"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="color: var(--sf-foreground); opacity: 0.2"
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
          <path d="M3 6h18"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p class="text-sm" style="color: var(--sf-foreground-subtle)">No products yet</p>
      </div>
    {%- endif -%}
  </div>
</section>

{{- - SCROLL FADE-IN OBSERVER - -}}
<script>
  (function () {
    var els = document.querySelectorAll('.sf-animate-fadein');
    if (!els.length) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('sf-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  })();
</script>
```

- [ ] **Step 4: Add `max-w-6xl` to collections-grid + featured-products**

In `packages/liquid/themes/classic/sections/collections-grid.liquid`, line 2, change:
`  <div class="container mx-auto">` → `  <div class="container mx-auto max-w-6xl px-12 md:px-0">`

In `packages/liquid/themes/classic/sections/featured-products.liquid`, line 2, make the same change:
`  <div class="container mx-auto">` → `  <div class="container mx-auto max-w-6xl px-12 md:px-0">`

(This moves the width constraint that `index.liquid` used to supply into the sections themselves, so they render at the same width when composed by `renderPage` without an outer wrapper.)

- [ ] **Step 5: Regenerate the manifest**

Run: `cd packages/liquid && node scripts/build-manifest.mjs`
Expected: `Generated themes-manifest with 7 templates.` (was 6; +all-products). `templates/index` still present for now (deleted in Task 4).

- [ ] **Step 6: Run the parity test (passes)**

Run: `cd packages/liquid && npx tsx src/sections-parity.test.ts`
Expected: `sections-parity.test.ts: all assertions passed`

- [ ] **Step 7: Commit**

```bash
git add packages/liquid/themes/classic/sections/all-products.liquid packages/liquid/themes/classic/sections/collections-grid.liquid packages/liquid/themes/classic/sections/featured-products.liquid packages/liquid/src/themes-manifest.ts packages/liquid/src/sections-parity.test.ts
git commit -m "feat(liquid): extract all-products section; make collections/featured self-contained"
```

---

### Task 3: Section registry + DEFAULT_HOME_SECTIONS

**Files:**
- Create: `apps/storefront/lib/sections.ts`
- Test: `apps/storefront/lib/sections.test.ts`

**Interfaces:**
- Produces:
  - `type SectionType = 'hero' | 'collections' | 'featured' | 'all-products'`
  - `interface PageSection { type: string; settings?: Record<string, unknown> }`
  - `interface PageRenderContext { store: unknown; products: unknown[]; collections: unknown[]; featuredProducts: unknown[] }`
  - `interface SectionDef { templateKey: string; pickContext: (ctx: PageRenderContext) => Record<string, unknown> }`
  - `const SECTION_REGISTRY: Record<SectionType, SectionDef>`
  - `const DEFAULT_HOME_SECTIONS: PageSection[]` = `[{type:'hero'},{type:'collections'},{type:'featured'},{type:'all-products'}]`

- [ ] **Step 1: Write the failing test**

Create `apps/storefront/lib/sections.test.ts`:

```ts
import assert from 'node:assert/strict'
import { SECTION_REGISTRY, DEFAULT_HOME_SECTIONS } from './sections'

const ctx = {
  store: { slug: 's' },
  products: [{ id: 'p1' }],
  collections: [{ id: 'c1' }],
  featuredProducts: [{ id: 'p1' }],
}

// every known type maps to an existing classic section template key
for (const [type, def] of Object.entries(SECTION_REGISTRY)) {
  assert.ok(def.templateKey.startsWith('classic/sections/'), `${type} maps to a classic section`)
}
assert.equal(SECTION_REGISTRY.hero.templateKey, 'classic/sections/hero')
assert.equal(SECTION_REGISTRY.collections.templateKey, 'classic/sections/collections-grid')
assert.equal(SECTION_REGISTRY.featured.templateKey, 'classic/sections/featured-products')
assert.equal(SECTION_REGISTRY['all-products'].templateKey, 'classic/sections/all-products')

// pickContext returns the right keys
assert.deepEqual(Object.keys(SECTION_REGISTRY.hero.pickContext(ctx)), ['store'])
assert.deepEqual(Object.keys(SECTION_REGISTRY.collections.pickContext(ctx)).sort(), ['collections', 'store'])
const feat = SECTION_REGISTRY.featured.pickContext(ctx)
assert.deepEqual((feat as any).products, ctx.featuredProducts, 'featured maps featuredProducts -> products')
const all = SECTION_REGISTRY['all-products'].pickContext(ctx)
assert.deepEqual((all as any).products, ctx.products, 'all-products maps products -> products')

// default home = the four sections in order
assert.deepEqual(DEFAULT_HOME_SECTIONS.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

console.log('sections.test.ts: all assertions passed')
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/storefront && npx tsx lib/sections.test.ts`
Expected: FAIL — `Cannot find module './sections'`.

- [ ] **Step 3: Implement the registry**

Create `apps/storefront/lib/sections.ts`:

```ts
// lib/sections.ts
// Storefront-side registry: maps a page section `type` to the repo Liquid
// section template that renders it and the slice of render context it needs.
// @mcloud/liquid stays a dumb renderer; this file holds the storefront's
// knowledge of what data each section consumes. Adding a section type = a new
// entry here + a .liquid file in packages/liquid.

export type SectionType = 'hero' | 'collections' | 'featured' | 'all-products'

export interface PageSection {
  type: string
  settings?: Record<string, unknown>
}

export interface PageRenderContext {
  store: unknown
  products: unknown[]
  collections: unknown[]
  featuredProducts: unknown[]
}

export interface SectionDef {
  templateKey: string
  pickContext: (ctx: PageRenderContext) => Record<string, unknown>
}

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    templateKey: 'classic/sections/hero',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
  collections: {
    templateKey: 'classic/sections/collections-grid',
    pickContext: (ctx) => ({ store: ctx.store, collections: ctx.collections }),
  },
  featured: {
    templateKey: 'classic/sections/featured-products',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.featuredProducts }),
  },
  'all-products': {
    templateKey: 'classic/sections/all-products',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.products }),
  },
}

export const DEFAULT_HOME_SECTIONS: PageSection[] = [
  { type: 'hero' },
  { type: 'collections' },
  { type: 'featured' },
  { type: 'all-products' },
]
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/storefront && npx tsx lib/sections.test.ts`
Expected: `sections.test.ts: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/lib/sections.ts apps/storefront/lib/sections.test.ts
git commit -m "feat(storefront): section registry + default home section list"
```

---

### Task 4: `renderPage`; delete index.liquid

**Files:**
- Create: `apps/storefront/lib/render-page.ts`
- Test: `apps/storefront/lib/render-page.test.ts`
- Delete: `packages/liquid/themes/classic/templates/index.liquid`
- Modify (generated): `packages/liquid/src/themes-manifest.ts`

**Interfaces:**
- Consumes: `SECTION_REGISTRY`, `PageSection`, `PageRenderContext` from `./sections`; `renderTemplate` from `@mcloud/liquid`.
- Produces: `export function renderPage(sections: PageSection[], ctx: PageRenderContext): Promise<string>` — concatenated section HTML wrapped in a single `<div class="min-h-screen">`; unknown types skipped.

- [ ] **Step 1: Write the failing test**

Create `apps/storefront/lib/render-page.test.ts`:

```ts
import assert from 'node:assert/strict'
import { renderPage } from './render-page'

const ctx = {
  store: { id: 's', name: 'Test Store', slug: 's', currency: 'KES', settings: {} },
  products: [{ id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null }],
  collections: [{ id: 'c1', name: 'Coll', slug: 'coll', image_url: null, description: null }],
  featuredProducts: [{ id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null }],
}

// renders listed sections in order, wrapped in min-h-screen
const html = await renderPage([{ type: 'hero' }, { type: 'all-products' }], ctx)
assert.ok(html.startsWith('<div class="min-h-screen">'), 'wraps in min-h-screen')
assert.ok(html.trimEnd().endsWith('</div>'), 'closes wrapper')
assert.ok(html.includes('sf-hero'), 'renders hero')
assert.ok(html.includes('Alpha'), 'renders all-products with product')
assert.ok(html.indexOf('sf-hero') < html.indexOf('id="products"'), 'sections in order')

// unknown type is skipped, does not throw, other sections still render
const html2 = await renderPage([{ type: 'bogus' }, { type: 'hero' }], ctx)
assert.ok(html2.includes('sf-hero'), 'skips unknown, renders known')
assert.ok(!html2.includes('bogus'), 'unknown type produces no output')

// empty sections -> just the wrapper
const empty = await renderPage([], ctx)
assert.ok(empty.includes('min-h-screen'), 'empty page still has wrapper')

console.log('render-page.test.ts: all assertions passed')
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/storefront && npx tsx lib/render-page.test.ts`
Expected: FAIL — `Cannot find module './render-page'`.

- [ ] **Step 3: Implement `renderPage`**

Create `apps/storefront/lib/render-page.ts`:

```ts
// lib/render-page.ts
// Renders a data-page: loop its ordered section list, render each repo Liquid
// section with the context slice it needs, concatenate inside the shared
// min-h-screen wrapper. Unknown section types are skipped (logged), never throw.
import { renderTemplate } from '@mcloud/liquid'
import { SECTION_REGISTRY, type PageSection, type PageRenderContext, type SectionType } from './sections'

export async function renderPage(sections: PageSection[], ctx: PageRenderContext): Promise<string> {
  let body = ''
  for (const s of sections) {
    const def = SECTION_REGISTRY[s.type as SectionType]
    if (!def) {
      console.warn(`[storefront] unknown section type skipped: ${s.type}`)
      continue
    }
    body += await renderTemplate(def.templateKey, { ...def.pickContext(ctx), settings: s.settings ?? {} })
  }
  return `<div class="min-h-screen">${body}</div>`
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/storefront && npx tsx lib/render-page.test.ts`
Expected: `render-page.test.ts: all assertions passed`

- [ ] **Step 5: Delete index.liquid and regenerate the manifest**

```bash
git rm packages/liquid/themes/classic/templates/index.liquid
cd packages/liquid && node scripts/build-manifest.mjs
```
Expected: `Generated themes-manifest with 6 templates.` (all-products added in Task 2, index removed now → back to 6). Verify `classic/templates/index` is no longer a key: `grep -c "classic/templates/index" src/themes-manifest.ts` → `0`.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/lib/render-page.ts apps/storefront/lib/render-page.test.ts packages/liquid/src/themes-manifest.ts packages/liquid/themes/classic/templates/index.liquid
git commit -m "feat(storefront): renderPage (loop sections); remove index.liquid template"
```

---

### Task 5: Page lookup helpers

**Files:**
- Create: `apps/storefront/lib/pages.ts`

**Interfaces:**
- Consumes: `createClient` from `@mcloud/db/server`; `PageSection` from `./sections`.
- Produces:
  - `interface PageRow { id: string; slug: string; title: string; position: number; sections: PageSection[] }`
  - `getPublishedPage(storeId: string, slug: string): Promise<PageRow | null>` — published only.
  - (home uses `getPublishedPage(storeId, '')`; no separate helper needed.)

- [ ] **Step 1: Implement the helpers**

Create `apps/storefront/lib/pages.ts`:

```ts
// lib/pages.ts
// Read a store's published page by slug, using the storefront server client
// (service-role, same access pattern as products/collections). No anon exposure.
import { createClient } from '@mcloud/db/server'
import type { PageSection } from './sections'

export interface PageRow {
  id: string
  slug: string
  title: string
  position: number
  sections: PageSection[]
}

/** A store's published page for `slug`, or null. Pass '' for the home page. */
export async function getPublishedPage(storeId: string, slug: string): Promise<PageRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pages')
    .select('id, slug, title, position, sections')
    .eq('store_id', storeId)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    position: data.position,
    sections: Array.isArray(data.sections) ? (data.sections as PageSection[]) : [],
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors (relies on the regenerated `pages` types from Task 1).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/lib/pages.ts
git commit -m "feat(storefront): getPublishedPage helper (server client)"
```

---

### Task 6: Home route renders from page-or-default

**Files:**
- Modify: `apps/storefront/app/store/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPublishedPage` (`@/lib/pages`), `renderPage` (`@/lib/render-page`), `DEFAULT_HOME_SECTIONS` (`@/lib/sections`), existing `buildHomeContext`.
- Produces: home renders the store's `slug=''` page sections if present, else `DEFAULT_HOME_SECTIONS`; injected into `data-liquid`; React fallback preserved.

- [ ] **Step 1: Swap the Liquid render to renderPage**

In `apps/storefront/app/store/[slug]/page.tsx`, add imports:

```ts
import { getPublishedPage } from '@/lib/pages'
import { renderPage } from '@/lib/render-page'
import { DEFAULT_HOME_SECTIONS } from '@/lib/sections'
```

Replace the sub-project-1 Liquid render inside the `try` block (currently `const html = await renderTemplate('classic/templates/index', context)`) with page-or-default resolution. The `try` becomes:

```ts
    try {
        const context = buildHomeContext({
            store,
            products,
            collections,
            featuredProducts: featured.length > 0 ? featured : products.slice(0, 8),
        })
        const homePage = await getPublishedPage(store.id, '')
        const sections = homePage?.sections?.length ? homePage.sections : DEFAULT_HOME_SECTIONS
        const html = await renderPage(sections, context)
        return <div data-liquid suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
    } catch (err) {
        console.error('[storefront] Liquid home render failed, falling back to React:', err)
        const { StoreFront } = await resolveTheme(themeId)
        return (
            <StoreFront
                store={store}
                products={products}
                collections={collections}
                featuredProducts={featured.length > 0 ? featured : products.slice(0, 8)}
                services={services}
            />
        )
    }
```

Remove the now-unused `renderTemplate` import from this file if it is no longer referenced (renderPage wraps it). Keep `buildHomeContext`, `resolveTheme`, `StoreFront`, and all data-fetch code — the fallback still needs them.

> Note: `buildHomeContext` returns `{ store, products, collections, featuredProducts }` — exactly the `PageRenderContext` shape `renderPage` expects. `context.store.id` is available for `getPublishedPage`, but use the outer `store.id` (already in scope) to avoid depending on the context's store typing.

- [ ] **Step 2: Typecheck + build**

Run: `cd apps/storefront && npx tsc --noEmit` then `npx turbo run build --filter=@mcloud/storefront`
Expected: both pass (exit 0).

- [ ] **Step 3: Commit**

```bash
git add "apps/storefront/app/store/[slug]/page.tsx"
git commit -m "feat(storefront): home renders from page row or default section list"
```

---

### Task 7: Content-page route (product-miss → page → 404)

**Files:**
- Modify: `apps/storefront/app/store/[slug]/[product-slug]/page.tsx`

**Interfaces:**
- Consumes: `getPublishedPage`, `renderPage`, and the storefront data-fetch pattern.
- Produces: when no product matches the slug, render a published page with that slug (as Liquid HTML in a `data-liquid` div), else `notFound()`. Products unchanged.

- [ ] **Step 1: Add the page fallthrough before notFound**

In `apps/storefront/app/store/[slug]/[product-slug]/page.tsx`, the product lookup currently does `if (!productData) notFound()` (line ~31). Replace that single line with a page fallthrough. First add imports:

```ts
import { getPublishedPage } from '@/lib/pages'
import { renderPage } from '@/lib/render-page'
import { castStore, castProducts, castCollections } from '@/lib/db-cast'
```

Then replace `if (!productData) notFound()` with:

```ts
    if (!productData) {
        // No product with this slug — try a published content page of the same slug.
        const page = await getPublishedPage(rawStore.id, productSlug)
        if (!page) notFound()

        // Build the same render context the home page uses, then render the page.
        const [{ data: rawProducts }, { data: rawCollections }] = await Promise.all([
            supabase
                .from('products')
                .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, track_inventory')
                .eq('store_id', rawStore.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false }),
            supabase
                .from('collections')
                .select('id, name, slug, description, image_url, position')
                .eq('store_id', rawStore.id)
                .eq('is_active', true)
                .neq('slug', 'featured')
                .order('position', { ascending: true }),
        ])
        const store = castStore(rawStore)
        const pageProducts = castProducts(rawProducts ?? [])
        const collections = castCollections(rawCollections ?? [])
        const html = await renderPage(page.sections, {
            store,
            products: pageProducts,
            collections,
            featuredProducts: pageProducts.slice(0, 8),
        })
        return <div data-liquid suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
    }
```

The rest of the product path (variants, reviews, `ProductDetailClient`) is unchanged and only runs when `productData` exists.

> Note: content-page rendering returns the Liquid `data-liquid` div directly (like home), NOT the `ProductDetailClient` React wrapper — the product client only handles products. No React fallback here: a page render error should surface, not silently shell (spec §6 — content page errors are not caught; if this proves noisy, revisit). Keep it simple: no try/catch this task.

- [ ] **Step 2: Typecheck + build**

Run: `cd apps/storefront && npx tsc --noEmit` then `npx turbo run build --filter=@mcloud/storefront`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add "apps/storefront/app/store/[slug]/[product-slug]/page.tsx"
git commit -m "feat(storefront): serve content pages via product-route fallthrough"
```

---

### Task 8: Full build + manual verification

**Files:** none (verification only).

- [ ] **Step 1: Build all affected workspaces**

Run: `npx turbo run build --filter=@mcloud/liquid --filter=@mcloud/storefront --filter=@mcloud/web`
Expected: all succeed, exit 0.

- [ ] **Step 2: Run all unit tests**

```bash
cd packages/liquid && npx tsx src/sections-parity.test.ts && npx tsx src/index.test.ts
cd ../../apps/storefront && npx tsx lib/sections.test.ts && npx tsx lib/render-page.test.ts && npx tsx lib/liquid-context.test.ts
```
Expected: all print `all assertions passed`.

- [ ] **Step 3: Home parity smoke (no page row)**

Start the storefront (`npx turbo run dev --filter=@mcloud/storefront -- --port 3001`; wait for `/store/locd26` to serve 200). Open `/store/locd26` and confirm home renders identically to sub-project 1: hero card + carousel, collections, featured "Top Picks" with prices, all-products grid, footer, **0 hydration errors** (no dev overlay). Compare against the SP1 screenshot. Collections/featured widths must match today (the `max-w-6xl` move must not have widened them).

- [ ] **Step 4: Content-page smoke (create a test page row)**

Insert a test page via MCP `execute_sql` on `cuptlifacdkeagrrofni` (replace store id via subquery):

```sql
insert into pages (store_id, slug, title, position, is_published, sections)
select id, 'about', 'About Us', 1, true,
  '[{"type":"hero"},{"type":"all-products"}]'::jsonb
from stores where slug = 'locd26';
```

Then:
- Open `/store/locd26/about` → renders hero + all-products (the page), in a `data-liquid` div, no hydration errors.
- Open an existing product URL for locd26 (pick a real product slug) → still renders the product detail (product wins).
- Open `/store/locd26/does-not-exist` → 404.
- Open `/store/locd26` (home) → still the default home, unchanged.

- [ ] **Step 5: Home-from-row smoke (reorder test)**

Insert a home page row with reordered sections and confirm the order changes:

```sql
insert into pages (store_id, slug, title, position, is_published, sections)
select id, '', 'Home', 0, true,
  '[{"type":"hero"},{"type":"featured"},{"type":"collections"},{"type":"all-products"}]'::jsonb
from stores where slug = 'locd26';
```
Reload `/store/locd26` → featured now appears BEFORE collections. Then clean up both test rows:

```sql
delete from pages where store_id = (select id from stores where slug='locd26') and slug in ('about','');
```
Reload home → back to default order. (Leaves locd26 page-less, as it started.)

- [ ] **Step 6: Final commit (if verification needed tweaks)**

```bash
git add -A
git commit -m "chore(storefront): pages data model verification tweaks"
```

---

## Self-Review

**Spec coverage:**
- §3.1 pages table → Task 1. ✓
- §3.2 section registry (storefront-side, safe skip) → Task 3. ✓
- §3.3 extract all-products → Task 2. ✓ (+ self-contained collections/featured per the resolved width decision)
- §3.4 renderPage (loop + concat + min-h-screen wrapper) + delete index.liquid → Task 4. ✓
- §3.5 home page-or-default, data-liquid, React fallback → Task 6. ✓
- §3.6 content-page fallthrough (product wins, published only, 404 else) → Task 7. ✓
- §6 error handling: unknown type skip (Task 4 test), home fallback (Task 6), content 404 (Task 7), empty sections (Task 4 test). ✓
- §7 no backfill / byte-parity / product URLs intact / regen types → Global Constraints + Tasks 1,6,8. ✓
- §8 testing (all-products parity, renderPage unit, registry, home default-vs-row, content routing) → Tasks 2,3,4,8. ✓
- §10 open items resolved: (1) wrapper markup = `<div class="min-h-screen">` only, section widths moved into section files (Task 2 + Task 4) with parity test; (2) content page returns data-liquid div directly, not ProductDetailClient (Task 7); (3) reads via `@mcloud/db/server` service-role client, same as product route (Task 5). ✓

**Placeholder scan:** No TBD/TODO. All liquid/TS/SQL is complete and literal. The one deferred judgment (no try/catch on content-page render) is stated with rationale, not a gap.

**Type consistency:** `PageSection`/`PageRenderContext`/`SectionType`/`SECTION_REGISTRY`/`DEFAULT_HOME_SECTIONS` defined in Task 3, consumed identically in Tasks 4,5,6,7. `renderPage(sections, ctx): Promise<string>` defined Task 4, consumed Tasks 6,7. `getPublishedPage(storeId, slug): Promise<PageRow|null>` defined Task 5, consumed Tasks 6,7. `buildHomeContext` output shape matches `PageRenderContext` (verified in Task 6 note). Manifest count: 6 (SP1) → 7 (Task 2 adds all-products) → 6 (Task 4 removes index) — consistent.

**Deviation from spec noted:** spec §3.4 hedged that the inner `max-w-6xl` container was "cosmetic grouping"; grounding revealed it is load-bearing (collections/featured use bare `container` and would widen without it). Resolved by moving `max-w-6xl` into those two section files (Task 2), so `renderPage` needs only the outer `min-h-screen` wrapper — cleaner for the section-loop model and parity-preserving. Confirmed with the user during planning.
