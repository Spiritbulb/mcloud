# SP6 — The Editor: schema-driven settings with a live preview

**Date:** 2026-07-14
**Status:** design, approved
**Sub-project:** SP6 of the storefront Liquid vertical roadmap

---

## 1. Problem

Three symptoms, one cause.

**Every section heading is hardcoded.** "Support a Cause", "What We Do", "Our Impact", "Top
Picks". A merchant cannot change the most prominent words on their own site. Kisumu Feminists
Society say "Our Voices, Our Stories" everywhere, and the theme forces them to say "Support a
Cause".

**The appearance page exposes the data model as the interface.** `store_themes` has ten colour
columns, so the page renders ten hex pickers and asks a non-designer to choose all of them,
blind. It is 954 lines taking 44 props. Its "Preview store" link opens the **live** storefront
in a new tab, unbound to the unsaved edits. The proof that this does not work: KFS's theme was
written with raw SQL rather than through this page.

**Appearance and Content are two tabs for one job.** A merchant does not think "I will now
adjust my theme, and separately my content." They think *make my site look right*. Splitting
that in two is the same sin as the hex pickers: exposing the storage layout (`store_themes` vs
`pages.sections`) as the interface.

The common cause: **nothing declares what is configurable, so every configurable thing must be
hand-built in the admin.** Add a field, write a field. Add a section, write a form. The theming
layer has stalled with the model half-populated because each new knob costs admin code.

Shopify solved the declaration half with `{% schema %}` (a section declares its settings; the
editor UI is *generated*) and the presentation half with a **single theme editor**: preview in
the middle, settings rail beside it. Not an "Appearance" tab and a "Content" tab.

**This codebase is most of the way to the first half and does not know it.**
`SECTION_REGISTRY` is already a per-section declaration. `renderPage` already passes a
section's `settings` into its template. The pipeline exists; only the declaration is missing.

---

## 2. Goals

- **One Editor.** Preview at the centre, settings rail beside it. Replaces both the Appearance
  and Content tabs.
- A section (and the theme) **declares** its settings. The form is **generated** from that.
- Adding a configurable field is a registry change with **no admin code**.
- Editable section copy falls out of the mechanism, not as a special case.
- The merchant sees the result **as they make it**, on their real site.

**Non-goals:**

- **Palette presets / derive-from-brand-colour.** Real value, but it is a content problem
  ("which six palettes?") riding on this same generic-form mechanism. Follow-on. SP6 makes the
  appearance side *coherent and maintainable*; presets are what later make it *pleasant*.
- **Adding, removing or reordering sections on a page.** The rail lists the page's sections and
  edits them. It does not yet restructure the page. Its own sub-project.
- **Page-level settings** (SEO title, etc). No stated need.
- Fixing anon-key browser writes elsewhere in the admin (blog, products, orders). Tracked under
  "route everything, no anon". SP6 does not expand that surface: its writes go through server
  actions.

---

## 3. Context (verified against the running code, not assumed)

- **`renderPage`** (`apps/storefront/lib/render-page.ts:16`) **already** passes
  `settings: s.settings ?? {}` into every section template. The per-section config pipeline is
  complete and entirely unused.
- **`PageSection`** (`sections.ts:21`) is already `{ type: string; settings?: Record<string,
  unknown> }`.
- **`SECTION_REGISTRY`** (`sections.ts:39`) is already a per-section declaration of
  `{ templateKey, pickContext }`.
- **The home route** (`app/store/[slug]/page.tsx:150`) resolves its section list from the
  `pages` row, falling back to the vertical default. It does **not** read `searchParams`, so a
  preview override is purely additive at that line.
- **`updateStoreSettings`** / **`updateStoreTheme`** (settings/`actions.ts`) are the
  session-authorized, `canManage`-gated, service-role write paths. `updateStoreTheme` also
  **validates values** (hex / font-name / CSS-length): theme values are interpolated into CSS
  custom properties, where an unvalidated string is stored XSS across every visitor.
- **`store_themes` is fixed columns**, not JSON, so a theme schema maps field `id` → column
  name. (`puck_content` / `puck_pages` are dead columns from an abandoned page builder.)
- **The storefront sets no `X-Frame-Options` or `frame-ancestors`.** It can be iframed today,
  which means it can also be **clickjacked** today. SP6 makes framing load-bearing, so it
  replaces that silent permissiveness with an explicit allowlist (see §4.6).
