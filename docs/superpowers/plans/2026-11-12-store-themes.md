# Store Themes (Classic 2, Studio, Soft) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three opt-in store themes with their own home, nav and footer layouts, switched from the Editor or a dashboard Update button, with existing stores unchanged until they opt in.

**Architecture:** A theme is a folder of Liquid sections (`packages/liquid/themes/<id>/sections`). The store's `settings.themeId` picks the folder; each section falls back to `classic` when a theme lacks it. A pure registry in the storefront (`lib/store-themes.ts`) owns ids, names, default presets and the adoption rule; the Editor, dashboard and renderer all read it.

**Tech Stack:** Next 16 App Router, React 19, liquidjs 10, Tailwind 4, `node:test` + `assert`.

**Spec:** `docs/superpowers/specs/2026-11-12-store-themes-design.md`

## Global Constraints

- Theme ids are exactly `classic`, `classic-2`, `studio`, `soft`. Missing or unknown resolves to `classic`.
- `classic` output must stay byte-identical for a store with no `themeId` (existing tests pin it).
- Every theme provides the same 12 files as Classic: 11 sections (`hero`, `collections-grid`, `featured-products`, `all-products`, `services`, `gallery`, `mission`, `programs`, `impact`, `contact`, `campaigns`) plus the `product-card` partial. Same inputs, same layout options (`layout`, `height`, `columns`, `card_style`, `hidden`).
- Each theme's section root element carries the class `sf-t-<id>`; Classic's does not (byte-identical rule).
- Theme CSS is scoped under `.storefront-root[data-sf-theme="<id>"]`.
- Default presets: `classic-2` → `classic`; `studio` → `bold`; `soft` → `market` for shops, `giving` for NGOs.
- Suggested presets: `classic-2` → classic, craft, minimal; `studio` → bold, noir, tech, minimal; `soft` → market, craft, giving.
- Panel copy: "New designs are available for your store." Buttons: "Preview", "Update", link "Not now".
- Nothing under `app/(storefront)/store/[slug]` may read cookies, headers or searchParams (public-cache test). The Editor page may.
- After `templates` change: `npm run gen:manifest -w @mcloud/liquid`.
- Run CI as `npx turbo run typecheck lint test --concurrency=1`, never alongside a dev server (the machine has 7 GB).
- Commits follow `type(scope): summary`. Work on branch `feat/store-themes`.

## Review Focus

1. A store whose `themeId` is a theme not yet released (`studio` set by hand before Task 9) must render Classic sections, not a blank page. Test in Task 3.
2. A merchant with custom colours presses Update: colours must not change. Test in Task 2 (`presetForAdoption`) and Task 6.
3. Undo after picking a layout in the Editor restores the previous `themeId` in one step and the preview follows. Test in Task 5.
4. An `mcloud:layout` message from another origin, or with an unknown id, or when not framed, is ignored. Test in Task 4.
5. NGO store on Studio or Soft renders all NGO sections with no commerce markup (`#products`, "Shop now"). Covered by running `ngo-sections` and the render-page hero tests per theme (Tasks 1 and 3).

---

### Task 1: Liquid helpers and per-theme test harness

**Files:**
- Modify: `packages/liquid/src/index.ts`
- Modify: `packages/liquid/src/sections-parity.test.ts`, `section-variants.test.ts`, `ngo-sections.test.ts`, `campaigns-section.test.ts`, `hero-slide-init.test.ts`
- Test: `packages/liquid/src/index.test.ts`

**Interfaces:**
- Produces: `hasTemplate(key: string): boolean`; `themeIds(): string[]` (folders that have `sections/hero`, sorted, `classic` first).

- [ ] **Step 1:** In `index.test.ts`, assert `hasTemplate('classic/sections/hero') === true`, `hasTemplate('nope/sections/hero') === false`, and `themeIds()[0] === 'classic'`.
- [ ] **Step 2:** Run `node --import ../../../scripts/ts-resolve.mjs index.test.ts` from `packages/liquid/src`. Expected: FAIL, `hasTemplate` is not exported.
- [ ] **Step 3:** Implement both in `index.ts` from `themeFiles` keys.
- [ ] **Step 4:** Wrap each of the five suites in `for (const theme of themeIds())`, replacing the literal `classic/` prefix with `` `${theme}/` `` and prefixing each test name with the theme. `hero-slide-init.test.ts` reads `themes/${theme}/sections/hero.liquid` from disk. Assertions on Classic-only copy stay inside `if (theme === 'classic')`.
- [ ] **Step 5:** Run `npm test -w @mcloud/liquid`. Expected: PASS, every test reported once (only `classic` exists).
- [ ] **Step 6:** Commit `test(liquid): run section suites once per theme`.

### Task 2: Theme registry

