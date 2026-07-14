# Per-Vertical Default Template Sets (SP3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a `vertical` concept keyed by `stores.type`, author four NGO Liquid section templates, make the storefront home fallback vertical-aware, and seed a vertical's default pages at store creation.

**Architecture:** A new raw-TS `@mcloud/verticals` package holds vertical descriptors (each with a default page set) and `getVertical`/`isVerticalId` helpers — no Liquid/template knowledge. Four new NGO `.liquid` sections (mission/programs/impact/contact) read from `store.settings`, styled with the existing `sf-*` system, empty-guarded per the SP2 pattern. The storefront registry gains the four NGO section types and its `DEFAULT_HOME_SECTIONS` constant becomes a `defaultHomeSections(type)` function driven by the vertical. `createStoreForUser` accepts an optional validated `type`, sets it on the store, and best-effort seeds the vertical's default `pages` rows.

**Tech Stack:** TypeScript, Next.js 16 (App Router, RSC), Supabase (`@mcloud/db`, service-role server client), `@mcloud/liquid` (liquidjs, bundled-string manifest), Turborepo, npm workspaces. **No unit-test framework** — pure-logic + Liquid units are tested with `npx tsx <file>.test.ts` (top-level `node:assert`, prints a success line); UI/routing verified via build + manual smoke.

## Global Constraints

- **No schema change, no backfill.** Uses existing `stores.type` (TEXT, default `'shop'`), `stores.settings` (freeform JSON), and the SP2 `pages` table. The 19 existing shop stores are untouched.
- **All `pages`/`stores` access is via the server-side service-role client** (`@mcloud/db/server`). SP3 adds no anon table access.
- **Content lives in `stores.settings` JSON** — no NGO-specific tables, no per-section `settings` activation.
- **`@mcloud/verticals` is Liquid-free** — it only *names* section types (strings). The `type → templateKey` mapping stays in the storefront registry.
- **Raw-TS-source packages** (mirror `@mcloud/liquid`/`@mcloud/themes`): `exports` → `./src/index.ts`, no build step, `"private": true`.
- **New `.liquid` files do NOT render until the manifest is regenerated.** After adding/editing any `.liquid`, run `cd packages/liquid && node scripts/build-manifest.mjs` (globs `themes/**/*.liquid` into `src/themes-manifest.ts` as bundled strings). This is easy to forget and every Liquid task below includes it.
- **Liquid auto-escaping is on** (since SP1). NGO sections use plain `{{ }}` for text and `<img src="{{ ... }}">` for owner-authored settings image URLs (same trust level as the shop hero image today).
- `VerticalId = 'shop' | 'ngo'`. `getVertical`/`isVerticalId` **never throw**; unknown/null `type` → `VERTICALS.shop`.
- Vertical labels are exactly `'Shop'` and `'NGO'`.
- Seeding is **best-effort**: a page-insert failure is logged and store creation still returns success; the vertical-aware fallback covers rendering.

---

### Task 1: `@mcloud/verticals` package

Creates the shared vertical descriptor package with the two verticals, their default page sets, and the two never-throwing helpers. This is the dependency root for Tasks 5 and 6.

**Files:**
- Create: `packages/verticals/package.json`
- Create: `packages/verticals/tsconfig.json`
- Create: `packages/verticals/src/index.ts`
- Test: `packages/verticals/src/index.test.ts`

**Interfaces:**
- Consumes: nothing (leaf package).
- Produces (imported by Tasks 5 & 6 as `@mcloud/verticals`):
  - `type VerticalId = 'shop' | 'ngo'`
  - `interface SeedSection { type: string }`
  - `interface SeedPage { slug: string; title: string; position: number; sections: SeedSection[] }`
  - `interface Vertical { id: VerticalId; label: string; defaultPages: SeedPage[] }`
  - `const VERTICALS: Record<VerticalId, Vertical>`
  - `function getVertical(type: string | null | undefined): Vertical` — unknown/null → `VERTICALS.shop`
  - `function isVerticalId(type: string): type is VerticalId`

- [ ] **Step 1: Create the package manifest**

