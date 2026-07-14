# SP6 — The Editor: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sections and the theme *declare* their settings; the admin form is *generated* from that declaration; both live in one Editor with a live preview of the merchant's real site.

**Architecture:** One `SettingField[]` type is the whole contract between "what is configurable" and "the form the merchant sees". `SectionDef` gains a `schema`, and a `THEME_SCHEMA` describes `store_themes`. A single `<SettingsFields>` renderer serves both, so the Appearance and Content tabs collapse into one Editor: preview iframe at the centre, schema-generated rail beside it. Theme edits preview instantly (CSS custom properties over `postMessage`); copy edits need a server re-render, so they debounce and reload the iframe.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, LiquidJS, Supabase, Tailwind v4, `node:assert` tests run with `tsx`.

**Spec:** `docs/superpowers/specs/2026-07-14-theming-layer-design.md`
**Branch:** `feat/merchant-vertical-admin`

## Global Constraints

- **Tests are plain `node:assert` scripts run with `tsx`.** No `describe`/`it`. A test passes by executing without throwing. Run one with `npx tsx <path>`. `npx vitest` reports "No test suite found" against these files; that is expected, not a failure.
- **`section`, never `settings`, for a section's own config.** Five templates (`contact`, `hero`, `impact`, `mission`, `programs`) open with `{%- assign settings = store.settings -%}`, which *shadows* any section-level `settings`. This was verified by running the pipeline: a section-level `settings.heading` passed to `programs.liquid` is invisible. Reading section config from `settings` would work in three templates and silently do nothing in five.
- **Schema defaults must equal the string currently hardcoded in the template, character for character.** Otherwise every existing store's headings change the moment this ships.
- **Templates render from the generated `packages/liquid/src/themes-manifest.ts`, not from disk.** Editing a `.liquid` file is a no-op until you run `npm run gen:manifest` in `packages/liquid`.
- **No new dependencies.** The colour/validation helpers are small pure modules.
- **Theme values are interpolated into CSS custom properties.** An unvalidated string is stored XSS across every visitor to that store. Validate on the server action *and* in the preview listener.
- **Merchant-facing copy says "site", never "store"/"shop".** No em dashes in user-facing copy.
- **Do not write to Supabase from the browser.** All writes go through the server actions in `settings/actions.ts`.

---

## File Structure

**Create:**
- `packages/verticals/src/schema.ts` — the `SettingField` type. Lives here because both apps import it and it is dependency-free.
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/page.tsx` — server page.
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx` — the Editor shell (rail + preview).
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/settings-fields.tsx` — the generic form renderer.
- `apps/web/lib/theme-schema.ts` — `THEME_SCHEMA` + the `store_themes` column mapping.
- `apps/storefront/lib/preview.ts` — preview-token mint/verify (pure).
- `apps/storefront/components/store/preview-listener.tsx` — the `postMessage` listener.
- `apps/storefront/lib/preview.test.ts`, `apps/web/lib/theme-schema.test.ts`.

**Modify:**
- `apps/storefront/lib/sections.ts` — `SectionDef` gains `label` + `schema`; populate all 9.
- `apps/storefront/lib/render-page.ts:16` — pass `section`.
- `packages/liquid/themes/classic/sections/*.liquid` — read heading/eyebrow from `section`.
- `apps/storefront/app/store/[slug]/page.tsx:150` — accept the preview section override.
- `apps/storefront/app/store/[slug]/layout.tsx` — mount the preview listener.
- `apps/storefront/next.config.ts` — `frame-ancestors`.
- `apps/web/.../settings/actions.ts` — `updateStoreTheme` whitelists against `THEME_SCHEMA`; add `updatePageSections`.
- `apps/web/.../settings/settings-shell.tsx` (via `packages/verticals/src/nav.ts`) — one **Editor** tab replaces Design + Content.

---

## Task 1: The `SettingField` type

**Files:**
- Create: `packages/verticals/src/schema.ts`
- Modify: `packages/verticals/src/index.ts`

**Interfaces:**
- Produces: `SettingField` (a discriminated union on `type`), `SettingValues = Record<string, unknown>`. Tasks 2, 3, 5, 6 all import it.

It lives in `@mcloud/verticals` because both `apps/web` (to render the form) and `apps/storefront` (to declare section schemas) import it, and that package is already a shared, dependency-free home for exactly this kind of declaration.

- [ ] **Step 1: Write the type**

Create `packages/verticals/src/schema.ts`:

```ts
// The contract between "what is configurable" and "the form the merchant sees".
// A section (or the theme) DECLARES its settings with these; the admin GENERATES
// the form from the declaration. Adding a configurable field must never require
// writing admin code.

export type SettingField =
  | { id: string; type: 'text';     label: string; default?: string; placeholder?: string }
  | { id: string; type: 'textarea'; label: string; default?: string; placeholder?: string }
  | { id: string; type: 'color';    label: string; default?: string }
  | { id: string; type: 'font';     label: string; default?: string }
  | { id: string; type: 'image';    label: string }
  | { id: string; type: 'number';   label: string; default?: number; min?: number; max?: number; step?: number }
  | { id: string; type: 'select';   label: string; options: { value: string; label: string }[]; default?: string }
  | { id: string; type: 'toggle';   label: string; default?: boolean }

/** The values a schema's fields hold, keyed by field id. */
export type SettingValues = Record<string, unknown>

/** A field's default, or undefined. Used to prefill a form and to fall back on render. */
export function defaultsFor(schema: readonly SettingField[]): SettingValues {
  const out: SettingValues = {}
  for (const f of schema) {
    if ('default' in f && f.default !== undefined) out[f.id] = f.default
  }
  return out
}
```

- [ ] **Step 2: Re-export**

Append to `packages/verticals/src/index.ts`:

```ts
export { defaultsFor } from './schema'
export type { SettingField, SettingValues } from './schema'
```

- [ ] **Step 3: Verify it compiles and nothing broke**

Run: `npx tsx packages/verticals/src/index.test.ts`
Expected: PASS (`verticals/index.test.ts: all assertions passed`).

- [ ] **Step 4: Commit**

```bash
git add packages/verticals/src/schema.ts packages/verticals/src/index.ts
git commit -m "feat(verticals): SettingField — the schema type the admin generates forms from"
```

---

## Task 2: Sections declare their schemas

**Files:**
- Modify: `apps/storefront/lib/sections.ts`
- Test: `apps/storefront/lib/sections.test.ts`

**Interfaces:**
- Consumes: `SettingField` from `@mcloud/verticals` (Task 1).
- Produces: `SectionDef` gains `label: string` and `schema?: readonly SettingField[]`. Task 5 (the rail) reads `SECTION_REGISTRY[type].label` and `.schema`.

**The defaults below are the exact strings currently hardcoded in each template.** They were read out of the templates, not invented. If a default does not match, that store's heading changes on deploy.

- [ ] **Step 1: Write the failing test**

Append to `apps/storefront/lib/sections.test.ts`:

```ts
// ── SP6: every section declares a label and a schema ──
import type { SettingField } from '@mcloud/verticals'

const EXPECTED_DEFAULTS: Record<string, { heading?: string; eyebrow?: string }> = {
  collections:     { heading: 'Shop by Category',  eyebrow: 'Collections' },
  featured:        { heading: 'Top Picks',         eyebrow: 'Featured Collection' },
  'all-products':  { heading: 'Browse Everything', eyebrow: 'All Products' },
  programs:        { heading: 'What We Do',        eyebrow: 'Programs' },
  impact:          { heading: 'Our Impact',        eyebrow: 'Impact' },
  contact:         { heading: 'Contact Us',        eyebrow: 'Get in Touch' },
  campaigns:       { heading: 'Support a Cause',   eyebrow: 'Campaigns' },
  mission:         { eyebrow: 'Our Mission' },
}