**Files:**
- Create: `apps/storefront/lib/store-themes.ts`
- Test: `apps/storefront/lib/store-themes.test.ts`

**Interfaces:**
- Consumes: `THEME_PRESETS`, `activePreset` from `lib/theme-presets.ts`.
- Produces:
  - `type StoreThemeId = 'classic' | 'classic-2' | 'studio' | 'soft'`
  - `interface StoreThemeDef { id: StoreThemeId; name: string; description: string; defaultPreset: { shop: string; ngo: string }; suggestedPresets: string[]; released: boolean }`
  - `STORE_THEMES: readonly StoreThemeDef[]`, in the order classic-2, studio, soft, classic. `classic` is named "Classic (original)".
  - `resolveThemeId(settings: unknown): StoreThemeId`
  - `isStoreThemeId(v: unknown): v is StoreThemeId`
  - `templateKeyFor(themeId: StoreThemeId, file: string, has: (key: string) => boolean): string`
  - `presetForAdoption(currentTheme: Record<string, unknown>, target: StoreThemeId, commerce: boolean): Record<string, string> | null`
  - `UPGRADE_TARGET: StoreThemeId = 'classic-2'`
- This file must not import `@mcloud/liquid` (the Editor and dashboard are client components). `has` is injected.

- [ ] **Step 1: Write the failing tests:**
  - `resolveThemeId(undefined)`, `({})`, `({ themeId: 'bogus' })`, `({ themeId: 5 })` all return `'classic'`; `({ themeId: 'soft' })` returns `'soft'`.
  - `templateKeyFor('studio', 'hero', () => true) === 'studio/sections/hero'`; with `() => false` it is `'classic/sections/hero'`; `templateKeyFor('classic', 'hero', () => false) === 'classic/sections/hero'`.
  - `presetForAdoption({}, 'studio', true)` deep-equals the `bold` preset's values; `presetForAdoption({}, 'soft', false)` equals `giving`; `presetForAdoption({}, 'soft', true)` equals `market`.
  - `presetForAdoption({ ...classicValues, primary_color: '#123456' }, 'studio', true) === null` (customised colours kept).
  - `presetForAdoption(noirValues, 'studio', true) === null` (already on a non-Classic preset).
  - Every `defaultPreset` and `suggestedPresets` id exists in `THEME_PRESETS`.
  - Ids are unique and equal the `StoreThemeId` union; `classic.released === true`.
- [ ] **Step 2:** Run `node --import ../../scripts/ts-resolve.mjs lib/store-themes.test.ts` from `apps/storefront`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement. `presetForAdoption` returns the target's default preset values only when `activePreset(currentTheme)?.id === 'classic'`. Set `released` true for `classic` only.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat(storefront): store theme registry`.

### Task 3: Render sections per theme

**Files:**
- Modify: `apps/storefront/lib/sections.ts` (`templateKey` → `file`), `apps/storefront/lib/render-page.ts`
- Test: `apps/storefront/lib/render-page.test.ts`, `apps/storefront/lib/sections.test.ts`

**Interfaces:**
- Consumes: `resolveThemeId`, `templateKeyFor` (Task 2); `hasTemplate` (Task 1).
- Produces: `SectionDef.file: string` (e.g. `'hero'`, `'collections-grid'`) replacing `templateKey`. `renderPage(sections, ctx)` signature unchanged; it reads the theme from `ctx.store.settings`.

