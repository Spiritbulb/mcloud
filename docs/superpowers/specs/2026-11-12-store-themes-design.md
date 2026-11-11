# Store themes: Classic 2, Studio, Soft (opt-in)

Date: 2026-11-12. Status: approved design, awaiting spec review.

## Goal

Give merchants a better-looking store without breaking anyone's live site.

- Ship three themes with their own layouts: **Classic 2** (a refresh of Classic), **Studio** (bold,
  image-led) and **Soft** (rounded, airy).
- Existing stores keep today's Classic until the owner opts in from the dashboard.
- New stores start on Classic 2 with good defaults.

Success means a merchant can preview a new theme on their real store, switch with one click, keep
their own colours, and switch back at any time.

## Scope

In scope: the Liquid home sections (all 12, shop and NGO), the store nav and footer, the Editor's
theme picker, the dashboard Update panel, and new-store defaults.

Out of scope for this release: the layouts of product list, product page, cart, checkout and blog.
They keep today's markup and only pick up each theme's colours, fonts and corner style.

## What "theme" means

Two layers stay separate, as they are today:

| Layer | Stored in | Changes | Picked in |
|---|---|---|---|
| Theme (layout) | `stores.settings.themeId` | markup of sections, nav and footer | Editor Theme tab, "Layout"; dashboard Update |
| Preset (look) | `store_themes` columns | colours, fonts, corners, text size | Editor Theme tab, "Presets" |

`themeId` already exists in settings and is read by the React fallback pages, but the Liquid home
ignores it today. Valid ids: `classic`, `classic-2`, `studio`, `soft`. A missing or unknown id means
`classic`, so every existing store is unchanged.

## Themes

Each theme is a folder `packages/liquid/themes/<id>/sections/*.liquid` with the same 12 section
files and the same inputs (`section.*`, the context each `pickContext` returns) as Classic. They all
honour the layout options added on 2026-11-12 (hero layout and height, columns, card style, hidden).