for (const [type, def] of Object.entries(SECTION_REGISTRY)) {
  assert.ok(def.label && def.label.length > 0, `${type} has a human label for the rail`)

  const ids = (def.schema ?? []).map((f: SettingField) => f.id)
  assert.equal(new Set(ids).size, ids.length, `${type} field ids are unique`)

  const expected = EXPECTED_DEFAULTS[type]
  if (!expected) continue

  for (const [fieldId, want] of Object.entries(expected)) {
    const field = (def.schema ?? []).find((f: SettingField) => f.id === fieldId)
    assert.ok(field, `${type} declares a "${fieldId}" field`)
    // This is the guard that stops every existing store's headings changing:
    // the schema default MUST equal what the template hardcodes today.
    assert.equal(
      (field as any).default, want,
      `${type}.${fieldId} default must equal the template's current string`,
    )
  }
}

console.log('sections.test.ts: SP6 schema assertions passed')
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx apps/storefront/lib/sections.test.ts`
Expected: FAIL — `hero has a human label for the rail` (labels do not exist yet).

- [ ] **Step 3: Add `label` + `schema` to the type**

In `apps/storefront/lib/sections.ts`, replace the `SectionDef` interface:

```ts
import type { SettingField } from '@mcloud/verticals'

export interface SectionDef {
  templateKey: string
  pickContext: (ctx: PageRenderContext) => Record<string, unknown>
  /** Human name, shown in the Editor rail. */
  label: string
  /**
   * What a merchant may configure on this section. The admin GENERATES its form
   * from this: adding a field here grows the UI with no admin code.
   *
   * A `default` MUST equal the string the template currently hardcodes, or every
   * existing store's copy changes the moment this ships.
   */
  schema?: readonly SettingField[]
}
```

- [ ] **Step 4: Populate all nine sections**

Replace `SECTION_REGISTRY` in `apps/storefront/lib/sections.ts`:

```ts
/** Heading + eyebrow, the two things every section shows. */
const copy = (heading: string, eyebrow: string): readonly SettingField[] => [
  { id: 'heading', type: 'text', label: 'Heading', default: heading },
  { id: 'eyebrow', type: 'text', label: 'Label above heading', default: eyebrow },
]

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    templateKey: 'classic/sections/hero',
    label: 'Hero',
    // Campaigns too: on a non-commerce site the hero CTA opens the donate flow
    // for the lead campaign instead of scrolling to products.
    pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }),
    // The hero's copy lives in store settings (heroTitle/heroSubtitle/heroImage),
    // not per-section, so it declares no heading/eyebrow.
    schema: [
      { id: 'buttonText', type: 'text', label: 'Button text' },
    ],
  },
  collections: {
    templateKey: 'classic/sections/collections-grid',
    label: 'Collections',
    pickContext: (ctx) => ({ store: ctx.store, collections: ctx.collections }),
    schema: [
      ...copy('Shop by Category', 'Collections'),
      { id: 'subheading', type: 'text', label: 'Subheading', default: 'Curated selections for every need' },
    ],
  },
  featured: {
    templateKey: 'classic/sections/featured-products',
    label: 'Featured products',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.featuredProducts }),
    schema: copy('Top Picks', 'Featured Collection'),
  },
  'all-products': {
    templateKey: 'classic/sections/all-products',
    label: 'All products',
    pickContext: (ctx) => ({ store: ctx.store, products: ctx.products }),
    schema: copy('Browse Everything', 'All Products'),
  },
  mission: {
    templateKey: 'classic/sections/mission',
    label: 'Mission',
    pickContext: (ctx) => ({ store: ctx.store }),
    // The mission's headline and body come from store settings
    // (missionHeadline / mission), so only the eyebrow is per-section.
    schema: [
      { id: 'eyebrow', type: 'text', label: 'Label above heading', default: 'Our Mission' },
    ],
  },
  programs: {
    templateKey: 'classic/sections/programs',
    label: 'Programs',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('What We Do', 'Programs'),
  },
  impact: {
    templateKey: 'classic/sections/impact',
    label: 'Impact',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('Our Impact', 'Impact'),
  },
  contact: {
    templateKey: 'classic/sections/contact',
    label: 'Contact',
    pickContext: (ctx) => ({ store: ctx.store }),
    schema: copy('Contact Us', 'Get in Touch'),
  },
  campaigns: {
    templateKey: 'classic/sections/campaigns',
    label: 'Campaigns',
    pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }),
    schema: copy('Support a Cause', 'Campaigns'),
  },
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx tsx apps/storefront/lib/sections.test.ts`
Expected: PASS, ending `sections.test.ts: SP6 schema assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/lib/sections.ts apps/storefront/lib/sections.test.ts
git commit -m "feat(storefront): sections declare their configurable settings"
```

---

## Task 3: `renderPage` passes `section`, and templates read it

**Files:**
- Modify: `apps/storefront/lib/render-page.ts:16`
- Modify: all 8 non-hero templates in `packages/liquid/themes/classic/sections/`
- Test: `apps/storefront/lib/render-page.test.ts`

**Interfaces:**
- Consumes: `PageSection.settings` (already exists).
- Produces: every section template renders `section.heading` / `section.eyebrow`, falling back to its hardcoded default.

**This is the task the whole plan hinges on.** Read the Global Constraint about `settings` shadowing before you start. It is not theoretical: it was reproduced by running the pipeline.

- [ ] **Step 1: Write the failing test**

Append to `apps/storefront/lib/render-page.test.ts`:

```ts
// ── SP6: section config arrives as `section`, and does NOT clobber `settings` ──
//
// Five templates open with `assign settings = store.settings`, which shadows any
// section-level `settings`. Verified by running this pipeline: a section-level
// `settings.heading` in programs.liquid is INVISIBLE. So section config must
// arrive under its own name, and the store's settings must keep working.

const ctxSp6: any = {
  store: {
    slug: 's', name: 'N',
    settings: { programs: [{ title: 'FROM_STORE_SETTINGS', description: 'd' }] },
  },
  products: [], collections: [], featuredProducts: [], campaigns: [],
}

// programs.liquid SHADOWS `settings`. Its heading must still be overridable.
const overridden = await renderPage(
  [{ type: 'programs', settings: { heading: 'OUR_PROGRAMMES', eyebrow: 'WHAT_WE_DO' } }],
  ctxSp6,
)
assert.ok(overridden.includes('OUR_PROGRAMMES'), 'section heading reaches a shadowing template')
assert.ok(overridden.includes('WHAT_WE_DO'), 'section eyebrow reaches a shadowing template')
assert.ok(!overridden.includes('What We Do'), 'the default is replaced, not appended')
assert.ok(
  overridden.includes('FROM_STORE_SETTINGS'),
  'the store settings still resolve — `section` must not break `settings`',
)

// No section config: the template renders exactly what it does today.
const bare = await renderPage([{ type: 'programs' }], ctxSp6)
assert.ok(bare.includes('What We Do'), 'falls back to the hardcoded default')
assert.ok(bare.includes('FROM_STORE_SETTINGS'), 'store settings unaffected')

// campaigns.liquid does NOT shadow settings — it must work the same way.
const camp = await renderPage(
  [{ type: 'campaigns', settings: { heading: 'GIVE' } }],
  { ...ctxSp6, campaigns: [{ id: 'c', title: 'T', hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '' }] },
)
assert.ok(camp.includes('GIVE'), 'works in a non-shadowing template too')
assert.ok(!camp.includes('Support a Cause'), 'default replaced')

