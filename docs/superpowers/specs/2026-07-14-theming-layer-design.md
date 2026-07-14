# SP6 — Finishing the theming layer

**Date:** 2026-07-14
**Status:** design, approved
**Sub-project:** SP6 of the storefront Liquid vertical roadmap

---

## 1. Problem

The theming layer is half-built, and the appearance settings page is only where it is most
visible.

**The appearance page exposes the data model as the interface.** `store_themes` has ten
colour columns, so the page renders ten hex pickers (six light, four dark) and asks a
non-designer to choose all of them, blind. "Preview store" is a link that opens the **live**
storefront in a new tab, unbound to the unsaved edits. The loop is: pick ten colours, save,
switch tab, reload, judge, repeat. The proof that this does not work: when theming Kisumu
Feminists Society, the theme was written with raw SQL rather than through this page, because
hand-deriving ten coordinated colours is exactly the work the page refuses to do.

**Every section heading is hardcoded.** "Support a Cause", "What We Do", "Our Impact", "Top
Picks", "Get in Touch", "Browse Everything", "Shop by Category". A merchant cannot change the
most prominent words on their own site. KFS says "Our Voices, Our Stories" everywhere, and
the theme forces them to say "Support a Cause". This is a worse limitation than not being
able to pick a muted grey.

**Three things exist in the model but nothing writes them:**

- `PageSection.settings?: Record<string, unknown>` is defined, is already passed to every
  template by `renderPage`, and is entirely unused. Per-section config is designed for and
  never wired.
- `store_themes.font_scale` is a column, is applied as `--sf-font-scale`, and no UI writes it.
- SP5's Content page authors `mission`, `programs`, `impactStats`, `contact`, `campaigns`,
  but **not** the hero keys. The NGO hero was made the lead section in SP5's follow-on work,
  so an NGO's most prominent copy is now settable only by SQL. This is a regression created
  by that change and must be closed.

**And one silent bug:** `storefront.css` reads `--sf-dark-accent` and `--sf-dark-secondary`,
but `store_themes` has **no such columns**. Both always fall back to hardcoded defaults, so a
merchant's accent colour silently reverts to `#c9a96e` in dark mode.

---

## 2. Goals

- A merchant picks a look without ever seeing a hex code, and sees the result as they choose.
- A merchant can rename any section heading on their own site.
- An NGO can author its hero (the first thing a visitor sees) from the admin.
- A merchant's accent survives dark mode.

**Non-goals:**

- A palette *editor* (reorder, save custom presets as reusable objects).
- Extracting a palette from an uploaded logo or a pasted URL. Tempting for a migration pitch,
  but it is a one-time onboarding move, not a settings screen. Deferred.
- Per-section *layout* config (column counts, image ratios). Copy only for now.
- Drag-to-reorder sections, or adding/removing sections from a page. The section list is
  still seeded. That is its own sub-project.
- Fixing the anon-key browser writes across the rest of the admin (blog, products, services,
  orders). Tracked separately under "route everything, no anon". SP6 does not expand that
  surface: its own writes go through a server action.

---

## 3. Context (what already exists)

- **`renderPage`** (`apps/storefront/lib/render-page.ts:16`) already passes
  `settings: s.settings ?? {}` into every section template. **The pipeline for per-section
  config is complete.** Nothing consumes it.
- **`PageSection`** (`apps/storefront/lib/sections.ts:21`) is `{ type: string; settings?:
  Record<string, unknown> }`.
- **`updateStoreSettings`** (settings/`actions.ts`) is the session-authorized, `canManage`-gated,
  service-role, field-whitelisted write to `stores.settings`. SP5 uses it.
- **`updateStoreTheme`** was written alongside this spec, in the same file: same authorization,
  plus **value validation** (hex / font-name / CSS-length regexes) because these values are
  interpolated into CSS custom properties, where an unvalidated string is a stored-XSS vector
  across every visitor to that store.
- **Dark mode** is a straight `prefers-color-scheme` remap of `--sf-dark-*` onto the same var
  names (`storefront.css:28-35`). A derive function needs to emit both halves, nothing more.
- **No colour library** is installed. The derive function will be a small pure module, which
  is preferable: testable, no new dependency.
- **Admin and storefront are different origins** (`mcloud.co.ke` vs `shop.mcloud.co.ke`, per
  `apps/web/lib/storefront-url.ts`). The preview cannot reach into the iframe; it must
  message it.

### 3.1 The `settings` name collision (load-bearing)

Five templates (`contact`, `hero`, `impact`, `mission`, `programs`) open with
`{%- assign settings = store.settings -%}`. Three (`campaigns`, `featured-products`,
`all-products`) do not. So the bare identifier `settings` means **the store's settings** in
five templates and **the section's settings** in three.

A spec that said "read the heading from `settings.heading`" would work in three templates and
silently fail in five, with no error. **The section's own config must therefore be exposed
under an unambiguous name.** `renderPage` will pass it as `section`, leaving `settings`
untouched for backwards compatibility.

---

## 4. Design

### Phase 1 — Editable section copy

**Render side.** `renderPage` passes the section's config as `section` (in addition to the
existing `settings`, which stays for compatibility):

```ts
body += await renderTemplate(def.templateKey, {
  ...def.pickContext(ctx),
  settings: s.settings ?? {},   // unchanged: store settings in 5 templates
  section: s.settings ?? {},    // new: unambiguous, the SECTION's own config
})
```

Each section template takes its heading and eyebrow from `section`, falling back to today's
hardcoded string so nothing changes for a store that has not set one:

```liquid
{%- assign heading = section.heading | default: 'Support a Cause' -%}
{%- assign eyebrow = section.eyebrow | default: 'Campaigns' -%}
```

Every section gets `heading` and `eyebrow`. Both are plain text, escaped by Liquid's default
output. Blank means "use the default", not "render an empty heading".

**Author side.** The Content page (SP5) grows a per-section copy block: for each section on
the page, a heading field and an eyebrow field, prefilled with the current default as the
placeholder so the merchant sees what it says today. Saving writes `pages.sections[i].settings`.

This is the only phase that touches `pages`, and it needs no migration: `sections` is already
`jsonb`.

### Phase 2 — Appearance page: presets, derive, preview

**Palette presets.** Roughly six curated palettes with plain names ("Warm gold on charcoal",
"Ink on paper", "Forest", ...), each a complete light+dark set, rendered as swatch rows. Most
merchants click one and are done, and never see a hex code.

**Derive from a brand colour.** One input ("What is your brand colour?") generates the other
nine, contrast-checked so foreground-on-background always clears WCAG AA (4.5:1). This is the
KFS path: paste `#EFC940`, get a coherent gold-on-dark theme. A pure module,
`apps/web/lib/palette.ts`:

```ts
export interface Palette {
  primary: string; secondary: string; accent: string
  background: string; foreground: string; muted: string
  darkPrimary: string; darkSecondary: string; darkAccent: string
  darkBackground: string; darkForeground: string; darkMuted: string
}
export function paletteFromBrand(hex: string): Palette
export function contrastRatio(a: string, b: string): number   // WCAG
export const PRESETS: readonly { id: string; name: string; palette: Palette }[]
```

**Advanced (disclosure).** Today's ten pickers, collapsed. Nothing is taken from anyone who
wants them. Plus the two currently-unexposed controls: **`font_scale`** (a density slider,
already applied as a CSS var and never writable) and the new dark accent/secondary.

**Live preview.** A pane with an iframe of the merchant's **real** storefront home. On change,
the parent `postMessage`s the pending theme; a listener in the storefront sets the `--sf-*`
properties on `document.documentElement`. No reload, so it updates as a colour picker is
dragged.

Security is load-bearing, because this is a cross-origin write into the customer-facing site:

- The listener **only mounts when the page is inside an iframe** (`window.parent !== window`).
- It **validates `event.origin`** against an admin-origin allowlist. Anything else is ignored.
- It sets **only** `--sf-*` custom properties, and only values matching the same hex / length /
  font-name patterns the server action validates. It can never inject markup or script.

A real visitor is never in an iframe from the admin, so the listener never activates for them.

### Phase 3 — Migration + NGO hero fields

**Migration** (additive, safe): add `dark_accent_color` and `dark_secondary_color` to
`store_themes`, defaulting to the current hardcoded fallbacks (`#c9a96e`, `#27272a`) so
existing stores are unchanged. This closes the silent dark-mode revert.

**NGO hero fields**: the Content page gains a Hero block for non-commerce verticals
(`heroTitle`, `heroSubtitle`, `heroImage`, `heroButtonText`), reusing the existing
`<ImageUpload>`. This closes the regression: the NGO hero is currently SQL-only.

---

## 5. Data flow

**Copy:** Content page edits a draft → Save → `updateStoreSettings` (store keys) and a new
page-sections write → `pages.sections[i].settings` → `renderPage` passes it as `section` →
template reads `section.heading`, falling back to its default.

**Theme:** Appearance page holds a pending palette → each change `postMessage`s to the preview
iframe (instant, unsaved) → Save → `updateStoreTheme` (authorized, validated, service-role) →
`store_themes` → the storefront layout emits `--sf-*` on the next real load.

---

## 6. Error handling

- A save failure surfaces inline and **retains the draft**, so a merchant never loses typed
  copy. (Same rule SP5 set.)
- The preview iframe failing to load must not block saving. The preview is an aid, not a gate.
- `paletteFromBrand` on an unparseable hex returns an error, not a broken palette. The input
  validates before it is applied.
- Invalid values are rejected by `updateStoreTheme` with a human-readable message, not
  silently coerced.

---

## 7. Testing

Repo convention: plain `node:assert` scripts run with `tsx` (not vitest, which reports "no
test suite found" against these files).

- `palette.test.ts` — `paletteFromBrand` produces a full 12-value palette; foreground on
  background clears 4.5:1 in **both** light and dark; a known brand colour (`#EFC940`) yields
  a gold accent rather than a muddy one; a bad hex is rejected.
- `render-page.test.ts` (extend) — a section's `settings` arrives as `section` **and** the
  existing `settings` key is unchanged (the collision guard).
- `sections.test.ts` (extend) — every registered section is reachable with a `section` config.
- Theme validation — `updateStoreTheme` rejects a non-hex colour, a font name with punctuation,
  and a bad length. This is the XSS boundary and must be tested, not assumed.

---

## 8. Risks

- **The `settings` collision.** Mitigated by passing the section config as `section`. Anyone
  extending a template must not reintroduce `assign settings = ...` in a way that shadows it.
  The render-page test pins this.
- **Cross-origin preview.** The storefront listener is a script that accepts data from another
  window. Origin validation and value validation are both required; either alone is
  insufficient.
- **Ships across two apps.** The storefront listener must be deployed before the admin preview
  is useful. Phase 2 is not shippable from `apps/web` alone.
- **Preset quality is a design judgement, not a correctness one.** Six mediocre palettes would
  leave merchants no better off than ten hex pickers. These need real care.