- **Classic 2.** Same editorial feel. More whitespace, a larger type scale, taller product images,
  a cleaner card with no divider lines, and a hero card with a softer overlay. Default preset:
  Classic (the store's existing look carries straight over).
- **Studio.** Full-width hero with an oversized headline over the image and no card, edge-to-edge
  product grids with tight gaps, uppercase eyebrows, a centred logo nav and a dark footer. Default
  preset: Bold. Suggested presets: Bold, Noir, Tech, Minimal.
- **Soft.** Rounded corners everywhere, pill buttons, soft shadows, centred section headings and
  warm tinted section backgrounds. Floating rounded nav. Default preset: Giving for NGOs, Market for
  shops. Suggested presets: Market, Craft, Giving.

Shared CSS stays in `storefront.css`. Theme-specific CSS is scoped under
`.storefront-root[data-sf-theme="<id>"]` so one theme's rules cannot leak into another.

## Components

1. **Theme registry** (`apps/storefront/lib/store-themes.ts`, pure, tested). Lists the themes with
   name, description, default preset per vertical and suggested presets. `resolveThemeId(settings)`
   returns a valid id, defaulting to `classic`. `templateKeyFor(themeId, file)` returns
   `<id>/sections/<file>` when that template exists in the manifest, else `classic/sections/<file>`.
2. **Section registry** (`lib/sections.ts`). `templateKey` becomes a file name (`hero`,
   `collections-grid`, ...) instead of a full key. `renderPage` resolves it with `templateKeyFor`
   using the store's theme. `product-card` is a partial, not a section: each theme's product
   sections `render` their own `<id>/sections/product-card` by literal path.
3. **Layout wrapper, nav and footer.** `LayoutWrapper` sets `data-sf-theme` on `.storefront-root`.
   `StoreNav` and `StoreFooter` take a `theme` prop and switch markup only where a theme differs
   (centred logo, dark footer, floating nav). Everything else is CSS. Inside the Editor's frame,
   `LayoutWrapper` also accepts an `mcloud:layout` message (same origin and framing checks as
   `PreviewListener`) carrying an unsaved theme id, so the nav and footer preview too.
4. **Editor.** The Theme tab gets a "Layout" picker above Presets, showing each theme's name,
   description and a small static thumbnail. Choosing one dispatches a normal `setting` edit on
   `themeId`, so it is undoable, previews through the existing `settings` preview payload, and
   saves through `patchStoreSettings`. A note under the picker lists that theme's suggested presets.
5. **Dashboard Update panel** (settings home). Shown when the store's resolved theme is `classic`.
   Text: "New designs are available for your store." Two buttons:
   - **Preview** opens the Editor with `?theme=classic-2`. The Editor starts with that `themeId` as
     an unsaved edit, so the preview shows it and nothing is written until Save.
   - **Update** calls a new server action `adoptTheme(slug, 'classic-2')`.
   A "Not now" link hides the panel for this browser (localStorage; it is only a convenience).
6. **`adoptTheme(slug, themeId)`** server action (storefront `settings/actions.ts`). Checks session,
   `requireStoreAccess` and `canManage`, validates the id against the registry, then:
   - writes `settings.themeId` (merged onto current settings, like `patchStoreSettings`);
   - if the store's theme row still equals the Classic preset (or has no row), also writes the new
     theme's default preset through the same validation as `updateStoreTheme`. A merchant who
     customised their colours keeps them;
   - calls `revalidateStore(slug)`.
   The decision "should the preset change too" is a pure function in `store-themes.ts`, tested.
7. **New stores.** `createStore` in `packages/merchant/src/stores.ts` writes
   `settings: { themeId: 'classic-2' }`. No `store_themes` row is needed: Classic 2's default preset
   is Classic, which is what the stylesheet renders with no row. Covers every path that uses
   `createStore`, including the WhatsApp bot.

## Data flow

Visitor: store layout reads `stores.settings.themeId` (already fetched), sets `data-sf-theme`, passes
the theme to nav and footer; `renderPage` resolves each section's template per theme. Public pages
stay ISR-cached; no new request-time reads.

Editor: `themeId` is part of `doc.settings`; a change goes into the `settings` preview payload the
preview route already verifies and merges. Save writes it with `patchStoreSettings`.

## Error handling

- Unknown or missing `themeId` renders Classic. Never an error.
- A missing template for a theme falls back to Classic for that section, logged once per render.
- If Liquid throws, the existing React fallback still renders the page.
- `adoptTheme` returns `{ error }` with a readable message; the panel shows it and keeps the button.

## Testing

- `store-themes.test.ts`: id resolution, fallback key, preset-change decision.
- Theme parity: the existing section suites (`sections-parity`, `section-variants`, `ngo-sections`,
  `campaigns-section`, hero tests) run once per theme, so each theme renders every section, its
  empty state, its layout options and the `#products` anchor.
- `render-page.test.ts`: anchors and hidden sections hold for every theme; Classic is unchanged.
- `adoptTheme`: pure decision covered above; access gating follows the existing action pattern.
- Editor reducer: `themeId` edit is one undo step (existing `setting` action, add a case).
- Manual: preview-route screenshots of each theme on a shop and an NGO store, desktop and phone.

## Delivery

1. Mechanism and Classic 2: registry, resolution, nav and footer hooks, Editor layout picker,
   dashboard panel, `adoptTheme`, new-store defaults.
2. Studio.
3. Soft.

Each step leaves CI green and is shippable on its own; the panel only offers themes that exist.

## Risks

- **Template drift.** Four copies of 12 sections can diverge. The parity suites running per theme
  are the guard; a new section type must be added to every theme or it falls back to Classic.
- **Cache.** A theme switch must call `revalidateStore`, or visitors see the old layout for up to an
  hour. `adoptTheme` and the Editor save both do.
- **Bundle size.** The themes manifest grows to about 50 templates. It is server-only, so it does
  not reach the browser.