// An empty string means "use the default", never "render an empty heading".
const blank = await renderPage([{ type: 'campaigns', settings: { heading: '' } }], {
  ...ctxSp6, campaigns: [{ id: 'c', title: 'T', hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '' }],
})
assert.ok(blank.includes('Support a Cause'), 'blank falls back to the default')

console.log('render-page.test.ts: SP6 section-namespace assertions passed')
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx apps/storefront/lib/render-page.test.ts`
Expected: FAIL — `section heading reaches a shadowing template` (nothing reads `section` yet).

- [ ] **Step 3: Pass `section` from renderPage**

In `apps/storefront/lib/render-page.ts`, replace line 16:

```ts
    body += await renderTemplate(def.templateKey, {
      ...def.pickContext(ctx),
      // `settings` is kept as-is: five templates reassign it to store.settings and
      // rely on that. The section's OWN config therefore needs an unambiguous name,
      // or it is silently shadowed in exactly those five.
      settings: s.settings ?? {},
      section: s.settings ?? {},
    })
```

- [ ] **Step 4: Read `section` in each template**

For each of the 8 templates below, add the assigns at the very top of the file (before any existing `assign`), then replace the hardcoded strings with the variables.

`packages/liquid/themes/classic/sections/campaigns.liquid` — add at the top:

```liquid
{%- assign heading = section.heading | default: 'Support a Cause' -%}
{%- assign eyebrow = section.eyebrow | default: 'Campaigns' -%}
```
then replace the literal `Campaigns` inside the `sf-badge-outline` span with `{{ eyebrow }}`, and `Support a Cause` inside the `<h2>` with `{{ heading }}`.

Apply the identical pattern to the others, using **exactly** these defaults:

| file | heading default | eyebrow default |
|---|---|---|
| `programs.liquid` | `What We Do` | `Programs` |
| `impact.liquid` | `Our Impact` | `Impact` |
| `contact.liquid` | `Contact Us` | `Get in Touch` |
| `featured-products.liquid` | `Top Picks` | `Featured Collection` |
| `all-products.liquid` | `Browse Everything` | `All Products` |
| `collections-grid.liquid` | `Shop by Category` | `Collections` |
| `mission.liquid` | *(none — heading comes from store settings)* | `Our Mission` |

`collections-grid.liquid` additionally has a subheading; add:
```liquid
{%- assign subheading = section.subheading | default: 'Curated selections for every need' -%}
```
and replace the literal `Curated selections for every need`.

**Note on `| default:`** — LiquidJS's `default` filter treats an empty string as falsy, which is exactly the behaviour we want (blank means "use the default", per the spec).

**Do not touch `hero.liquid`'s heading**: its copy comes from store settings, not per-section.

- [ ] **Step 5: Regenerate the manifest**

Templates render from the generated manifest, not from disk. Without this, your edits do nothing.

```bash
cd packages/liquid && npm run gen:manifest && cd ../..
```
Expected: `Generated themes-manifest with 11 templates.`

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx tsx apps/storefront/lib/render-page.test.ts`
Expected: PASS, ending `render-page.test.ts: SP6 section-namespace assertions passed`.

Also re-run the suite that renders real pages:
Run: `npx tsx apps/storefront/lib/sections.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/lib/render-page.ts apps/storefront/lib/render-page.test.ts packages/liquid/themes packages/liquid/src/themes-manifest.ts
git commit -m "feat(liquid): section copy is editable (section.heading, defaults unchanged)"
```

---

## Task 4: `THEME_SCHEMA` + schema-whitelisted theme writes

**Files:**
- Create: `apps/web/lib/theme-schema.ts`
- Test: `apps/web/lib/theme-schema.test.ts`
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.ts`

**Interfaces:**
- Consumes: `SettingField` from `@mcloud/verticals` (Task 1).
- Produces: `THEME_SCHEMA: readonly SettingField[]`, `THEME_COLUMNS: readonly string[]`. `updateStoreTheme(slug, values)` validates against the schema. Task 5 renders `THEME_SCHEMA`.

`updateStoreTheme` already exists in `actions.ts` (written alongside the spec) with a hand-maintained whitelist. This task points it at the schema so the two cannot drift.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/theme-schema.test.ts`:

```ts
import assert from 'node:assert/strict'
import { THEME_SCHEMA, THEME_COLUMNS, isValidThemeValue } from './theme-schema'

// Every field maps to a real store_themes column. This is what stops the schema
// and the table drifting apart.
const REAL_COLUMNS = new Set([
  'theme_id',
  'primary_color', 'secondary_color', 'accent_color',
  'background_color', 'foreground_color', 'muted_color',
  'dark_primary_color', 'dark_background_color', 'dark_foreground_color', 'dark_muted_color',
  'heading_font', 'body_font', 'border_radius', 'font_scale',
])
for (const f of THEME_SCHEMA) {
  assert.ok(REAL_COLUMNS.has(f.id), `${f.id} is a real store_themes column`)
}
const ids = THEME_SCHEMA.map((f) => f.id)
assert.equal(new Set(ids).size, ids.length, 'field ids are unique')
assert.deepEqual([...THEME_COLUMNS].sort(), ids.sort(), 'THEME_COLUMNS matches the schema')

// Validation is the XSS boundary: these values are interpolated into CSS custom
// properties, so anything that is not a plain colour/font/length is rejected.
assert.ok(isValidThemeValue('primary_color', '#EFC940'))
assert.ok(isValidThemeValue('primary_color', '#fff'))
assert.ok(!isValidThemeValue('primary_color', 'red'), 'named colours rejected')
assert.ok(!isValidThemeValue('primary_color', '#fff;}body{display:none'), 'CSS injection rejected')
assert.ok(!isValidThemeValue('primary_color', 'url(javascript:alert(1))'), 'url() rejected')

assert.ok(isValidThemeValue('heading_font', 'Quicksand'))
assert.ok(isValidThemeValue('heading_font', 'Playfair Display'))
assert.ok(!isValidThemeValue('heading_font', 'Evil"/><script>'), 'markup rejected')
assert.ok(!isValidThemeValue('heading_font', 'Foo;color:red'), 'punctuation rejected')

assert.ok(isValidThemeValue('border_radius', '8px'))
assert.ok(isValidThemeValue('border_radius', '0'))
assert.ok(!isValidThemeValue('border_radius', 'calc(100% - 2px)'), 'expressions rejected')

assert.ok(isValidThemeValue('font_scale', '1'))
assert.ok(isValidThemeValue('font_scale', '1.2'))
assert.ok(!isValidThemeValue('font_scale', '1;evil'), 'rejected')

assert.ok(!isValidThemeValue('not_a_field', 'x'), 'unknown field rejected outright')

console.log('theme-schema.test.ts OK')
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx apps/web/lib/theme-schema.test.ts`
Expected: FAIL — `Cannot find module './theme-schema'`.

- [ ] **Step 3: Implement**

Create `apps/web/lib/theme-schema.ts`:

```ts
// The theme's settings, declared once. The Editor GENERATES its form from this,
// and updateStoreTheme whitelists against it, so the form, the validator and the
// store_themes table cannot drift apart.
//
// Each field id IS the store_themes column name.

import type { SettingField } from '@mcloud/verticals'

export const THEME_SCHEMA: readonly SettingField[] = [
  { id: 'primary_color',           type: 'color',  label: 'Primary',          default: '#1c2228' },
  { id: 'secondary_color',         type: 'color',  label: 'Secondary',        default: '#f5f0eb' },
  { id: 'accent_color',            type: 'color',  label: 'Accent',           default: '#c9a96e' },
  { id: 'background_color',        type: 'color',  label: 'Background',       default: '#ffffff' },
  { id: 'foreground_color',        type: 'color',  label: 'Text',             default: '#1c2228' },
  { id: 'muted_color',             type: 'color',  label: 'Muted',            default: '#f4f4f5' },

  { id: 'dark_primary_color',      type: 'color',  label: 'Primary (dark)',    default: '#e8e0d8' },
  { id: 'dark_background_color',   type: 'color',  label: 'Background (dark)', default: '#0f0f10' },
  { id: 'dark_foreground_color',   type: 'color',  label: 'Text (dark)',       default: '#f0ece6' },
  { id: 'dark_muted_color',        type: 'color',  label: 'Muted (dark)',      default: '#1e1e20' },

  { id: 'heading_font',            type: 'font',   label: 'Heading font',      default: 'Playfair Display' },
  { id: 'body_font',               type: 'font',   label: 'Body font',         default: 'Inter' },
  { id: 'border_radius',           type: 'select', label: 'Corners',           default: '0px',
    options: [
      { value: '0px',  label: 'Square' },
      { value: '4px',  label: 'Slightly rounded' },
      { value: '8px',  label: 'Rounded' },
      { value: '16px', label: 'Very rounded' },
    ] },
  // A real column, applied as --sf-font-scale, that no UI has ever written.
  { id: 'font_scale',              type: 'number', label: 'Text size', default: 1, min: 0.8, max: 1.4, step: 0.05 },
]

/** The store_themes columns the Editor may write. Derived, never hand-maintained. */
export const THEME_COLUMNS: readonly string[] = THEME_SCHEMA.map((f) => f.id)

const HEX = /^#[0-9a-fA-F]{3,8}$/
const FONT = /^[A-Za-z0-9 ]{1,60}$/
const LENGTH = /^\d{1,3}(px|rem|em|%)?$/
const SCALE = /^\d(\.\d+)?$/

/**
 * Is `value` acceptable for the field `id`? These values are interpolated into
 * CSS custom properties on the storefront, so an unvalidated string is stored XSS
 * against every visitor to that store. Unknown ids are rejected outright.
 */
export function isValidThemeValue(id: string, value: string): boolean {
  const field = THEME_SCHEMA.find((f) => f.id === id)
  if (!field) return false

  switch (field.type) {
    case 'color':  return HEX.test(value)
    case 'font':   return FONT.test(value)
    case 'number': return SCALE.test(value)
    case 'select': return field.options.some((o) => o.value === value)
    default:       return LENGTH.test(value)
  }
}
```

- [ ] **Step 4: Point `updateStoreTheme` at the schema**

In `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.ts`, replace the whole `updateStoreTheme` function (and delete its now-unused local `HEX`/`FONT`/`LENGTH`/`COLOR_KEYS` constants and the `ThemePatch` type):

```ts
import { THEME_SCHEMA, isValidThemeValue } from '@/lib/theme-schema'

/**
 * Write a site's theme. Owner/admin only, service-role, and whitelisted against
 * THEME_SCHEMA rather than a hand-maintained list, so the form and the validator
 * cannot drift. Values are interpolated into CSS custom properties on the
 * storefront, so an unvalidated string is stored XSS across every visitor.
 */
export async function updateStoreTheme(
    slug: string,
    values: Record<string, string>,
): Promise<ActionResult> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not signed in' }

    const access = await requireStoreAccess(slug, session.user.id)
    if (access.error) return { error: 'Site not found' }
    if (!canManage(access.role)) return { error: 'Not authorized' }

    const update: Record<string, string> = {}
    for (const [id, value] of Object.entries(values)) {
        const field = THEME_SCHEMA.find((f) => f.id === id)
        if (!field) continue                      // not ours to write
        if (!isValidThemeValue(id, value)) {
            return { error: `That is not a valid value for ${field.label}.` }
        }
        update[id] = value
    }
    if (Object.keys(update).length === 0) return { error: null }

    const supabase = await createClient()
    const { error } = await supabase
        .from('store_themes')
        .upsert(
            { store_id: access.storeId, ...update, updated_at: new Date().toISOString() },
            { onConflict: 'store_id' },
        )
    return { error: error ? error.message : null }
}
```

- [ ] **Step 5: Add `updatePageSections` (the copy write path)**

Append to the same `actions.ts`:

```ts
/**
 * Replace a page's section list. Used by the Editor to save section copy. Only
 * the `settings` of each section may differ from what the page already has: the
 * Editor does not add, remove or reorder sections (that is a later sub-project),
 * so the section TYPES are checked against the stored page and a mismatch is
 * rejected rather than silently restructuring the merchant's page.
 */
export async function updatePageSections(
    slug: string,
    pageSlug: string,
    sections: { type: string; settings?: Record<string, unknown> }[],
): Promise<ActionResult> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not signed in' }

    const access = await requireStoreAccess(slug, session.user.id)
    if (access.error) return { error: 'Site not found' }
    if (!canManage(access.role)) return { error: 'Not authorized' }

    const supabase = await createClient()

    const { data: page } = await supabase
        .from('pages')
        .select('id, sections')
        .eq('store_id', access.storeId)
        .eq('slug', pageSlug)
        .maybeSingle()
    if (!page) return { error: 'Page not found' }

    const existing = (Array.isArray(page.sections) ? page.sections : []) as { type: string }[]
    const sameShape =
        existing.length === sections.length &&
        existing.every((s, i) => s.type === sections[i].type)
    if (!sameShape) return { error: 'The page layout changed. Reload and try again.' }

    const { error } = await supabase
        .from('pages')
        .update({ sections: sections as never, updated_at: new Date().toISOString() })
        .eq('id', page.id)
    return { error: error ? error.message : null }
}
```

- [ ] **Step 6: Run the tests**

Run: `npx tsx apps/web/lib/theme-schema.test.ts`
Expected: PASS (`theme-schema.test.ts OK`).

Run: `npx turbo build --filter=@mcloud/web`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/theme-schema.ts apps/web/lib/theme-schema.test.ts "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.ts"
git commit -m "feat(web): THEME_SCHEMA — theme writes whitelisted against the schema"
```

---

## Task 5: `<SettingsFields>` — the generic form renderer

**Files:**
- Create: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/settings-fields.tsx`

**Interfaces:**
- Consumes: `SettingField` from `@mcloud/verticals` (Task 1); `ImageUpload` from `@/components/store/image-upload`.
- Produces: `<SettingsFields schema values onChange storeId />`. Task 6 uses it for **both** the theme rail and every section rail.

**This is the payoff.** One `switch` over `SettingField['type']`. After this, a new configurable field anywhere is a registry line, never admin code.

`ImageUpload`'s real signature (do not guess): `{ value: string; pathInDb?: string; onChange: (url: string, path: string) => void; bucket?: 'store-assets' | 'product-images'; pathPrefix: string; label?: string; aspectRatio?: 'square' | 'wide' }`.

- [ ] **Step 1: Implement**

Create `editor/settings-fields.tsx`:

```tsx
'use client'

import ImageUpload from '@/components/store/image-upload'
import type { SettingField, SettingValues } from '@mcloud/verticals'

const inputCls =
    'w-full h-9 rounded-lg border border-[var(--md-sys-color-outline-variant)] ' +
    'bg-[var(--md-sys-color-surface)] px-3 text-[13px] text-[var(--md-sys-color-on-surface)] ' +
    'focus:outline-none focus:border-[var(--md-sys-color-primary)]'

/**
 * Renders a form from a schema. The ONE place a SettingField becomes a control.
 * Both the theme rail and every section rail use this, so adding a configurable
 * field anywhere is a registry change with no admin code.
 */
export default function SettingsFields({
    schema,
    values,
    onChange,
    storeId,
    pathPrefix,
}: {
    schema: readonly SettingField[]
    values: SettingValues
    onChange: (id: string, value: unknown) => void
    storeId: string
    pathPrefix: string
}) {
    if (schema.length === 0) {
        return (
            <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                Nothing to configure here yet.
            </p>
        )
    }

    return (
        <div className="space-y-4">
            {schema.map((f) => {
                // A blank value means "use the default", so show the default as the
                // placeholder rather than pre-filling it. The merchant sees what the
                // site says today, and clearing the box restores it.
                const raw = values[f.id]
                const str = typeof raw === 'string' ? raw : raw === undefined ? '' : String(raw)

                return (
                    <label key={f.id} className="block">
                        <span className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)] mb-1.5">
                            {f.label}
                        </span>

                        {f.type === 'text' && (
                            <input
                                className={inputCls}
                                value={str}
                                placeholder={f.placeholder ?? f.default ?? ''}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}

                        {f.type === 'textarea' && (
                            <textarea
                                className={inputCls.replace('h-9', 'min-h-20 py-2')}
                                rows={3}
                                value={str}
                                placeholder={f.placeholder ?? f.default ?? ''}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}

                        {f.type === 'color' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={str || f.default || '#000000'}
                                    onChange={(e) => onChange(f.id, e.target.value)}
                                    className="w-9 h-9 rounded-lg border border-[var(--md-sys-color-outline-variant)] cursor-pointer bg-transparent p-0"
                                />
                                <input
                                    className={inputCls + ' font-mono flex-1'}
                                    value={str}
                                    placeholder={f.default ?? ''}
                                    spellCheck={false}
                                    onChange={(e) => onChange(f.id, e.target.value)}
                                />
                            </div>
                        )}

                        {f.type === 'font' && (
                            <input
                                className={inputCls}
                                value={str}
                                placeholder={f.default ?? ''}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}

                        {f.type === 'number' && (
                            <input
                                type="range"
                                className="w-full"
                                min={f.min ?? 0}
                                max={f.max ?? 10}
                                step={f.step ?? 1}
                                value={str || String(f.default ?? f.min ?? 0)}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}

                        {f.type === 'select' && (
                            <select
                                className={inputCls}
                                value={str || f.default || ''}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            >
                                {f.options.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        )}

                        {f.type === 'toggle' && (
                            <input
                                type="checkbox"
                                checked={raw === undefined ? !!f.default : !!raw}
                                onChange={(e) => onChange(f.id, e.target.checked)}
                            />
                        )}

                        {f.type === 'image' && (
                            <ImageUpload
                                value={str}
                                onChange={(url) => onChange(f.id, url)}
                                bucket="store-assets"
                                pathPrefix={`${storeId}/${pathPrefix}/${f.id}`}
                                aspectRatio="wide"
                            />
                        )}
                    </label>
                )
            })}
        </div>
    )
}
```

- [ ] **Step 2: Build**

Run: `npx turbo build --filter=@mcloud/web`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/settings-fields.tsx"
git commit -m "feat(web): SettingsFields — one renderer turns any schema into a form"
```

---

## Task 6: Preview plumbing in the storefront

**Files:**
- Create: `apps/storefront/lib/preview.ts`, `apps/storefront/lib/preview.test.ts`
- Create: `apps/storefront/components/store/preview-listener.tsx`
- Modify: `apps/storefront/app/store/[slug]/page.tsx` (the section override), `layout.tsx` (mount the listener), `next.config.ts` (`frame-ancestors`)

**Interfaces:**
- Produces: `signPreview(storeId, secret)` / `verifyPreview(token, storeId, secret)`; `<PreviewListener />`. Task 7 (the Editor) posts to this and links the iframe with `?preview=...&token=...`.

**Security is the point of this task, not an aside.** It ships a script into the customer-facing site that accepts data from another window, and a URL parameter that overrides what a page renders. Both need containment, or a crafted URL lets someone hand a merchant's customers a restyled, re-worded version of their own site.

- [ ] **Step 1: Write the failing test**

Create `apps/storefront/lib/preview.test.ts`:

```ts
import assert from 'node:assert/strict'
import { signPreview, verifyPreview, isSafeCssValue } from './preview'

const SECRET = 'test-secret-do-not-use'

// A token is scoped to one store and verifiable.
const t = signPreview('store-a', SECRET)
assert.ok(verifyPreview(t, 'store-a', SECRET), 'a valid token verifies')

// It does NOT unlock a different store.
assert.ok(!verifyPreview(t, 'store-b', SECRET), 'token is scoped to its store')

// It cannot be forged without the secret.
assert.ok(!verifyPreview(t, 'store-a', 'wrong-secret'), 'a wrong secret fails')
assert.ok(!verifyPreview('garbage', 'store-a', SECRET), 'garbage fails')
assert.ok(!verifyPreview('', 'store-a', SECRET), 'empty fails')

// The listener must only ever apply plain CSS values.
assert.ok(isSafeCssValue('#EFC940'))
assert.ok(isSafeCssValue('Quicksand'))
assert.ok(isSafeCssValue('8px'))
assert.ok(isSafeCssValue('1.2'))
assert.ok(!isSafeCssValue('red; background: url(evil)'), 'no semicolons')
assert.ok(!isSafeCssValue('url(javascript:alert(1))'), 'no url()')
assert.ok(!isSafeCssValue('expression(alert(1))'), 'no expression()')
assert.ok(!isSafeCssValue('</style><script>'), 'no markup')

console.log('preview.test.ts OK')
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx apps/storefront/lib/preview.test.ts`
Expected: FAIL — `Cannot find module './preview'`.

- [ ] **Step 3: Implement**

Create `apps/storefront/lib/preview.ts`:

```ts
// lib/preview.ts
// The Editor renders the merchant's REAL site in an iframe with UNSAVED values.
// That means the storefront accepts (a) a section-config override on the URL and
// (b) theme values over postMessage. Both are containment problems: without them,
// a crafted URL would let anyone hand a merchant's customers a restyled, re-worded
// version of their own site.
//
// Pure (no Next/DB) so it is unit-testable.

import { createHmac, timingSafeEqual } from 'node:crypto'