- **A storefront home render costs ~1.6s warm in dev.** Reloading the iframe on every keystroke
  is not viable; this drives the split in §4.5.
- **Admin and storefront are different origins** (`mcloud.co.ke` vs `shop.mcloud.co.ke`). The
  preview cannot reach into the iframe. It must message it.

### 3.1 The `settings` collision (load-bearing, proven by running it)

Five templates (`contact`, `hero`, `impact`, `mission`, `programs`) open with
`{%- assign settings = store.settings -%}`. Three (`campaigns`, `featured-products`,
`all-products`) do not. The bare identifier `settings` therefore means **the store's settings**
in five templates and **the section's settings** in three.

Verified by running the real pipeline: a section-level `settings.heading` passed to
`programs.liquid` is **invisible** (shadowed), while the store data still renders. A design
that said "read `settings.heading`" would work in three templates and silently do nothing in
five, with no error anywhere.

**Section config must arrive under an unambiguous name.** `renderPage` passes it as `section`,
leaving `settings` untouched for compatibility.

---

## 4. Design

### 4.1 The schema type (the whole mechanism)

One shared, dependency-free type. A field declares what it is; the admin knows how to render
and validate it.

```ts
export type SettingField =
  | { id: string; type: 'text';     label: string; default?: string; placeholder?: string }
  | { id: string; type: 'textarea'; label: string; default?: string }
  | { id: string; type: 'color';    label: string; default?: string }
  | { id: string; type: 'font';     label: string; default?: string }
  | { id: string; type: 'image';    label: string }
  | { id: string; type: 'number';   label: string; default?: number; min?: number; max?: number }
  | { id: string; type: 'select';   label: string; options: { value: string; label: string }[]; default?: string }
  | { id: string; type: 'toggle';   label: string; default?: boolean }
```

That is the entire contract between "what is configurable" and "the form the merchant sees".

### 4.2 Sections declare their settings