Create `packages/verticals/package.json` (mirrors `@mcloud/config`'s minimal raw-TS shape — no runtime deps):

```json
{
  "name": "@mcloud/verticals",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": {
    "@mcloud/config": "*"
  }
}
```

- [ ] **Step 2: Create the package tsconfig**

Create `packages/verticals/tsconfig.json` (extends the shared base, same as other packages):

```json
{
  "extends": "@mcloud/config/tsconfig.base.json",
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write the failing test**

Create `packages/verticals/src/index.test.ts`:

```ts
import assert from 'node:assert/strict'
import { VERTICALS, getVertical, isVerticalId } from './index'

// isVerticalId narrows only the two known ids
assert.equal(isVerticalId('shop'), true)
assert.equal(isVerticalId('ngo'), true)
assert.equal(isVerticalId('bogus'), false)
assert.equal(isVerticalId(''), false)

// getVertical: known ids resolve; unknown / null / undefined fall back to shop, never throw
assert.equal(getVertical('shop').id, 'shop')
assert.equal(getVertical('ngo').id, 'ngo')
assert.equal(getVertical('bogus').id, 'shop', 'unknown -> shop')
assert.equal(getVertical(null).id, 'shop', 'null -> shop')
assert.equal(getVertical(undefined).id, 'shop', 'undefined -> shop')

// labels are exact
assert.equal(VERTICALS.shop.label, 'Shop')
assert.equal(VERTICALS.ngo.label, 'NGO')

// shop default pages: one Home page with the four shop sections in order
const shopHome = VERTICALS.shop.defaultPages.find(p => p.slug === '')
assert.ok(shopHome, 'shop has a home page (slug "")')
assert.equal(shopHome.title, 'Home')
assert.equal(shopHome.position, 0)
assert.deepEqual(shopHome.sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

// ngo default pages: one Home page with the four NGO sections in order
const ngoHome = VERTICALS.ngo.defaultPages.find(p => p.slug === '')
assert.ok(ngoHome, 'ngo has a home page (slug "")')
assert.equal(ngoHome.title, 'Home')
assert.equal(ngoHome.position, 0)
assert.deepEqual(ngoHome.sections.map(s => s.type), ['mission', 'programs', 'impact', 'contact'])

console.log('verticals/index.test.ts: all assertions passed')
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd packages/verticals && npx tsx src/index.test.ts`
Expected: FAIL — cannot find module `./index` (file not created yet).

- [ ] **Step 5: Write the implementation**

Create `packages/verticals/src/index.ts`:

```ts
// @mcloud/verticals — vertical descriptors keyed by stores.type.
// A "vertical" (shop, ngo) names a default page set: the pages seeded when a
// store of that type is created, and the fallback section list the storefront
// renders when a store has no page row. This package is Liquid-free — it only
// NAMES section types (strings); the storefront registry maps names to templates.

export type VerticalId = 'shop' | 'ngo'

/** Names a section type; mapped to a Liquid template by the storefront registry. */
export interface SeedSection {
  type: string
}

export interface SeedPage {
  slug: string // '' = home
  title: string
  position: number
  sections: SeedSection[]
}

export interface Vertical {
  id: VerticalId
  label: string
  defaultPages: SeedPage[]
}

export const VERTICALS: Record<VerticalId, Vertical> = {
  shop: {
    id: 'shop',
    label: 'Shop',
    defaultPages: [
      {
        slug: '',
        title: 'Home',
        position: 0,
        sections: [{ type: 'hero' }, { type: 'collections' }, { type: 'featured' }, { type: 'all-products' }],
      },
    ],
  },
  ngo: {
    id: 'ngo',
    label: 'NGO',
    defaultPages: [
      {
        slug: '',
        title: 'Home',
        position: 0,
        sections: [{ type: 'mission' }, { type: 'programs' }, { type: 'impact' }, { type: 'contact' }],
      },
    ],
  },
}

export function isVerticalId(type: string): type is VerticalId {
  return type === 'shop' || type === 'ngo'
}

/** Resolve a store type to its vertical. Unknown/null/undefined → shop. Never throws. */
export function getVertical(type: string | null | undefined): Vertical {
  if (type && isVerticalId(type)) return VERTICALS[type]
  return VERTICALS.shop
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd packages/verticals && npx tsx src/index.test.ts`
Expected: PASS — prints `verticals/index.test.ts: all assertions passed`.

- [ ] **Step 7: Install the new workspace package**

The package must be linked into the workspace so `@mcloud/verticals` resolves. Run from repo root:

Run: `npm install`
Expected: completes without error; `node_modules/@mcloud/verticals` becomes a symlink to `packages/verticals`.

- [ ] **Step 8: Commit**

```bash
git add packages/verticals
git commit -m "feat(verticals): add @mcloud/verticals package with shop/ngo descriptors

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: NGO `mission.liquid` section (always renders)

The identity band for an NGO home — hero-like but non-commerce (no carousel, no "Shop now"). Reads `settings.mission`; **always renders**, falling back to `store.name` + `store.description` so an NGO home is never headerless.

**Files:**
- Create: `packages/liquid/themes/classic/sections/mission.liquid`
- Test: `packages/liquid/src/ngo-sections.test.ts` (created here; extended by Tasks 3 & 4)

**Interfaces:**
- Consumes: render context `{ store }` where `store.name`, `store.description`, `store.settings.mission` may be present.
- Produces: HTML `<section class="sf-mission ...">` — a headline (`settings.mission` headline text or `store.name`) always present.

- [ ] **Step 1: Write the failing test**

Create `packages/liquid/src/ngo-sections.test.ts`:

```ts
import assert from 'node:assert/strict'
import { renderTemplate } from './index'

// mission ALWAYS renders. With settings.mission it shows the statement.
const withMission = await renderTemplate('classic/sections/mission', {
  store: { name: 'Hope Org', description: 'We help', slug: 'hope', settings: { mission: 'End hunger by 2030.' } },
})
assert.ok(withMission.includes('sf-mission'), 'mission renders its section')
assert.ok(withMission.includes('End hunger by 2030.'), 'renders the mission statement')

// Without settings.mission it falls back to store name + description (never headerless)
const noMission = await renderTemplate('classic/sections/mission', {
  store: { name: 'Hope Org', description: 'We help communities', slug: 'hope', settings: {} },
})
assert.ok(noMission.includes('sf-mission'), 'mission still renders with no settings')
assert.ok(noMission.includes('Hope Org'), 'falls back to store name')
assert.ok(noMission.includes('We help communities'), 'falls back to store description')

console.log('ngo-sections.test.ts: mission assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/liquid && npx tsx src/ngo-sections.test.ts`
Expected: FAIL — template `classic/sections/mission` not in the manifest.

- [ ] **Step 3: Write the mission template**

Create `packages/liquid/themes/classic/sections/mission.liquid`:

```liquid
{%- assign settings = store.settings -%}
{%- assign headline = store.name -%}
{%- assign statement = store.description -%}
{%- if settings -%}
  {%- if settings.missionHeadline -%}{%- assign headline = settings.missionHeadline -%}{%- endif -%}
  {%- if settings.mission -%}{%- assign statement = settings.mission -%}{%- endif -%}
{%- endif -%}

<section class="sf-mission relative w-full overflow-hidden py-20 md:py-28">
  <div class="sf-mission-fallback absolute inset-0"></div>
  <div class="relative container mx-auto max-w-4xl px-6 text-center">
    <span class="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs font-medium mb-4">
      Our Mission
    </span>
    <h1 class="sf-heading font-bold tracking-tight" style="font-size: clamp(1.875rem, 5vw, 3rem); line-height: 1.1">
      {{ headline }}
    </h1>
    {%- if statement -%}
      <p class="font-light mt-4 mx-auto max-w-2xl" style="color: var(--sf-foreground-subtle); font-size: clamp(1rem, 2vw, 1.25rem)">
        {{ statement }}
      </p>
    {%- endif -%}
  </div>
</section>
```

- [ ] **Step 4: Regenerate the Liquid manifest**

New `.liquid` files are not bundled until the manifest is rebuilt.

Run: `cd packages/liquid && node scripts/build-manifest.mjs`
Expected: prints `Generated themes-manifest with N templates.` (N one higher than before).

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/liquid && npx tsx src/ngo-sections.test.ts`
Expected: PASS — prints `ngo-sections.test.ts: mission assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add packages/liquid/themes/classic/sections/mission.liquid packages/liquid/src/themes-manifest.ts packages/liquid/src/ngo-sections.test.ts
git commit -m "feat(liquid): add NGO mission section (always renders, store-name fallback)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: NGO `programs.liquid` + `impact.liquid` sections (empty-guarded)

Two list-driven sections: a programs grid and an impact stat row. Both emit nothing when their settings arrays are absent/empty (SP2 `size > 0` guard).

**Files:**
- Create: `packages/liquid/themes/classic/sections/programs.liquid`
- Create: `packages/liquid/themes/classic/sections/impact.liquid`
- Test: `packages/liquid/src/ngo-sections.test.ts:end` (append to the file from Task 2)

**Interfaces:**
- Consumes: `{ store }` with `store.settings.programs = [{ title, description, image }]` and `store.settings.impactStats = [{ label, value }]`.
- Produces: `<section class="sf-programs ...">` and `<section class="sf-impact ...">`, or empty string when their arrays are empty.

- [ ] **Step 1: Add the failing assertions**

Append to `packages/liquid/src/ngo-sections.test.ts` (before the final `console.log` line; move that line to the very end):

```ts
// ── programs ──
const programsStore = {
  name: 'Hope Org', slug: 'hope',
  settings: { programs: [
    { title: 'Clean Water', description: 'Wells for villages', image: 'https://x/water.jpg' },
    { title: 'Schooling', description: 'Books and teachers', image: '' },
  ] },
}
const programs = await renderTemplate('classic/sections/programs', { store: programsStore })
assert.ok(programs.includes('sf-programs'), 'programs renders its section')
assert.ok(programs.includes('Clean Water') && programs.includes('Schooling'), 'renders each program title')
assert.ok(programs.includes('Wells for villages'), 'renders program description')

// programs empty guard: no array -> nothing
const programsEmpty = await renderTemplate('classic/sections/programs', { store: { name: 'X', slug: 'x', settings: {} } })
assert.ok(!programsEmpty.includes('sf-programs'), 'programs renders nothing when settings.programs absent')

// programs empty guard: empty array -> nothing
const programsEmptyArr = await renderTemplate('classic/sections/programs', { store: { name: 'X', slug: 'x', settings: { programs: [] } } })
assert.ok(!programsEmptyArr.includes('sf-programs'), 'programs renders nothing when settings.programs is []')

// ── impact ──
const impactStore = {
  name: 'Hope Org', slug: 'hope',
  settings: { impactStats: [
    { label: 'People served', value: '5,000' },
    { label: 'Villages', value: '42' },
  ] },
}
const impact = await renderTemplate('classic/sections/impact', { store: impactStore })
assert.ok(impact.includes('sf-impact'), 'impact renders its section')
assert.ok(impact.includes('5,000') && impact.includes('People served'), 'renders stat value + label')
assert.ok(impact.includes('42') && impact.includes('Villages'), 'renders second stat')

// impact empty guard
const impactEmpty = await renderTemplate('classic/sections/impact', { store: { name: 'X', slug: 'x', settings: {} } })
assert.ok(!impactEmpty.includes('sf-impact'), 'impact renders nothing when settings.impactStats absent')
const impactEmptyArr = await renderTemplate('classic/sections/impact', { store: { name: 'X', slug: 'x', settings: { impactStats: [] } } })
assert.ok(!impactEmptyArr.includes('sf-impact'), 'impact renders nothing when settings.impactStats is []')
```

Ensure the file ends with a single `console.log('ngo-sections.test.ts: all assertions passed')` (replace the mission-only log line from Task 2).

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/liquid && npx tsx src/ngo-sections.test.ts`
Expected: FAIL — templates `classic/sections/programs` / `classic/sections/impact` not in the manifest.

- [ ] **Step 3: Write the programs template**

Create `packages/liquid/themes/classic/sections/programs.liquid`:

```liquid
{%- assign settings = store.settings -%}
{%- assign programs = null -%}
{%- if settings -%}{%- assign programs = settings.programs -%}{%- endif -%}
{%- if programs and programs.size > 0 -%}
<section class="sf-programs py-16 md:py-24">
  <div class="container mx-auto max-w-6xl px-6">
    <div class="mb-10 md:mb-14 text-center">
      <span class="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs font-medium mb-3">
        Programs
      </span>
      <h2 class="sf-heading text-3xl md:text-4xl font-light tracking-tight">What We Do</h2>
    </div>
    <div class="grid gap-6 md:gap-8" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
      {%- for program in programs -%}
        <article class="sf-card sf-program-card overflow-hidden">
          {%- if program.image -%}
            <div class="relative overflow-hidden sf-bg-muted" style="aspect-ratio: 16/9">
              <img src="{{ program.image }}" alt="{{ program.title }}" loading="lazy" class="absolute inset-0 w-full h-full object-cover">
            </div>
          {%- endif -%}
          <div class="px-4 pt-4 pb-4 space-y-1">
            <h3 class="sf-heading text-xl font-light">{{ program.title }}</h3>
            {%- if program.description -%}
              <p class="text-sm" style="color: var(--sf-foreground-subtle)">{{ program.description }}</p>
            {%- endif -%}
          </div>
        </article>
      {%- endfor -%}
    </div>
  </div>
</section>
{%- endif -%}
```

- [ ] **Step 4: Write the impact template**

Create `packages/liquid/themes/classic/sections/impact.liquid`:

```liquid
{%- assign settings = store.settings -%}
{%- assign stats = null -%}
{%- if settings -%}{%- assign stats = settings.impactStats -%}{%- endif -%}
{%- if stats and stats.size > 0 -%}
<section class="sf-impact sf-section-muted py-16 md:py-24">
  <div class="container mx-auto max-w-5xl px-6">
    <div class="mb-10 md:mb-14 text-center">
      <span class="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs font-medium mb-3">
        Impact
      </span>
      <h2 class="sf-heading text-3xl md:text-4xl font-light tracking-tight">Our Impact</h2>
    </div>
    <div class="grid gap-8 text-center" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))">
      {%- for stat in stats -%}
        <div class="sf-impact-stat space-y-1">
          <div class="sf-heading font-bold" style="font-size: clamp(2rem, 5vw, 3rem); line-height: 1">{{ stat.value }}</div>
          <div class="text-sm uppercase tracking-widest" style="color: var(--sf-foreground-subtle)">{{ stat.label }}</div>
        </div>
      {%- endfor -%}
    </div>
  </div>
</section>
{%- endif -%}
```

- [ ] **Step 5: Regenerate the Liquid manifest**

Run: `cd packages/liquid && node scripts/build-manifest.mjs`
Expected: prints `Generated themes-manifest with N templates.` (N two higher than after Task 2).

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd packages/liquid && npx tsx src/ngo-sections.test.ts`
Expected: PASS — prints `ngo-sections.test.ts: all assertions passed`.

- [ ] **Step 7: Commit**

```bash
git add packages/liquid/themes/classic/sections/programs.liquid packages/liquid/themes/classic/sections/impact.liquid packages/liquid/src/themes-manifest.ts packages/liquid/src/ngo-sections.test.ts
git commit -m "feat(liquid): add NGO programs + impact sections (empty-guarded)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: NGO `contact.liquid` section (empty-guarded, reuses socialLinks)

A contact block from `settings.contact = { email, phone, address }`, plus reuse of the existing `settings.socialLinks`. Renders only when at least one contact field OR a social link is present.

**Files:**
- Create: `packages/liquid/themes/classic/sections/contact.liquid`
- Test: `packages/liquid/src/ngo-sections.test.ts:end` (append to the file from Task 3)

**Interfaces:**
- Consumes: `{ store }` with `store.settings.contact = { email, phone, address }` and `store.settings.socialLinks` (array of `{ platform, url }` — the same shape the shop uses).
- Produces: `<section class="sf-contact ...">`, or empty string when neither contact fields nor social links exist.

- [ ] **Step 1: Add the failing assertions**

Append to `packages/liquid/src/ngo-sections.test.ts` (before the final `console.log`):

```ts
// ── contact ──
const contactStore = {
  name: 'Hope Org', slug: 'hope',
  settings: { contact: { email: 'hi@hope.org', phone: '+254700000000', address: 'Nairobi' } },
}
const contact = await renderTemplate('classic/sections/contact', { store: contactStore })
assert.ok(contact.includes('sf-contact'), 'contact renders its section')
assert.ok(contact.includes('hi@hope.org'), 'renders email')
assert.ok(contact.includes('+254700000000'), 'renders phone')
assert.ok(contact.includes('Nairobi'), 'renders address')

// renders when ONLY social links present (no contact object)
const socialOnly = await renderTemplate('classic/sections/contact', {
  store: { name: 'Hope Org', slug: 'hope', settings: { socialLinks: [{ platform: 'twitter', url: 'https://x.com/hope' }] } },
})
assert.ok(socialOnly.includes('sf-contact'), 'contact renders when only social links present')
assert.ok(socialOnly.includes('https://x.com/hope'), 'renders the social link url')

// empty guard: no contact + no social -> nothing
const contactEmpty = await renderTemplate('classic/sections/contact', { store: { name: 'X', slug: 'x', settings: {} } })
assert.ok(!contactEmpty.includes('sf-contact'), 'contact renders nothing when no contact fields and no social links')
```

The single final line must remain `console.log('ngo-sections.test.ts: all assertions passed')`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/liquid && npx tsx src/ngo-sections.test.ts`
Expected: FAIL — template `classic/sections/contact` not in the manifest.

- [ ] **Step 3: Write the contact template**

Create `packages/liquid/themes/classic/sections/contact.liquid`. Compute a `has_contact` flag so the whole section is suppressed when there's nothing to show:

```liquid
{%- assign settings = store.settings -%}
{%- assign contact = null -%}
{%- assign social = null -%}
{%- if settings -%}
  {%- assign contact = settings.contact -%}
  {%- assign social = settings.socialLinks -%}
{%- endif -%}

{%- assign has_contact = false -%}
{%- if contact -%}
  {%- if contact.email or contact.phone or contact.address -%}{%- assign has_contact = true -%}{%- endif -%}
{%- endif -%}
{%- assign has_social = false -%}
{%- if social and social.size > 0 -%}{%- assign has_social = true -%}{%- endif -%}

{%- if has_contact or has_social -%}
<section class="sf-contact py-16 md:py-24">
  <div class="container mx-auto max-w-3xl px-6 text-center">
    <span class="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs font-medium mb-3">
      Get in Touch
    </span>
    <h2 class="sf-heading text-3xl md:text-4xl font-light tracking-tight mb-8">Contact Us</h2>
    {%- if has_contact -%}
      <div class="space-y-2 mb-8">
        {%- if contact.email -%}
          <p><a href="mailto:{{ contact.email }}" class="sf-link">{{ contact.email }}</a></p>
        {%- endif -%}
        {%- if contact.phone -%}
          <p><a href="tel:{{ contact.phone }}" class="sf-link">{{ contact.phone }}</a></p>
        {%- endif -%}
        {%- if contact.address -%}
          <p style="color: var(--sf-foreground-subtle)">{{ contact.address }}</p>
        {%- endif -%}
      </div>
    {%- endif -%}
    {%- if has_social -%}
      <div class="flex justify-center gap-4">
        {%- for link in social -%}
          <a href="{{ link.url }}" class="sf-link text-sm" target="_blank" rel="noopener noreferrer">{{ link.platform }}</a>
        {%- endfor -%}
      </div>
    {%- endif -%}
  </div>
</section>
{%- endif -%}
```

- [ ] **Step 4: Regenerate the Liquid manifest**

Run: `cd packages/liquid && node scripts/build-manifest.mjs`
Expected: prints `Generated themes-manifest with N templates.` (N one higher than after Task 3 — the full NGO set of four is now bundled).

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/liquid && npx tsx src/ngo-sections.test.ts`
Expected: PASS — prints `ngo-sections.test.ts: all assertions passed`.

- [ ] **Step 6: Verify the pre-existing Liquid suite still passes**

Run: `cd packages/liquid && npx tsx src/sections-parity.test.ts && npx tsx src/index.test.ts`
Expected: both print their success lines (adding sections must not disturb existing ones).

- [ ] **Step 7: Commit**

```bash
git add packages/liquid/themes/classic/sections/contact.liquid packages/liquid/src/themes-manifest.ts packages/liquid/src/ngo-sections.test.ts
git commit -m "feat(liquid): add NGO contact section (guarded, reuses socialLinks)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Vertical-aware storefront registry + `defaultHomeSections`

Register the four NGO section types and replace the `DEFAULT_HOME_SECTIONS` constant with a vertical-driven `defaultHomeSections(storeType?)` function. Wire the home route's fallback to it. **Grep confirmed** `DEFAULT_HOME_SECTIONS` is imported only by the home route (`app/store/[slug]/page.tsx`) and referenced in `lib/sections.test.ts` — per Open Item 3, convert cleanly to the function; keep a back-compat const alias so the existing test's shop assertion still holds.

**Files:**
- Modify: `apps/storefront/package.json` (add `@mcloud/verticals` dep)
- Modify: `apps/storefront/lib/sections.ts`
- Modify: `apps/storefront/lib/sections.test.ts`
- Modify: `apps/storefront/app/store/[slug]/page.tsx`

**Interfaces:**
- Consumes (from Task 1): `import { getVertical } from '@mcloud/verticals'`.
- Produces:
  - `type SectionType = 'hero' | 'collections' | 'featured' | 'all-products' | 'mission' | 'programs' | 'impact' | 'contact'`
  - Four new `SECTION_REGISTRY` entries, each `pickContext: (ctx) => ({ store: ctx.store })`, `templateKey: 'classic/sections/<name>'`.
  - `function defaultHomeSections(storeType?: string | null): PageSection[]` — the Home page (`slug === ''`) section list from `getVertical(storeType)`.
  - `const DEFAULT_HOME_SECTIONS = defaultHomeSections('shop')` (back-compat alias).

- [ ] **Step 1: Add the workspace dependency**

In `apps/storefront/package.json`, add to `"dependencies"` (alphabetical, next to `@mcloud/themes`):

```json
    "@mcloud/verticals": "*",
```

Then from repo root:

Run: `npm install`
Expected: completes; `apps/storefront/node_modules/@mcloud/verticals` symlink present (or root-hoisted).

- [ ] **Step 2: Update the registry test (failing)**

Replace `apps/storefront/lib/sections.test.ts` with:

```ts
import assert from 'node:assert/strict'
import { SECTION_REGISTRY, DEFAULT_HOME_SECTIONS, defaultHomeSections } from './sections'

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

// NGO section types map to their templates and pick only { store }
assert.equal(SECTION_REGISTRY.mission.templateKey, 'classic/sections/mission')
assert.equal(SECTION_REGISTRY.programs.templateKey, 'classic/sections/programs')
assert.equal(SECTION_REGISTRY.impact.templateKey, 'classic/sections/impact')
assert.equal(SECTION_REGISTRY.contact.templateKey, 'classic/sections/contact')
for (const t of ['mission', 'programs', 'impact', 'contact'] as const) {
  assert.deepEqual(Object.keys(SECTION_REGISTRY[t].pickContext(ctx)), ['store'], `${t} picks only store`)
}

// pickContext returns the right keys for commerce sections
assert.deepEqual(Object.keys(SECTION_REGISTRY.hero.pickContext(ctx)), ['store'])
assert.deepEqual(Object.keys(SECTION_REGISTRY.collections.pickContext(ctx)).sort(), ['collections', 'store'])
const feat = SECTION_REGISTRY.featured.pickContext(ctx)
assert.deepEqual((feat as any).products, ctx.featuredProducts, 'featured maps featuredProducts -> products')
const all = SECTION_REGISTRY['all-products'].pickContext(ctx)
assert.deepEqual((all as any).products, ctx.products, 'all-products maps products -> products')

// defaultHomeSections is vertical-aware
assert.deepEqual(defaultHomeSections('shop').map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.deepEqual(defaultHomeSections('ngo').map(s => s.type), ['mission', 'programs', 'impact', 'contact'])
assert.deepEqual(defaultHomeSections('bogus').map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'unknown -> shop')
assert.deepEqual(defaultHomeSections(null).map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'null -> shop')
assert.deepEqual(defaultHomeSections(undefined).map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'undefined -> shop')

// back-compat constant still equals the shop set
assert.deepEqual(DEFAULT_HOME_SECTIONS.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

console.log('sections.test.ts: all assertions passed')
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/storefront && npx tsx lib/sections.test.ts`
Expected: FAIL — `defaultHomeSections` not exported / NGO registry entries missing.

- [ ] **Step 4: Implement the registry + function**

Edit `apps/storefront/lib/sections.ts`. Add the import at the top (after the header comment):

```ts
import { getVertical } from '@mcloud/verticals'
```

Extend `SectionType`:

```ts
export type SectionType =
  | 'hero'
  | 'collections'
  | 'featured'
  | 'all-products'
  | 'mission'
  | 'programs'
  | 'impact'
  | 'contact'
```

Add the four NGO entries inside `SECTION_REGISTRY` (after `'all-products'`):

```ts
  mission: {
    templateKey: 'classic/sections/mission',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
  programs: {
    templateKey: 'classic/sections/programs',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
  impact: {
    templateKey: 'classic/sections/impact',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
  contact: {
    templateKey: 'classic/sections/contact',
    pickContext: (ctx) => ({ store: ctx.store }),
  },
```

Replace the `DEFAULT_HOME_SECTIONS` constant (the whole `export const DEFAULT_HOME_SECTIONS ...` block) with the vertical-driven function plus a back-compat alias:

```ts
/**
 * The Home page's default section list for a store's vertical. Used as the
 * fallback when a store has no seeded `pages` row. Unknown/null type → shop.
 */
export function defaultHomeSections(storeType?: string | null): PageSection[] {
  const home = getVertical(storeType).defaultPages.find((p) => p.slug === '')
  return (home?.sections ?? []).map((s) => ({ type: s.type }))
}

/** Back-compat: the shop Home section list (existing callers/tests). */
export const DEFAULT_HOME_SECTIONS: PageSection[] = defaultHomeSections('shop')
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/storefront && npx tsx lib/sections.test.ts`
Expected: PASS — prints `sections.test.ts: all assertions passed`.

- [ ] **Step 6: Wire the home route to the vertical**

Edit `apps/storefront/app/store/[slug]/page.tsx`.

Change the import on line 10 from:

```ts
import { DEFAULT_HOME_SECTIONS } from '@/lib/sections'
```

to:

```ts
import { defaultHomeSections } from '@/lib/sections'
```

Then change the fallback line (currently `const sections = homePage?.sections?.length ? homePage.sections : DEFAULT_HOME_SECTIONS`) to use the store's type. **Note:** `castStore` drops `type`, so read it from the raw row (`rawStore.type`), which is present because the query does `select('*')`:

```ts
        const sections = homePage?.sections?.length
            ? homePage.sections
            : defaultHomeSections(rawStore.type as string | null | undefined)
```

- [ ] **Step 7: Typecheck and build the storefront**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

Run: `npx turbo run build --filter=@mcloud/storefront`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/storefront/package.json apps/storefront/lib/sections.ts apps/storefront/lib/sections.test.ts "apps/storefront/app/store/[slug]/page.tsx"
git commit -m "feat(storefront): vertical-aware registry + defaultHomeSections fallback

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Seed vertical default pages at store creation

`createStoreForUser` gains an optional validated `type` (default `shop`), sets it on the store insert, and best-effort seeds the vertical's default `pages` rows. Existing callers (web action, mobile API) pass no `type` → default `shop` → unchanged rendering.

**Files:**
- Modify: `apps/web/package.json` (add `@mcloud/verticals` dep)
- Modify: `apps/web/lib/merchant/stores.ts`
- Create: `apps/web/lib/merchant/seed-pages.ts` (pure, testable seed-row builder)
- Test: `apps/web/lib/merchant/seed-pages.test.ts`

**Interfaces:**
- Consumes (from Task 1): `import { getVertical, isVerticalId } from '@mcloud/verticals'`.
- Produces:
  - `createStoreForUser(input: { orgId: string; name: string; slug: string; type?: string }, userId: string): Promise<CreateStoreResult>` (signature gains optional `type`; return type unchanged).
  - `function seedPageRows(storeId: string, type: string | null | undefined): Array<{ store_id: string; slug: string; title: string; position: number; is_published: true; sections: SeedSection[] }>` — the exact rows to insert for a vertical.

The seed-row shape is extracted to `seed-pages.ts` so it can be unit-tested with `npx tsx` (the DB insert itself is verified by the manual smoke, not a unit test).

- [ ] **Step 1: Add the workspace dependency**

In `apps/web/package.json`, add to `"dependencies"` (alphabetical, next to `@mcloud/themes`):

```json
    "@mcloud/verticals": "*",
```

Then from repo root:

Run: `npm install`
Expected: completes; `@mcloud/verticals` resolves for `apps/web`.

- [ ] **Step 2: Write the failing seed-row test**

Create `apps/web/lib/merchant/seed-pages.test.ts`:

```ts
import assert from 'node:assert/strict'
import { seedPageRows } from './seed-pages'

// ngo -> the NGO Home page as a pages row
const ngo = seedPageRows('store-1', 'ngo')
assert.equal(ngo.length, 1, 'one seed page for ngo')
assert.equal(ngo[0].store_id, 'store-1')
assert.equal(ngo[0].slug, '')
assert.equal(ngo[0].title, 'Home')
assert.equal(ngo[0].position, 0)
assert.equal(ngo[0].is_published, true)
assert.deepEqual(ngo[0].sections.map(s => s.type), ['mission', 'programs', 'impact', 'contact'])

// shop -> the shop Home page
const shop = seedPageRows('store-2', 'shop')
assert.deepEqual(shop[0].sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.equal(shop[0].store_id, 'store-2')

// unknown / null / undefined -> shop set
assert.deepEqual(seedPageRows('s', 'bogus')[0].sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.deepEqual(seedPageRows('s', null)[0].sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.deepEqual(seedPageRows('s', undefined)[0].sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

console.log('seed-pages.test.ts: all assertions passed')
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/web && npx tsx lib/merchant/seed-pages.test.ts`
Expected: FAIL — cannot find module `./seed-pages`.

- [ ] **Step 4: Implement the seed-row builder**

Create `apps/web/lib/merchant/seed-pages.ts`:

```ts
// Pure builder for the `pages` rows seeded when a store is created. Kept
// separate from stores.ts so it's unit-testable without a DB (the insert
// itself lives in createStoreForUser and is best-effort).
import { getVertical, type SeedSection } from '@mcloud/verticals'

export interface SeedPageRow {
  store_id: string
  slug: string
  title: string
  position: number
  is_published: true
  sections: SeedSection[]
}

/** The default `pages` rows for a store of the given vertical. Unknown/null → shop. */
export function seedPageRows(storeId: string, type: string | null | undefined): SeedPageRow[] {
  return getVertical(type).defaultPages.map((page) => ({
    store_id: storeId,
    slug: page.slug,
    title: page.title,
    position: page.position,
    is_published: true as const,
    sections: page.sections,
  }))
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/web && npx tsx lib/merchant/seed-pages.test.ts`
Expected: PASS — prints `seed-pages.test.ts: all assertions passed`.

- [ ] **Step 6: Wire `type` + seeding into `createStoreForUser`**

Edit `apps/web/lib/merchant/stores.ts`.

Add imports at the top (after the existing `import { createClient } ...`):

```ts
import { isVerticalId } from '@mcloud/verticals'
import { seedPageRows } from './seed-pages'
```

Change the `createStoreForUser` signature's `input` type to add optional `type`:

```ts
export async function createStoreForUser(
    input: { orgId: string; name: string; slug: string; type?: string },
    userId: string,
): Promise<CreateStoreResult> {
```

Inside the function, right after `const slug = normalizeSlug(input.slug ?? '')`, resolve the validated type:

```ts
    const type = input.type && isVerticalId(input.type) ? input.type : 'shop'
```

Change the store insert (currently `.insert({ name, slug, org_id: input.orgId, owner_id: userId })`) to set `type`:

```ts
    const { data: store, error } = await supabase
        .from('stores')
        .insert({ name, slug, org_id: input.orgId, owner_id: userId, type })
        .select('id, slug')
        .single()
    if (error || !store) return { error: error?.message ?? 'Failed to create store', slug: null }
```

After the `store_members` insert (right before the final `return { error: null, slug: store.slug }`), add best-effort seeding:

```ts
    // Best-effort: seed the vertical's default pages. A failure here must never
    // block store creation — the storefront's vertical-aware fallback renders
    // the correct default even with no page row.
    const { error: seedError } = await supabase.from('pages').insert(seedPageRows(store.id, type))
    if (seedError) {
        console.error('[stores] default page seed failed (store still created):', seedError.message)
    }
```

- [ ] **Step 7: Re-run the seed test + typecheck web**

Run: `cd apps/web && npx tsx lib/merchant/seed-pages.test.ts`
Expected: PASS (unchanged).

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors — confirms the mobile route (`app/api/mobile/orgs/[orgSlug]/stores/route.ts`) and the web action still compile with the new **optional** param (Open Items 1 & 2: they pass no `type`; the `select('id, slug')` is unchanged; setting the extra `type` column doesn't disturb the returned columns).

- [ ] **Step 8: Build web**

Run: `npx turbo run build --filter=@mcloud/web`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json apps/web/lib/merchant/stores.ts apps/web/lib/merchant/seed-pages.ts apps/web/lib/merchant/seed-pages.test.ts
git commit -m "feat(stores): seed vertical default pages on create; accept optional type

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Full-suite verification + manual NGO smoke

Runs every SP3 test plus the pre-existing suites, a full build, and a manual smoke of an NGO store against the running app (per spec §8). No new production code — this task is the gate.

**Files:**
- None created/modified (verification only). May create a throwaway test store via SQL — noted as cleanup.

- [ ] **Step 1: Run every unit/Liquid test**

Run:
```bash
cd packages/verticals && npx tsx src/index.test.ts
cd ../liquid && npx tsx src/ngo-sections.test.ts && npx tsx src/sections-parity.test.ts && npx tsx src/index.test.ts
cd ../../apps/storefront && npx tsx lib/sections.test.ts && npx tsx lib/render-page.test.ts
cd ../web && npx tsx lib/merchant/seed-pages.test.ts
```
Expected: each prints its `all assertions passed` / success line; no failures.

- [ ] **Step 2: Full build of the affected graph**

Run: `npx turbo run build --filter=@mcloud/liquid --filter=@mcloud/verticals --filter=@mcloud/storefront --filter=@mcloud/web`
Expected: all four build successfully.

- [ ] **Step 3: Create an NGO test store with content**

Use the running Supabase (service-role). Either call `createStoreForUser({ orgId, name, slug, type: 'ngo' }, userId)` from a scratch script, or seed directly via SQL for a throwaway store. Minimum: a `stores` row with `type='ngo'` and `settings` containing mission/programs/impactStats/contact, e.g.:

```sql
update stores set type='ngo', settings = jsonb_build_object(
  'mission', 'End hunger in our region by 2030.',
  'programs', jsonb_build_array(
    jsonb_build_object('title','Clean Water','description','Wells for villages','image',''),
    jsonb_build_object('title','Schooling','description','Books and teachers','image','')
  ),
  'impactStats', jsonb_build_array(
    jsonb_build_object('label','People served','value','5,000'),
    jsonb_build_object('label','Villages','value','42')
  ),
  'contact', jsonb_build_object('email','hi@hope.org','phone','+254700000000','address','Nairobi')
) where slug = '<test-ngo-slug>';
```

(If you used `createStoreForUser` with `type:'ngo'`, a seeded `pages` home row already exists; if you only ran the SQL above, the vertical-aware fallback still renders the NGO home.)

- [ ] **Step 4: Smoke the NGO home (populated)**

Use the `run-mcloud` skill to start the app, then load `/store/<test-ngo-slug>`.
Expected: NGO home renders **mission** (statement), **programs** (Clean Water + Schooling cards), **impact** (5,000 / 42 stats), **contact** (email/phone/address). Container renders inside `data-liquid`. **0 hydration errors** (no Next dev overlay).

- [ ] **Step 5: Smoke the empty-settings guard**

Blank the NGO store's settings (`update stores set settings='{}'::jsonb where slug='<test-ngo-slug>'`) and reload.
Expected: **mission still renders** showing the store name (+ description if set); **programs, impact, contact render nothing** (empty-guarded). No layout gaps that imply an empty section box.

- [ ] **Step 6: Smoke a shop store (regression)**

Load an existing shop store's home (e.g. `/store/locd26`).
Expected: renders identically to SP2 — hero, collections, featured, all-products. The 19 legacy stores are unaffected.

- [ ] **Step 7: Clean up the test store**

If you created a throwaway store, delete it (and any seeded `pages` rows). If you flipped an existing store's `type`/`settings` for testing, restore them.

- [ ] **Step 8: Final commit (if any test store scaffolding scripts were added)**

Only if a scratch seeding script was committed; otherwise nothing to commit. Verification produces no production changes.

---

## Self-Review

**1. Spec coverage:**
- §1 `@mcloud/verticals` package → Task 1. ✓
- §1 four NGO section templates → Tasks 2 (mission), 3 (programs/impact), 4 (contact). ✓
- §1 vertical-aware registry + fallback → Task 5. ✓
- §1 `createStoreForUser` accepts `type`, seeds pages best-effort → Task 6. ✓
- §3.1 exact interface (`VerticalId`, `SeedSection`, `SeedPage`, `Vertical`, `VERTICALS`, `getVertical`, `isVerticalId`) → Task 1 verbatim. ✓
- §3.2 mission always-renders w/ store-name fallback; programs/impact/contact empty-guarded; reuse socialLinks → Tasks 2–4. ✓
- §3.3 extend `SectionType`, 4 registry entries `pickContext:{store}`, `defaultHomeSections(type)` replacing constant, keep const alias (grep: only home route + test use it) → Task 5. ✓
- §3.4 validate type via `isVerticalId`, default shop, set on insert, seed rows best-effort, log-and-continue → Task 6. ✓
- §8 tests: getVertical/isVerticalId (T1), defaultHomeSections (T5), NGO parity/guard (T2–4), registry (T5), seeding shape + best-effort (T6 shape; best-effort covered by the log-and-continue code + manual smoke), manual smoke (T7). ✓
- Open Items 1 & 2 (insert takes `type`, select unaffected; mobile route still compiles) → Task 6 Step 7 `tsc --noEmit`. ✓
- Open Item 3 (grep DEFAULT_HOME_SECTIONS callers) → resolved in-plan: only home route + test; convert to function + keep alias. ✓
- Open Item 4 (pin NGO settings keys + markup) → locked by Tasks 2–4 templates + parity tests: `mission`/`missionHeadline`, `programs[{title,description,image}]`, `impactStats[{label,value}]`, `contact{email,phone,address}`, `socialLinks[{platform,url}]`. ✓
- Non-goals (donations, onboarding UI, NGO tables, editing, backfill) → not in any task. ✓

**2. Placeholder scan:** No TBD/TODO/"add validation"/"similar to Task N"/"write tests for the above". Every code step shows full code; every run step shows the exact command + expected output. ✓

**3. Type consistency:**
- `SeedSection`/`SeedPage`/`Vertical`/`VERTICALS`/`getVertical`/`isVerticalId` defined in Task 1, consumed unchanged in Tasks 5 (`getVertical`) and 6 (`getVertical`, `isVerticalId`, `SeedSection`). ✓
- `defaultHomeSections(storeType?: string | null)` defined in Task 5, called with `rawStore.type` in the same task. ✓
- `seedPageRows(storeId, type)` returning `SeedPageRow[]` defined in Task 6, used in `createStoreForUser` same task; `is_published: true` typed as literal in both the interface and the builder. ✓
- Section `templateKey`s (`classic/sections/{mission,programs,impact,contact}`) match the `.liquid` filenames created in Tasks 2–4. ✓
- Settings keys are consistent across templates (Tasks 2–4) and their tests and the smoke SQL (Task 7): `mission`, `programs`, `impactStats`, `contact`, `socialLinks`. ✓

**One design note carried into the plan (not a spec gap):** `castStore` in the storefront drops the `type` column, so Task 5 Step 6 reads `rawStore.type` (raw row from `select('*')`) rather than the cast `store` — otherwise the fallback would always see `undefined` and default to shop. This is called out explicitly in the task.