/** A short-lived token proving the bearer may preview THIS store. */
export function signPreview(storeId: string, secret: string): string {
  const exp = Date.now() + 30 * 60 * 1000 // 30 minutes
  const payload = `${storeId}.${exp}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return `${exp}.${sig}`
}

export function verifyPreview(token: string, storeId: string, secret: string): boolean {
  if (!token) return false
  const [expStr, sig] = token.split('.')
  if (!expStr || !sig) return false

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false

  const expected = createHmac('sha256', secret).update(`${storeId}.${exp}`).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Is this safe to write into a CSS custom property? Colours, font names, lengths
 * and numbers only. Anything that could break out of the property value, or that
 * smuggles a url()/expression(), is rejected.
 */
export function isSafeCssValue(value: string): boolean {
  if (typeof value !== 'string' || value.length > 60) return false
  if (/[;{}<>()\\"']/.test(value)) return false
  return /^(#[0-9a-fA-F]{3,8}|[A-Za-z0-9 ]{1,60}|\d{1,3}(px|rem|em|%)?|\d(\.\d+)?)$/.test(value)
}
```

- [ ] **Step 4: The listener**

Create `apps/storefront/components/store/preview-listener.tsx`:

```tsx
'use client'

import { useEffect } from 'react'

/**
 * Applies UNSAVED theme values sent by the Editor, so a merchant sees a colour
 * change as they drag the picker. Theme values are CSS custom properties, so this
 * needs no re-render.
 *
 * Containment, all three of which are required:
 *   1. It only mounts inside an iframe. A real visitor is never framed by the
 *      admin, so for them this listener never activates at all.
 *   2. It validates event.origin against the admin origin. Anything else is ignored.
 *   3. It only ever sets --sf-* properties, and only values matching a plain
 *      colour/font/length. It can never inject markup or script.
 */
export default function PreviewListener({ adminOrigin }: { adminOrigin: string }) {
    useEffect(() => {
        // Not framed => not a preview => do nothing at all.
        if (typeof window === 'undefined' || window.parent === window) return

        const SAFE = /^(#[0-9a-fA-F]{3,8}|[A-Za-z0-9 ]{1,60}|\d{1,3}(px|rem|em|%)?|\d(\.\d+)?)$/

        function onMessage(e: MessageEvent) {
            if (e.origin !== adminOrigin) return
            const data = e.data
            if (!data || data.type !== 'mcloud:theme' || typeof data.values !== 'object') return

            for (const [key, value] of Object.entries(data.values as Record<string, unknown>)) {
                if (typeof value !== 'string') continue
                if (value.length > 60 || /[;{}<>()\\"']/.test(value)) continue
                if (!SAFE.test(value)) continue
                // Only ever --sf-*. Nothing else is writable.
                if (!/^[a-z-]+$/.test(key)) continue
                document.documentElement.style.setProperty(`--sf-${key}`, value)
            }
        }

        window.addEventListener('message', onMessage)
        // Tell the parent we are ready for values.
        window.parent.postMessage({ type: 'mcloud:preview-ready' }, adminOrigin)
        return () => window.removeEventListener('message', onMessage)
    }, [adminOrigin])

    return null
}
```

- [ ] **Step 5: Mount it, and accept the section override**

In `apps/storefront/app/store/[slug]/layout.tsx`, import and render it inside the storefront root (next to `LiquidScriptRunner` in `LayoutWrapper` is fine, but simplest is here in the layout):

```tsx
import PreviewListener from '@/components/store/preview-listener'
// ...inside the returned JSX, alongside the other providers:
<PreviewListener adminOrigin={process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'http://localhost:3000'} />
```

In `apps/storefront/app/store/[slug]/page.tsx`, the home page currently resolves its sections at line ~150:

```ts
        const homePage = await getPublishedPage(store.id, '')
        const sections = homePage?.sections?.length
            ? homePage.sections
            : defaultHomeSections(rawStore.type as string | null | undefined)
```

Change the page signature to accept `searchParams`, and let a **verified** preview override the section list:

```ts
export default async function StorePage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ preview?: string; token?: string }>
}) {
    // ...existing body...

    const { preview, token } = await searchParams

    const homePage = await getPublishedPage(store.id, '')
    let sections = homePage?.sections?.length
        ? homePage.sections
        : defaultHomeSections(rawStore.type as string | null | undefined)

    // The Editor previews UNSAVED copy. Honoured only with a token proving the
    // caller may preview THIS store: otherwise a crafted URL would let anyone
    // serve a merchant's customers a re-worded version of their own site.
    if (preview && token) {
        const secret = process.env.PREVIEW_SECRET
        if (secret && verifyPreview(token, store.id, secret)) {
            try {
                const parsed = JSON.parse(Buffer.from(preview, 'base64url').toString('utf-8'))
                if (Array.isArray(parsed)) sections = parsed
            } catch {
                // A malformed preview payload falls through to the real page.
            }
        }
    }
```

Import `verifyPreview` from `@/lib/preview` at the top.

- [ ] **Step 6: Lock down framing**

The storefront sets **no** framing headers today, so it can be clickjacked. Making framing load-bearing is the moment to fix that. In `apps/storefront/next.config.ts`, add:

```ts
  async headers() {
    const admin = process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'http://localhost:3000'
    return [
      {
        source: '/:path*',
        headers: [
          // The Editor frames us. Nobody else may.
          { key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${admin}` },
        ],
      },
    ]
  },
```

- [ ] **Step 7: Set the env vars**

Add to `apps/storefront/.env.local` and `apps/web/.env.local`:

```
NEXT_PUBLIC_ADMIN_ORIGIN=http://localhost:3000
PREVIEW_SECRET=<a long random string, same value in both apps>
```

Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

- [ ] **Step 8: Run the tests and build**

Run: `npx tsx apps/storefront/lib/preview.test.ts`
Expected: PASS (`preview.test.ts OK`).

Run: `npx turbo build --filter=@mcloud/storefront`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/storefront/lib/preview.ts apps/storefront/lib/preview.test.ts apps/storefront/components/store/preview-listener.tsx "apps/storefront/app/store/[slug]/page.tsx" "apps/storefront/app/store/[slug]/layout.tsx" apps/storefront/next.config.ts
git commit -m "feat(storefront): token-gated preview + frame-ancestors lockdown"
```

---

## Task 7: The Editor

**Files:**
- Create: `editor/page.tsx`, `editor/editor-client.tsx`
- Modify: `packages/verticals/src/nav.ts` (one Editor tab replaces Design + Content)
- Delete: nothing yet (the old pages stay reachable by URL until Task 8 removes them)

**Interfaces:**
- Consumes: `SettingsFields` (Task 5); `THEME_SCHEMA` (Task 4); `SECTION_REGISTRY` (Task 2); `updateStoreTheme` / `updatePageSections` (Task 4); `signPreview` (Task 6).

- [ ] **Step 1: The server page**

Create `editor/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { getVertical } from '@mcloud/verticals'
import { getStoreSettingsData } from '@/lib/store-data'
import { createClient } from '@mcloud/db/server'
import { signPreview } from '../../../../../../../apps/storefront/lib/preview'
import EditorClient from './editor-client'

export default async function EditorPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params

    const session = await getSession()
    if (!session?.user) redirect('/auth/login')

    const result = await getStoreSettingsData(session.user.id, storeSlug, orgSlug)
    if (result.error || !result.data) redirect(`/org/${orgSlug}/${storeSlug}/settings`)
    const store = result.data

    // The home page's section list is what the rail edits.
    const supabase = await createClient()
    const { data: page } = await supabase
        .from('pages')
        .select('sections')
        .eq('store_id', store.id)
        .eq('slug', '')
        .maybeSingle()

    const secret = process.env.PREVIEW_SECRET ?? ''
    const token = secret ? signPreview(store.id, secret) : ''

    const settings =
        store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings)
            ? (store.settings as Record<string, unknown>)
            : {}

    return (
        <EditorClient
            slug={storeSlug}
            storeId={store.id}
            theme={store.theme ?? {}}
            sections={(page?.sections as any) ?? []}
            previewToken={token}
            storefrontOrigin={process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? 'http://localhost:3001'}
            commerce={getVertical(store.type).commerce}
            storeSettings={settings}
        />
    )
}
```

**Note:** importing across app boundaries (`../../apps/storefront/lib/preview`) is ugly. If it does not resolve cleanly, move `preview.ts` into `packages/verticals/src/preview.ts` and import it from `@mcloud/verticals` in both apps. That is the better home anyway; do it if the relative import fights you.

- [ ] **Step 2: The Editor client**