```ts
export interface SectionDef {
  templateKey: string
  pickContext: (ctx: PageRenderContext) => Record<string, unknown>
  label: string              // human name for the rail ("Campaigns")
  schema?: SettingField[]    // the unlock
}

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

```ts
body += await renderTemplate(def.templateKey, {
  ...def.pickContext(ctx),
  settings: s.settings ?? {},   // unchanged: means store.settings in 5 templates
  section: s.settings ?? {},    // new: unambiguous, the section's own config
})
```

Templates read copy from `section`, falling back to today's hardcoded string, so a store that
has set nothing renders **exactly** as it does now:

```liquid
{%- assign heading = section.heading | default: 'Support a Cause' -%}
```

A blank value means "use the default", never "render an empty heading".

### 4.4 The Editor

One route replacing both `settings/appearance` and `settings/content`:

```
┌──────────────────────────────────────────────────────┐
│  Editor                                     [Save]   │
├───────────────┬──────────────────────────────────────┤
│  Theme        │                                      │
│    Colours    │                                      │
│    Fonts      │       the merchant's real site       │
│               │          (live, unsaved)             │
│  Sections     │                                      │
│    Hero       │                                      │
│    Programs   │                                      │
│    Campaigns  │                                      │
│    Contact    │                                      │
└───────────────┴──────────────────────────────────────┘
```

Selecting an entry in the rail shows its schema-generated form. **The same `<SettingsFields>`
renderer serves both**, because a theme field and a section field are both `SettingField`. The
954-line, 44-prop appearance component collapses into it.

The theme declares its settings the same way, mapping each `id` to its `store_themes` column:

```ts
export const THEME_SCHEMA: SettingField[] = [
  { id: 'primary_color', type: 'color',  label: 'Primary',      default: '#1c2228' },
  { id: 'accent_color',  type: 'color',  label: 'Accent',       default: '#c9a96e' },
  { id: 'heading_font',  type: 'font',   label: 'Heading font', default: 'Playfair Display' },
  { id: 'font_scale',    type: 'number', label: 'Text size',    default: 1, min: 0.8, max: 1.4 },
  // ...
]
```

`updateStoreTheme` whitelists against `THEME_SCHEMA` rather than a hand-maintained list, so the
two cannot drift. This also picks up **`font_scale`**, a real column already applied as
`--sf-font-scale` that no UI has ever written.

### 4.5 Live preview: two mechanisms, because they are two problems

**Theme → instant.** Colours, fonts, radius and scale are pure CSS custom properties. The
parent `postMessage`s the pending values; a listener in the storefront sets them on
`document.documentElement`. No reload. The preview updates as a colour picker is dragged.

**Copy → debounced reload.** A copy change requires re-running Liquid, which is server-side. A
storefront home render costs ~1.6s warm in dev, so reloading per keystroke is unusable. The
Editor debounces ~400ms after typing stops, then reloads the iframe with the pending section
config passed as an override at `page.tsx:150`.

The rejected alternative was emitting `data-section-setting` attributes and patching text nodes
in place, making copy instant too. It is a **second rendering path that will drift from the
Liquid truth**, and it only works for plain text, not images, toggles, or anything that changes
layout. A 400ms debounce that is always correct beats an instant one that is sometimes a lie.

### 4.6 Preview security (load-bearing)

This ships a script into the customer-facing storefront that accepts data from another window,
and a URL parameter that overrides what a page renders. Both need containment.

- **The `postMessage` listener only mounts when the page is inside an iframe**
  (`window.parent !== window`) **and** validates `event.origin` against an admin-origin
  allowlist. Anything else is ignored. A real visitor is never framed by the admin, so the
  listener never activates for them.
- It sets **only** `--sf-*` custom properties, and only values matching the same hex /
  length / font-name patterns the server action enforces. It cannot inject markup or script.
- **The section-config override is preview-only.** It is honoured solely for a request that is
  both framed and carries a valid short-lived preview token scoped to that store. Otherwise a
  crafted URL would let anyone hand a merchant's customers a restyled, re-worded version of
  their site: a defacement and phishing vector.
- **`frame-ancestors` is set to `'self'` plus the admin origin.** The storefront currently sets
  no framing headers at all, so it can be clickjacked today. Making framing load-bearing is the
  moment to replace that silent permissiveness with an explicit allowlist.

---

## 5. Data flow

**Theme:** rail edits a pending value → `postMessage` → iframe sets `--sf-*` (instant, unsaved)
→ Save → `updateStoreTheme` (authorized, schema-whitelisted, value-validated) → `store_themes`.

**Copy:** rail edits a pending value → debounce 400ms → iframe reloads with the pending section
config → Save → `pages.sections[i].settings` → `renderPage` passes it as `section` → template
reads `section.heading`, falling back to its default.

---

## 6. Error handling

- A save failure surfaces inline and **retains the draft**. A merchant never loses typed copy.
- **A preview failure never blocks saving.** The preview is an aid, not a gate. If the iframe
  fails to load, the rail still works and Save still writes.
- A section type with no schema renders no fields rather than throwing. Unknown section types
  are already skipped by `renderPage`.
- `updateStoreTheme` rejects an invalid value with a human-readable message rather than
  silently coercing it. This is the XSS boundary.
- A blank copy field falls back to the template default, never to an empty heading.

---

## 7. Testing

Repo convention: plain `node:assert` scripts run with `tsx` (not vitest, which reports "no test
suite found" against these files).

- **The collision guard** (`render-page.test.ts`): a section's config arrives as `section`,
  **and** `settings` still resolves to the store's settings in a template that shadows it. This
  is the bug that would otherwise ship silently.
- **Defaults match today's strings** (`sections.test.ts`): every schema `default` equals the
  string currently hardcoded in that template. Without this, every existing store's headings
  change the moment SP6 ships.
- **Schema integrity**: every registered section has a `label`; field `id`s are unique within a
  section; every `THEME_SCHEMA` field `id` is a real `store_themes` column (this is what stops
  the schema and the table drifting).
- **Theme validation**: `updateStoreTheme` rejects a non-hex colour, a font name containing
  punctuation, and a malformed length.
- **Preview gating**: the section-config override is ignored without a valid preview token.

---

## 8. Risks

- **The `settings` collision.** Proven real. Mitigated by the `section` namespace, pinned by a
  test. Anyone adding a template must not reintroduce a shadowing `assign`.
- **The preview is the expensive part**, and it now spans two apps: the storefront listener must
  be deployed before the Editor is useful. This is the cost of the merge, and it is worth it,
  but it is not free.
- **Schema/column drift** on the theme, mitigated by the id-is-a-real-column test.
- **Defaults drift** from template strings, mitigated by the defaults test.
- **SP6 makes the appearance side coherent, not beautiful.** A merchant still picks colours by
  hand. Presets are the follow-on that makes it pleasant. If the expectation is that SP6 makes
  theming *delightful*, it does not: it makes delightful theming *cheap to build*.
