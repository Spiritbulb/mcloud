# SP6 — Schema-driven settings

**Date:** 2026-07-14
**Status:** design, approved
**Sub-project:** SP6 of the storefront Liquid vertical roadmap

---

## 1. Problem

Two symptoms, one cause.

**Every section heading is hardcoded.** "Support a Cause", "What We Do", "Our Impact", "Top
Picks", "Get in Touch". A merchant cannot change the most prominent words on their own site.
Kisumu Feminists Society say "Our Voices, Our Stories" everywhere, and the theme forces them
to say "Support a Cause".

**The appearance page exposes the data model as the interface.** `store_themes` has ten colour
columns, so the page renders ten hex pickers and asks a non-designer to choose all of them,
blind. It is a 954-line component taking 44 props. The proof that it does not work: KFS's
theme was written with raw SQL rather than through this page.

The cause is the same in both cases. **Nothing declares what is configurable, so every
configurable thing must be hand-built in the admin.** Add a field to a section and you add a
field to the admin. Add a section and you add a form. This does not scale, and it is the
reason the theming layer has stalled with the model half-populated.

Shopify solved this with `{% schema %}`: a theme *declares* its settings, and the editor UI is
**generated** from that declaration. Nobody hand-builds a settings page per theme.

**This codebase is already most of the way there and does not know it.** `SECTION_REGISTRY` is
a per-section declaration. It just declares only how to *render* a section, not what is
*configurable* about it. And `renderPage` already passes a section's `settings` into its
template. The pipeline exists; the declaration is missing.

---

## 2. Goals

- A section declares its own settings. The admin form is **generated** from that declaration.
- Adding a configurable field to a section is a registry change, with **no admin code**.
- Editable section copy (heading, eyebrow) falls out of the mechanism, not as a special case.
- The theme's settings are likewise declared, replacing the 44-prop appearance component.

**Non-goals (deliberately cut, and why):**

- **Live cross-origin preview.** The most expensive piece (a listener shipped into the
  customer-facing storefront, `postMessage` across origins, origin *and* value validation,
  deploys spanning two apps) and the least structural. It is a bolt-on to a foundation that is
  not yet laid. It slots in cleanly once schemas exist, and it benefits from them. Deferred.
- **Palette presets / derive-from-brand-colour.** Real value, but it is a *content* problem
  (which six palettes?) sitting on top of this same generic-form mechanism. Follow-on.
- **Page-level settings** (SEO title, etc). No stated need.
- **Adding, removing or reordering sections on a page.** The section list is still seeded.
  Its own sub-project.
- Fixing the anon-key browser writes elsewhere in the admin. Tracked under "route everything,
  no anon". SP6 does not expand that surface: its own writes go through a server action.

---

## 3. Context (verified, not assumed)

- **`renderPage`** (`apps/storefront/lib/render-page.ts:16`) **already** passes
  `settings: s.settings ?? {}` into every section template. The per-section config pipeline is
  complete and entirely unused.
- **`PageSection`** (`sections.ts:21`) is already `{ type: string; settings?: Record<string,
  unknown> }`.
- **`SECTION_REGISTRY`** (`sections.ts:39`) is already a per-section declaration of
  `{ templateKey, pickContext }`.
- **`updateStoreSettings`** and **`updateStoreTheme`** (settings/`actions.ts`) are the
  session-authorized, `canManage`-gated, service-role write paths. `updateStoreTheme` also
  **validates values** (hex / font-name / CSS-length), because theme values are interpolated
  into CSS custom properties, where an unvalidated string is stored XSS across every visitor
  to that store.
- **`store_themes` is fixed columns**, not JSON. A theme schema therefore maps a field `id` to
  a column name. (`puck_content` / `puck_pages` are dead columns from an abandoned page
  builder and are not used.)

### 3.1 The `settings` name collision (load-bearing, proven)

Five templates (`contact`, `hero`, `impact`, `mission`, `programs`) open with
`{%- assign settings = store.settings -%}`. Three (`campaigns`, `featured-products`,
`all-products`) do not. So the bare identifier `settings` means **the store's settings** in
five templates and **the section's settings** in three.

This was verified by running the real pipeline: a section-level `settings.heading` passed to
`programs.liquid` is **invisible** (shadowed), while the store data still renders. A design
that said "read `settings.heading`" would work in three templates and silently do nothing in
five, with no error anywhere.

**Section config must therefore arrive under an unambiguous name.** `renderPage` will pass it
as `section`, leaving `settings` untouched for backwards compatibility.

---

## 4. Design

### 4.1 The schema type (the whole mechanism)

One shared, dependency-free type. A field declares what it is, and the admin knows how to
render and validate it:

```ts
export type SettingField =
  | { id: string; type: 'text';   label: string; default?: string; placeholder?: string }
  | { id: string; type: 'textarea'; label: string; default?: string }
  | { id: string; type: 'color';  label: string; default?: string }
  | { id: string; type: 'font';   label: string; default?: string }
  | { id: string; type: 'image';  label: string }
  | { id: string; type: 'number'; label: string; default?: number; min?: number; max?: number }
  | { id: string; type: 'select'; label: string; options: { value: string; label: string }[]; default?: string }
  | { id: string; type: 'toggle'; label: string; default?: boolean }
```

That is the entire contract between "what is configurable" and "the form the merchant sees".

### 4.2 Sections declare their settings

`SectionDef` gains one field:

```ts
export interface SectionDef {
  templateKey: string
  pickContext: (ctx: PageRenderContext) => Record<string, unknown>
  label: string              // human name for the admin ("Campaigns")
  schema?: SettingField[]    // <- the unlock
}
```

Every section declares its copy, at minimum:

```ts
campaigns: {
  templateKey: 'classic/sections/campaigns',
  label: 'Campaigns',
  pickContext: (ctx) => ({ store: ctx.store, campaigns: ctx.campaigns }),
  schema: [
    { id: 'heading', type: 'text', label: 'Heading', default: 'Support a Cause' },
    { id: 'eyebrow', type: 'text', label: 'Label',   default: 'Campaigns' },
  ],
},
```

### 4.3 Render side

`renderPage` passes the section's config under `section`, alongside the existing `settings`:

```ts
body += await renderTemplate(def.templateKey, {
  ...def.pickContext(ctx),
  settings: s.settings ?? {},   // unchanged: means store.settings in 5 templates
  section: s.settings ?? {},    // new: unambiguous, the section's own config
})
```

Templates read their copy from `section`, falling back to today's hardcoded string, so a store
that has set nothing renders exactly as it does now:

```liquid
{%- assign heading = section.heading | default: 'Support a Cause' -%}
```

A blank value means "use the default", never "render an empty heading".

### 4.4 The generated form (the payoff)

The Content page stops hand-rendering fields. It reads the page's section list, looks up each
section's schema, and renders a field per entry:

```
for each section on the page:
  <SettingsFields
    schema={SECTION_REGISTRY[section.type].schema}
    values={section.settings}
    onChange={...}
  />
```

`<SettingsFields>` is one component with a `switch` over `SettingField['type']`. Adding a
configurable field to a section is now a **two-line registry change**, and the UI grows a field
for free. No admin code, ever again.

### 4.5 Theme settings, same mechanism

The theme declares its settings with the same `SettingField[]`, mapping each field `id` to its
`store_themes` column:

```ts
export const THEME_SCHEMA: SettingField[] = [
  { id: 'primary_color',    type: 'color', label: 'Primary',    default: '#1c2228' },
  { id: 'accent_color',     type: 'color', label: 'Accent',     default: '#c9a96e' },
  ...
  { id: 'heading_font',     type: 'font',  label: 'Heading font', default: 'Playfair Display' },
  { id: 'font_scale',       type: 'number', label: 'Text size',  default: 1, min: 0.8, max: 1.4 },
]
```

The appearance page becomes the **same** `<SettingsFields>` renderer over `THEME_SCHEMA`. The
954-line, 44-prop component collapses. `updateStoreTheme` whitelists against the schema rather
than a hand-maintained list, so the two can never drift.

This also picks up two things nothing currently writes: **`font_scale`** (a real column,
already applied as `--sf-font-scale`, with no UI) and the dark colour fields.

> Note: this makes the appearance page *coherent and maintainable*, not yet *good*. A merchant
> still picks colours by hand. Presets and preview are the follow-on that makes it good, and
> they build on this.

---

## 5. Data flow

**Copy:** Content page reads `SECTION_REGISTRY[type].schema` → renders fields → merchant edits →
Save → `pages.sections[i].settings` → `renderPage` passes it as `section` → template reads
`section.heading`, falling back to its default.

**Theme:** Appearance page reads `THEME_SCHEMA` → renders fields → Save → `updateStoreTheme`
(authorized, schema-whitelisted, value-validated) → `store_themes` columns → storefront layout
emits `--sf-*`.

---

## 6. Error handling

- A save failure surfaces inline and **retains the draft**. A merchant never loses typed copy.
- A section type with no schema renders no fields, rather than throwing. An unknown section is
  already skipped by `renderPage`.
- `updateStoreTheme` rejects an invalid value with a human-readable message rather than
  silently coercing it. This is the XSS boundary.
- A blank copy field falls back to the template default, never to an empty heading.

---

## 7. Testing

Repo convention: plain `node:assert` scripts run with `tsx` (not vitest, which reports "no test
suite found" against these files).

- **The collision guard** (`render-page.test.ts`): a section's config arrives as `section`,
  **and** the existing `settings` key still resolves to the store's settings in a template that
  shadows it. This is the bug that would otherwise ship silently.
- **Schema/registry integrity** (`sections.test.ts`): every registered section has a `label`;
  every schema field has a unique `id` within its section; every `default` matches the string
  currently hardcoded in that template, so behaviour is unchanged for existing stores.
- **Theme schema** : every `THEME_SCHEMA` field `id` is a real `store_themes` column (this is
  what stops the schema and the table drifting).
- **Theme validation**: `updateStoreTheme` rejects a non-hex colour, a font name containing
  punctuation, and a malformed length.

---

## 8. Risks

- **The `settings` collision.** Proven real. Mitigated by the `section` namespace and pinned by
  a test. Anyone adding a template must not reintroduce a shadowing `assign`.
- **Schema/column drift** on the theme. Mitigated by the test asserting every field id is a
  real column.
- **Defaults must match today's hardcoded strings**, or every existing store's headings change
  the moment this ships. Pinned by a test.
- **This makes the appearance page maintainable, not beautiful.** If the expectation is that
  SP6 makes theming *pleasant*, it does not. It makes it *possible to build* pleasantly, and
  the presets/preview follow-on is where that lands.