Create `editor/editor-client.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SECTION_REGISTRY } from '../../../../../../../apps/storefront/lib/sections'
import { THEME_SCHEMA } from '@/lib/theme-schema'
import { updateStoreTheme, updatePageSections } from '../actions'
import SettingsFields from './settings-fields'
import ContentClient from '../content/content-client'
import type { SettingField, SettingValues } from '@mcloud/verticals'

type Section = { type: string; settings?: SettingValues }

// Three kinds of thing a merchant edits:
//   theme   -> store_themes columns (colours, fonts)
//   content -> stores.settings (mission, programs, campaigns) — SP5's editor,
//              mounted here rather than living on its own nav tab
//   section -> that section's own config (heading, eyebrow) in pages.sections
type Selection = { kind: 'theme' } | { kind: 'content' } | { kind: 'section'; index: number }

export default function EditorClient({
    slug, storeId, theme, sections: initialSections, previewToken, storefrontOrigin,
    commerce, storeSettings,
}: {
    slug: string
    storeId: string
    theme: Record<string, unknown>
    sections: Section[]
    previewToken: string
    storefrontOrigin: string
    /** From getVertical(store.type).commerce. A shop has no NGO content rail. */
    commerce: boolean
    /** stores.settings, for the Content rail (SP5's editor). */
    storeSettings: Record<string, unknown>
}) {
    const [selection, setSelection] = useState<Selection>({ kind: 'theme' })
    const [themeValues, setThemeValues] = useState<SettingValues>(() => ({ ...theme }))
    const [sections, setSections] = useState<Section[]>(() => initialSections)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    const iframeRef = useRef<HTMLIFrameElement>(null)

    // Theme -> instant. These are CSS custom properties, so the preview needs no
    // re-render: post them and the listener sets them on documentElement.
    useEffect(() => {
        const win = iframeRef.current?.contentWindow
        if (!win) return
        const values: Record<string, string> = {}
        for (const f of THEME_SCHEMA) {
            const v = themeValues[f.id]
            if (typeof v === 'string' && v) values[cssVarName(f.id)] = v
            else if (typeof v === 'number') values[cssVarName(f.id)] = String(v)
        }
        win.postMessage({ type: 'mcloud:theme', values }, storefrontOrigin)
    }, [themeValues, storefrontOrigin])

    // Copy -> debounced reload. A copy change needs Liquid re-run server-side
    // (~1.6s warm), so reloading per keystroke is unusable. Wait for a pause.
    const previewSrc = useMemo(() => {
        const payload = btoa(JSON.stringify(sections))
        return `${storefrontOrigin}/store/${slug}?preview=${encodeURIComponent(payload)}&token=${encodeURIComponent(previewToken)}`
    }, [sections, slug, previewToken, storefrontOrigin])

    const [debouncedSrc, setDebouncedSrc] = useState(previewSrc)
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSrc(previewSrc), 400)
        return () => clearTimeout(t)
    }, [previewSrc])

    async function onSave() {
        setSaving(true); setError(null)

        const themePatch: Record<string, string> = {}
        for (const f of THEME_SCHEMA) {
            const v = themeValues[f.id]
            if (v !== undefined && v !== '') themePatch[f.id] = String(v)
        }

        const a = await updateStoreTheme(slug, themePatch)
        const b = sections.length ? await updatePageSections(slug, '', sections) : { error: null }

        setSaving(false)
        const err = a.error ?? b.error
        // The draft is retained on failure: the merchant never loses typed copy.
        if (err) setError(err)
        else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    }

    // `content` renders SP5's ContentClient instead of a schema form, so it needs
    // no schema here.
    const active =
        selection.kind === 'theme'
            ? { label: 'Theme', schema: THEME_SCHEMA, values: themeValues as SettingValues }
            : selection.kind === 'section'
            ? {
                label: SECTION_REGISTRY[sections[selection.index]?.type as never]?.label ?? 'Section',
                schema: SECTION_REGISTRY[sections[selection.index]?.type as never]?.schema ?? [],
                values: sections[selection.index]?.settings ?? {},
            }
            : { label: 'Content', schema: [] as readonly SettingField[], values: {} as SettingValues }

    return (
        <div className="flex h-[calc(100vh-3.5rem)]">
            {/* Rail */}
            <aside className="w-72 shrink-0 border-r border-[var(--md-sys-color-outline-variant)] overflow-y-auto p-4 space-y-4">
                <button
                    onClick={() => setSelection({ kind: 'theme' })}
                    className={railCls(selection.kind === 'theme')}
                >
                    Theme
                </button>

                {/* SP5's store-settings content (mission, programs, impact stats,
                    contact, campaigns) lives in stores.settings, not in a section's
                    config, so no section schema covers it. It gets its own rail
                    entry rather than its own nav tab. */}
                {!commerce && (
                    <button
                        onClick={() => setSelection({ kind: 'content' })}
                        className={railCls(selection.kind === 'content')}
                    >
                        Content
                    </button>
                )}

                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)] mb-2">
                        Sections
                    </p>
                    <div className="space-y-1">
                        {sections.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => setSelection({ kind: 'section', index: i })}
                                className={railCls(selection.kind === 'section' && selection.index === i)}
                            >
                                {SECTION_REGISTRY[s.type as never]?.label ?? s.type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-[var(--md-sys-color-outline-variant)] space-y-3">
                    {selection.kind === 'content' ? (
                        // SP5's editor, reused wholesale. It owns its own save (it
                        // writes stores.settings through updateStoreSettings), so it
                        // is mounted as-is rather than folded into this page's Save.
                        <ContentClient
                            slug={slug}
                            storeId={storeId}
                            initialSettings={storeSettings}
                        />
                    ) : (
                        <>
                            <p className="text-[12px] font-medium">{active.label}</p>
                            <SettingsFields
                                schema={active.schema}
                                values={active.values}
                                storeId={storeId}
                                pathPrefix={selection.kind === 'theme' ? 'theme' : `sections/${selection.index}`}
                                onChange={(id, value) => {
                                    if (selection.kind === 'theme') {
                                        setThemeValues((v) => ({ ...v, [id]: value }))
                                    } else if (selection.kind === 'section') {
                                        setSections((prev) => {
                                            const next = [...prev]
                                            next[selection.index] = {
                                                ...next[selection.index],
                                                settings: { ...next[selection.index].settings, [id]: value },
                                            }
                                            return next
                                        })
                                    }
                                    setSaved(false)
                                }}
                            />
                        </>
                    )}
                </div>

                {error && (
                    <p className="text-[12px] text-[var(--md-sys-color-error)]">{error}</p>
                )}

                <button
                    onClick={onSave}
                    disabled={saving}
                    className="w-full h-9 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-semibold disabled:opacity-50"
                >
                    {saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
                </button>
            </aside>

            {/* Preview. A preview failure must never block saving. */}
            <div className="flex-1 bg-[var(--md-sys-color-surface-variant)] p-4">
                <iframe
                    ref={iframeRef}
                    src={debouncedSrc}
                    className="w-full h-full rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-white"
                    title="Site preview"
                />
            </div>
        </div>
    )
}

function railCls(active: boolean) {
    return [
        'w-full text-left px-3 h-9 rounded-lg text-[13px] transition-colors',
        active
            ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-medium'
            : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)]',
    ].join(' ')
}

/** store_themes column -> the --sf-* var the storefront reads. */
function cssVarName(columnId: string): string {
    return columnId
        .replace(/_color$/, '')
        .replace(/^dark_/, 'dark-')
        .replace(/_/g, '-')
}
```