- [ ] **Step 1:** In `sections.test.ts`, replace the `templateKey` assertions with `file` ones (`hero` → `'hero'`, `collections` → `'collections-grid'`, `featured` → `'featured-products'`, and each entry's `hasTemplate(`classic/sections/${def.file}`)` is true). In `render-page.test.ts` add: a store with `settings: { themeId: 'studio' }` renders `sf-hero` and the `#products` section, identical to the same store with no `themeId` (unreleased theme falls back).
- [ ] **Step 2:** Run both tests. Expected: FAIL on `file`.
- [ ] **Step 3:** Rename the field, resolve with `templateKeyFor(resolveThemeId(store.settings), def.file, hasTemplate)` once per `renderPage` call. When a non-classic theme falls back for a section, `console.warn` once per render naming the theme and file.
- [ ] **Step 4:** Run `npm test -w @mcloud/storefront`. Expected: PASS, including `public-cache` and `render-page`.
- [ ] **Step 5:** Commit `feat(storefront): resolve home sections by store theme`.

### Task 4: Theme-aware layout, nav and footer

**Files:**
- Modify: `apps/storefront/components/store/layout-wrapper.tsx`, `store-nav.tsx`, `store-footer.tsx`
- Create: `apps/storefront/lib/layout-message.ts`
- Test: `apps/storefront/lib/layout-message.test.ts`

**Interfaces:**
- Consumes: `resolveThemeId`, `isStoreThemeId` (Task 2).
- Produces: `layoutThemeFrom(event: { origin: string; data: unknown }, ownOrigin: string, framed: boolean): StoreThemeId | null`. Message shape `{ type: 'mcloud:layout', themeId: StoreThemeId }`. `StoreNav` gains `theme: StoreThemeId`; `StoreFooter`'s existing `themeId` prop is typed `StoreThemeId`.

- [ ] **Step 1:** Test `layoutThemeFrom`: valid same-origin framed message returns the id; wrong origin, `framed: false`, wrong `type`, unknown id, and non-object `data` each return `null`.
- [ ] **Step 2:** Run it. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement. `LayoutWrapper` computes `resolveThemeId(settings)`, keeps an override in state set from `layoutThemeFrom` in a `message` listener (only when `window.parent !== window`), sets `data-sf-theme` on `.storefront-root`, and passes the theme to `StoreNav` and `StoreFooter`. For now both render today's markup for every theme.
- [ ] **Step 4:** Run `npm test -w @mcloud/storefront` and `npx tsc --noEmit -p apps/storefront`. Expected: PASS, 0 errors.
- [ ] **Step 5:** Commit `feat(storefront): theme attribute and preview layout message`.

### Task 5: Editor layout picker

**Files:**
- Modify: `apps/storefront/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx`, `page.tsx`
- Test: `.../settings/editor/editor-state.test.ts`

**Interfaces:**
- Consumes: `STORE_THEMES`, `resolveThemeId` (Task 2); message shape from Task 4.
- Produces: `EditorClient` prop `startTheme?: StoreThemeId`, set by `page.tsx` from `searchParams.theme` when `isStoreThemeId`.

- [ ] **Step 1:** Reducer test: `{ type: 'setting', key: 'themeId', value: 'studio' }` then `undo` restores the previous `themeId` in one step and `settingsPatch(saved, present)` contains `themeId` after the edit.
- [ ] **Step 2:** Run it. Expected: PASS already (existing `setting` action); this test pins the behaviour the picker relies on. If it fails, fix the reducer, not the test.
- [ ] **Step 3:** Add a "Layout" group at the top of the Theme tab listing released themes: name, description, a radio tile with a small inline SVG thumbnail of the layout (hero block, grid, footer bar; drawn per theme in a `THEME_THUMBS` map in the component), and under the active one "Suggested presets: …" using preset names. Picking dispatches the `setting` edit. Post `{ type: 'mcloud:layout', themeId }` whenever `doc.settings.themeId` changes and in `onPreviewReady`. On mount, if `startTheme` differs from the saved theme, dispatch the edit once.
- [ ] **Step 4:** Run `npx turbo run typecheck lint --filter=@mcloud/storefront --concurrency=1`. Expected: 0 errors, no new warnings in the touched files.
- [ ] **Step 5:** Commit `feat(editor): layout picker and theme preview`.

### Task 6: `adoptTheme` and the dashboard panel

**Files:**
- Modify: `apps/storefront/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.ts`, `page.tsx`, `settings-home-client.tsx`
- Create: `.../settings/theme-upgrade-panel.tsx`
- Test: `.../settings/actions.pages.test.ts` (extend) or new `theme-adopt.test.ts` for the pure part

**Interfaces:**
- Consumes: `presetForAdoption`, `isStoreThemeId`, `UPGRADE_TARGET`, `STORE_THEMES` (Task 2); `getVertical` for `commerce`.
- Produces: `adoptTheme(slug: string, themeId: StoreThemeId): Promise<ActionResult>`; `SettingsHomeClient` prop `themeId: StoreThemeId`.

- [ ] **Step 1:** Test the write plan as a pure helper `adoptionWrites(currentSettings, currentTheme, target, commerce)` returning `{ settingsPatch: { themeId }, themeValues: Record<string,string> | null }`: Classic-default theme gets preset values; customised theme gets `null`; settings patch always carries only `themeId`.
- [ ] **Step 2:** Run it. Expected: FAIL, not defined.
- [ ] **Step 3:** Implement `adoptionWrites` in `lib/store-themes.ts` and `adoptTheme` in `actions.ts`: session, `requireStoreAccess`, `canManage`, `isStoreThemeId` and `released` checks, read settings and theme row, merge `themeId` onto settings, upsert theme values through `isValidThemeValue` when non-null, `revalidateStore(slug)`. Errors return readable text.
- [ ] **Step 4:** `page.tsx` reads the store with `getStoreSettingsData(session.user.id, storeSlug, orgSlug)` and passes `resolveThemeId(settings)`. The panel shows when that is `classic` and `UPGRADE_TARGET` is released. "Preview" links to `settings/editor?theme=classic-2`; "Update" calls `adoptTheme` and `router.refresh()`; "Not now" stores `mcloud:theme-panel-dismissed:<slug>` in localStorage inside try/catch.
- [ ] **Step 5:** Run `npm test -w @mcloud/storefront` and typecheck. Expected: PASS.
- [ ] **Step 6:** Commit `feat(settings): opt-in theme update panel`.

### Task 7: Classic 2

**Files:**
- Create: `packages/liquid/themes/classic-2/sections/*.liquid` (11 sections + `product-card`)
- Modify: `apps/storefront/app/(storefront)/store/[slug]/storefront.css`, `store-nav.tsx`, `store-footer.tsx`, `lib/store-themes.ts` (`released: true`), `packages/liquid/src/themes-manifest.ts` (generated)

**Interfaces:**
- Consumes: Task 1 harness (runs automatically), Task 4 `theme` props.

- [ ] **Step 1:** Copy `classic/sections` to `classic-2/sections`, change every `render 'classic/sections/product-card'` to `classic-2/…`, add `sf-t-classic-2` to each section root element, and run `npm run gen:manifest -w @mcloud/liquid` then `npm test -w @mcloud/liquid`. Expected: PASS for both themes.
- [ ] **Step 2:** Apply the Classic 2 design from the spec in templates and scoped CSS: section padding `py-16 md:py-28`, headings one step larger, product image wrap `20rem`, card without the price divider, hero overlay `rgba(0,0,0,0.18)` with a frosted card (`backdrop-filter: blur(8px)`, background at 85%), eyebrow as small caps text instead of an outlined badge. Nav and footer: same structure, more padding, thinner border.
- [ ] **Step 3:** Set `released: true` for `classic-2`. Add a `store-themes.test.ts` assertion: every released theme has all 12 files (`hasTemplate`).
- [ ] **Step 4:** Run `npx turbo run typecheck lint test --concurrency=1`. Expected: PASS.
- [ ] **Step 5:** Screenshot the preview route for a shop and an NGO store on `classic-2`, desktop 1280 and phone 390, into `docs/test-runs/2026-11-12-store-themes/`.
- [ ] **Step 6:** Commit `feat(themes): Classic 2`.

### Task 8: New stores start on Classic 2

**Files:**
- Modify: `packages/merchant/src/stores.ts:231`
- Test: `packages/merchant/src/stores.test.ts` (or the nearest existing `createStore` test)

- [ ] **Step 1:** Test that the insert payload built for a new store includes `settings: { themeId: 'classic-2' }`. If the payload is built inline, extract `newStoreRow(input)` and test that.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Use the literal `'classic-2'` (the package cannot import the storefront registry); add a comment pointing at `UPGRADE_TARGET`.
- [ ] **Step 4:** Run `npm test -w @mcloud/merchant`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(stores): new stores start on Classic 2`.

### Task 9: Studio

**Files:** `packages/liquid/themes/studio/sections/*`, scoped CSS, nav/footer branches, `released: true`.

- [ ] **Step 1:** Copy Classic 2's sections into `studio/`, fix the product-card path and root class, regenerate, run the Liquid tests. Expected: PASS.
- [ ] **Step 2:** Apply the Studio design: hero headline over the image with no card (`clamp(2.5rem, 8vw, 6rem)`, uppercase eyebrow), product grids `gap-px` on a border-coloured background so cards tile edge to edge, square images, uppercase section eyebrows. Nav: centred logo, links left, icons right. Footer: inverted (`--sf-foreground` background, `--sf-background` text).
- [ ] **Step 3:** Set `released: true`; run CI at concurrency 1. Expected: PASS.
- [ ] **Step 4:** Screenshots as in Task 7, with the Bold preset applied.
- [ ] **Step 5:** Commit `feat(themes): Studio`.

### Task 10: Soft

**Files:** `packages/liquid/themes/soft/sections/*`, scoped CSS, nav/footer branches, `released: true`.

- [ ] **Step 1:** Copy, fix paths and root class, regenerate, run the Liquid tests. Expected: PASS.
- [ ] **Step 2:** Apply the Soft design: radius `1.25rem` on cards and images regardless of the preset's corner setting, pill buttons (`9999px`), shadow cards by default look (the `card_style` option still wins when set), centred headings with no rule lines, alternating sections on `color-mix(in srgb, var(--sf-secondary) 50%, var(--sf-background))`. Nav: floating rounded bar inset `12px` from the edges. Footer: rounded top corners on the secondary tint.
- [ ] **Step 3:** Set `released: true`; run CI at concurrency 1. Expected: PASS.
- [ ] **Step 4:** Screenshots with Market (shop) and Giving (NGO).
- [ ] **Step 5:** Update `FEATURES.md` ST-27, `docs/ROADMAP.md` L4 and the test-run note. Commit `feat(themes): Soft`.