**Verify `cssVarName` against the real vars** before trusting it: the storefront layout sets `--sf-primary`, `--sf-dark-primary`, `--sf-font-heading`, `--sf-font-body`, `--sf-font-scale`, `--sf-border-radius`. The mapping above handles the colours; **`heading_font` must map to `font-heading`, `body_font` to `font-body`, `font_scale` to `font-scale`, `border_radius` to `border-radius`**. Add those explicit cases rather than relying on the regex.

- [ ] **Step 3: One Editor tab replaces Design + Content**

In `packages/verticals/src/nav.ts`, in the `SITE` group replace the `appearance` tab, and drop the separate `CONTENT` group:

```ts
const SITE: NavSection = {
  id: 'site',
  label: 'Site',
  tabs: [
    { id: 'home', label: 'Overview', icon: 'home' },
    { id: 'general', label: 'General', icon: 'storefront' },
    // One Editor: theme and content are the same job ("make my site look right").
    // Future customisation surfaces land here as rail entries, not as new nav tabs.
    { id: 'editor', label: 'Editor', icon: 'edit_note' },
  ],
}
```

and change `sectionsFor` for the non-commerce case to drop `CONTENT`:

```ts
export function sectionsFor(vertical: Vertical): NavSection[] {
  return vertical.commerce
    ? [SITE, CATALOG, COMMERCE, ADVANCED, ACCOUNT]
    : [SITE, DONATIONS, ADVANCED, ACCOUNT]
}
```

Add `'editor'` to `ALL_TAB_IDS` and remove `'appearance'` and `'content'` only once nothing routes to them (Task 8).

- [ ] **Step 4: Update the nav test**

In `packages/verticals/src/nav.test.ts`, replace the assertions that expect a `content` tab:

```ts
assert.ok(tabIds(ngo).includes('editor'), 'ngo has the Editor')
assert.ok(tabIds(shop).includes('editor'), 'shop has the Editor too')
assert.ok(!ids(ngo).includes('content'), 'the separate Content group is gone')
```

- [ ] **Step 5: Run tests and build**

```bash
npx tsx packages/verticals/src/nav.test.ts
npx turbo build --filter=@mcloud/web
```
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor" packages/verticals/src/nav.ts packages/verticals/src/nav.test.ts
git commit -m "feat(web): the Editor — one surface for theme and content, with a live preview"
```

---

## Task 8: Verify end to end, then retire the old pages

**This is the task that proves SP6 works.** Do not skip to the deletion.

- [ ] **Step 1: Run every test**

```bash
for f in packages/verticals/src/index.test.ts packages/verticals/src/nav.test.ts \
         apps/web/lib/content-draft.test.ts apps/web/lib/theme-schema.test.ts \
         apps/storefront/lib/preview.test.ts apps/storefront/lib/fonts.test.ts \
         apps/storefront/lib/campaigns.test.ts apps/storefront/lib/sections.test.ts \
         apps/storefront/lib/render-page.test.ts apps/storefront/lib/liquid-context.test.ts \
         apps/storefront/lib/orders.test.ts; do
  npx tsx "$f" >/dev/null 2>&1 && echo "PASS $f" || echo "FAIL $f"
done
```
Expected: all PASS.

- [ ] **Step 2: Build both apps**

Run: `npx turbo build --filter=@mcloud/web --filter=@mcloud/storefront`
Expected: PASS.

- [ ] **Step 3: Drive it**

Start both (`--port 3000` web, `--port 3001` storefront), log in as the owner of the NGO site `kfs`, and open its Editor.

1. The nav shows **Editor**, and no separate Design or Content tab.
2. The preview iframe loads the real KFS site.
3. Selecting **Theme** and dragging the Accent colour changes the preview **instantly**, with no reload.
4. Selecting **Campaigns** and typing a new Heading updates the preview **after a short pause** (the debounce), and the new heading appears in the rendered page.
5. **Save**, reload the public site at `/store/kfs`, and confirm the heading persisted.
6. Clearing the Heading and saving restores **"Support a Cause"** (blank means default, never an empty heading).

- [ ] **Step 4: Prove the preview cannot be abused**

This is the security claim. Test it, do not assume it.

```bash
# A preview payload WITHOUT a token must be ignored: the real page renders.
curl -s "http://localhost:3001/store/kfs?preview=$(echo -n '[{"type":"campaigns","settings":{"heading":"HACKED"}}]' | base64 -w0)" | grep -c "HACKED"
```
Expected: **0**. If this prints anything else, the override is not gated and anyone can re-word a merchant's live site with a URL. Stop and fix it.

- [ ] **Step 5: Confirm a shop is unregressed**

Open the shop site `locd26`: its Editor must show its own sections (Hero, Collections, Featured, All products), and its public storefront must still say **Top Picks** and **Browse Everything** (no store has set copy, so every default must be unchanged).

- [ ] **Step 6: Retire the Appearance page only**

Delete, once the above passes:
- `settings/appearance/page.tsx` and `settings/appearance/appearance-settings-page.tsx`
- `apps/web/components/store/appearance-settings.tsx` (954 lines, 44 props)

Then remove `'appearance'` from `ALL_TAB_IDS` in `packages/verticals/src/nav.ts`.

Run: `npx turbo build --filter=@mcloud/web`
Expected: PASS. A failure means something still imports the deleted files; repoint it.

**Do NOT delete `settings/content/`.** Task 7 mounts it inside the Editor (see Task 7 Step 2's
"Content" rail entry). It still owns the **store-settings** content that SP5 authored (mission,
programs, impact stats, contact, campaigns) — content that lives in `stores.settings`, not in a
section's config, and that no section schema covers. Its route is gone from the nav; its
component lives on inside the Editor.

- [ ] **Step 7: Commit and push**

```bash
git add -A
git commit -m "refactor(web): retire the Appearance page (superseded by the Editor)"
git push -u origin feat/merchant-vertical-admin
```

---

## Self-review

**Spec coverage:**
- `SettingField` type → Task 1 ✓
- Sections declare schemas; defaults match templates → Task 2 (+ test) ✓
- `section` namespace, collision guard → Task 3 (+ test) ✓
- `THEME_SCHEMA`, schema-whitelisted writes, `font_scale` → Task 4 ✓
- Generic `<SettingsFields>` renderer → Task 5 ✓
- Preview: token gate, origin+value validation, `frame-ancestors` → Task 6 (+ test) ✓
- One Editor replacing both tabs; preview instant for theme, debounced for copy → Task 7 ✓
- End-to-end verification incl. the abuse test → Task 8 ✓

**The store-settings gap, resolved:** SP5's Content page edits content that lives in
`stores.settings` (mission, programs, impact stats, contact, campaigns), which a *section*
schema does not and should not cover — it is store content, not section config. Rather than
lose that authoring or leave it as an unresolved note, Task 7 mounts SP5's `ContentClient`
inside the Editor as a **Content** rail entry (non-commerce verticals only). It keeps its own
save path (`updateStoreSettings`), so the Editor's Save is not entangled with it. Task 8
therefore retires only the **Appearance** page; `settings/content/` loses its nav tab but its
component lives on inside the Editor.

**Deferred (spec non-goals):** palette presets / derive-from-brand-colour; adding, removing or reordering sections; page-level settings.

**Type consistency:** `SettingField`/`SettingValues`/`defaultsFor` (Task 1) are used with those names in 2, 4, 5, 7. `SectionDef.label`/`.schema` (Task 2) are read in Task 7. `THEME_SCHEMA`/`isValidThemeValue` (Task 4) are used in 5 and 7. `signPreview`/`verifyPreview`/`isSafeCssValue` (Task 6) are used in 6 and 7. `ImageUpload`'s props are copied from its real signature.
