# Editor CRUD — sections and repeated records, in the preview

**Date:** 2026-07-18
**Status:** Design approved, ready for implementation plan
**Area:** `apps/web` merchant Editor + `apps/storefront` editor-bridge + `packages/liquid` snippets

## Problem

The mcloud Editor (`/org/[org]/[site]/settings/editor`) can EDIT what already
exists in the live preview: click any heading/subtitle to type, click any image
to replace it. It cannot change *structure*. You can retitle programme 2, but you
cannot add programme 4 or delete programme 1 — there is no text on the page to
click for a record that does not exist yet. Same for page sections: no add,
remove, or reorder.

That gap is the only reason the drawer still carries structural weight. Once the
preview can do CRUD, the drawer stops being a fallback and becomes purely the
place for things with no visual representation (colours, fonts, toggles). This
turns a fancy form into a page builder — the endgame of the whole Editor design.

## Scope

Full add / delete / reorder for **both** index-addressed collections, driven from
overlay controls **in the preview**:

| Thing | Lives in | State owner (already exists) | Save action (already wired) |
|---|---|---|---|
| Page sections | `pages.sections` jsonb | `sections` array in `editor-client` | `updatePageSections(slug, '', sections)` |
| Repeated records | `stores.settings[list]` (`programs`, `campaigns`, `impactStats`, `heroSlides`) | `storeDraft[list]` in `editor-client` | `updateStoreSettings(slug, { settings })` |

**No new tables, no new server actions, no new save button.** CRUD is array
mutation on state that already exists and already persists. That is what makes
this tractable rather than a rewrite.

**Ordering:** sub-project 0 (backfill every store with a `pages` row — see
"Prerequisite" below) ships FIRST. CRUD assumes every store reads a real,
persisted `sections` array; the backfill is what makes that true.

### Every store already qualifies — there is no "old theming" cohort

A concern worth pinning: does a store still on the old React theming get left
behind? No. The storefront home (`apps/storefront/app/store/[slug]/page.tsx`)
renders EVERY store through the Liquid pipeline (`renderPage(sections, context)`
→ `data-mcloud-section` anchors → the `editor-bridge`). The React
`@mcloud/themes/classic` path is NOT a theme a store is "on" — it is only an
error fallback ("on any template/render error, fall back to the React theme so a
template bug can never take a live store down"), a sub-project-1 safety net that
is removed when React is retired. So the mechanics CRUD depends on are already
universal.

### Prerequisite (sub-project 0): backfill a `pages` row for every store

The screenshot that surfaced this (store **`locd26`**, "Loc'd Essence" — the OG
store, the most set-up shop on mcloud, NOT a new empty one) exposed a real,
already-shipped bug CRUD cannot be built on top of. Investigation (DB + code
trace, 2026-07-18) established the facts:

- `locd26` has **no `pages` row**, 4 active products, 3 hero slides. It has real
  content; "blank because empty" was WRONG.
- **20 of 22 active stores have no home `pages` row.** This is the normal state,
  not an edge case.

Two distinct defects, both rooted in an empty-array ambiguity:

1. **Rail vs storefront divergence.** No page row → storefront renders
   `defaultHomeSections(store.type)` (four sections), but the Editor rail reads
   `sections = []` (`apps/web/.../editor/page.tsx:62`) → "This site uses the
   default layout. Nothing to configure yet." Same absent data, read two ways.

2. **The blank preview (the screenshot).** The Editor encodes its `sections` into
   the preview URL with NO guard (`editor-client.tsx:325`:
   `toBase64Url(JSON.stringify(sections))`). With no page row that is `[]`. The
   storefront's preview override treats ANY array as authoritative
   (`page.tsx:158`: `if (Array.isArray(parsed)) sections = parsed`), so `[]`
   replaces the defaults → `renderPage([])` →
   `<div class="min-h-screen"></div>` → an empty body. The LIVE site renders
   correctly (no `?preview`, so defaults stand) — which is why `/store/locd26`
   was verified at parity in storefront SP2. Only the *Editor preview* is blank,
   for ~91% of live stores.

The Editor conflates "this store has no saved page yet" (preview the vertical
defaults) with "this page has zero sections" (preview empty). It encodes `[]` for
the first and the storefront renders it as the second.

**Verification status:** the chain was confirmed by DB query + reading every link
(`editor/page.tsx` → `editor-client.tsx:325` → storefront `page.tsx:158-165` →
`render-page.ts`). A browser-level repro (start storefront, sign a preview token,
screenshot `/store/locd26?preview=<empty>` vs the live URL) was NOT yet run and is
required during implementation, per the `editor-render-save-divergence` rule
("verify in a real browser, not a string match").

**Fix (DONE, shipped 2026-07-18): a one-time backfill migration.**
`migrations/20260718_backfill_home_pages.sql`, applied to prod: 20 rows inserted,
all 22 active stores now have a home page row; `locd26` verified with the shop
default sections. This resolves the blank-preview bug at the data level. (The
browser-level confirmation — Editor rail lists the sections, preview renders the
real site — is the remaining check.) Create a `pages` row (slug `''`, `sections`
from that store's vertical defaults, `position` 0) for every store that lacks one. After it runs, every store has a persisted home page, the Editor and
storefront both read the SAME row, the `defaultHomeSections` fallback branch is no
longer load-bearing for existing stores, and there is no "page-less store" special
case for CRUD to handle.

- The migration derives sections from `getVertical(store.type).defaultPages` (the
  same source both sides use today), so no store's rendered home changes.
- Idempotent: only inserts where no `(store_id, slug='')` row exists; safe to
  re-run. Respects the existing `unique(store_id, slug)` constraint.
- New stores created after the migration must ALSO get a home page row at creation
  time (store-provisioning path), or the divergence returns for them. This is part
  of sub-project 0, not an afterthought.
- The storefront's `defaultHomeSections` fallback and the Editor's empty-array
  fallback both STAY as defence in depth (a future new vertical, a failed insert),
  but are no longer the normal path.

**Also fix the encode-`[]` guard (independent of the backfill).** The backfill
makes `sections` non-empty for existing stores, but the ambiguity in the preview
channel remains and would bite again (a brand-new store before provisioning
completes; and — once CRUD ships — a merchant who legitimately deletes every
section, where the preview SHOULD then honour empty). The durable fix lives on
the storefront side, which is the one place that can tell the two cases apart:

- Distinguish "no preview intent" from "preview an empty page." Simplest: the
  Editor omits the `preview` param entirely when it has nothing authoritative to
  say (no page row AND no local edits), so the storefront falls through to its
  normal default-sections path. Once the store has a real page (post-backfill or
  post-first-save), the param carries the real array, empty or not, and empty then
  correctly means empty.
- This keeps ONE owner for "what does an absent/empty sections list mean," instead
  of the Editor and storefront each deciding — which is the render/save divergence
  root cause the whole Editor has fought (see `editor-render-save-divergence`).

### Explicitly out of scope

- **Mobile / touch.** The Editor is a desktop-only three-pane shell (fixed
  `w-56` rail, absolutely-positioned `w-[26rem]` drawer, desktop-storefront
  iframe) and the CRUD overlays assume hover + mouse. Touch is a separate,
  larger sub-project (collapsible panes, tap-reveal handles, ≥44px targets,
  mobile-preview iframe). This sub-project must not regress desktop; it does not
  attempt phone/tablet layout.
- Cross-page section moves, section-library/presets, undo history.

## Architecture

CRUD flows through the SAME state and save paths the existing text/image edits
use, so the render/save divergence fault line (the root cause of every serious
Editor bug — see the `editor-render-save-divergence` memory) never opens: there
is exactly one owner for each collection, and one reader (`listFor`) that
normalises a legacy hero on first touch.

### Two new message channels

The storefront `editor-bridge` already reports text edits over three channels
(`field-edit`, `setting-edit`, `item-edit`). CRUD adds two structural channels:

- `mcloud:section-op` → `{ op: 'move' | 'delete' | 'duplicate' | 'add', index, ... }`
- `mcloud:item-op` → `{ op, list, index, ... }`

Both are validated in `editor-client` exactly like the existing channels —
integer/bounds-checked `index`, whitelisted `list` (`EDITABLE_LISTS`), unknown
shapes dropped silently — then mutate `sections` / `storeDraft[list]`. Record ops
read current state via the existing `listFor(list, draft, saved)` so a legacy
hero (flat keys, no `heroSlides` array) normalises via `authoredSlides()` on its
first structural op, identical to its first text edit.

### One enriched anchor + hover overlay

Today each section is anchored `<div data-mcloud-section="{i}">`; records already
carry `data-mcloud-list` / `data-mcloud-index` / `data-mcloud-key` from the
`editable-item` snippet. That is enough to *address* things but gives the preview
nothing to hang controls on. The bridge gains a hover overlay: for any element
matching `[data-mcloud-section]` (a section) or `[data-mcloud-list][data-mcloud-index]`
(a record), on hover it shows a small floating toolbar — `↑ ↓ ⧉ 🗑` plus a `＋`
insertion affordance.

**Handle placement respects the hero lesson (fault-line bug #5).** The toolbar is
`position: fixed`, positioned from the hovered element's bounding rect, in its own
layer, with `pointer-events: auto` ONLY on the buttons themselves and
`pointer-events: none` on the layer around them — so it can never eat a click
meant for the text or image beneath it. This is the exact failure mode where the
hero's content layer swallowed every click on the background image.

### Reorder without reload

A structural change normally cannot skip the iframe reload (a new record has no
DOM node; a deleted one must vanish), so `add` / `delete` / `duplicate` mutate
state and let the existing 400ms debounced reload redraw via the Liquid pipeline
(~1.6s warm).

`move` is special-cased for feel: it reorders the state array AND posts
`mcloud:reorder-preview` back down so the bridge shuffles the *already-rendered*
DOM nodes immediately with `insertBefore`. This is a **pure node move, not a
client re-render** — it does not reintroduce the "client renders too" divergence,
because no markup is generated on the client; existing nodes are only repositioned.
The debounced reload is suppressed for that op via the existing `skipReloadRef`
mechanism. On the next real reload the server redraw confirms the order.

After any op that changes indices, the bridge and the rail must agree on the new
index→node mapping. `render-page.ts` already counts EVERY section (including
skipped unknown types) so indices stay stable; the client keeps that invariant by
addressing by array position only.

## Data flow — one op, end to end

1. Merchant hovers a section/record → bridge overlays `↑ ↓ ⧉ 🗑 ＋` from the
   element rect.
2. Click a handle → bridge posts `mcloud:section-op` / `mcloud:item-op`.
3. `editor-client` validates (bounds, whitelist) and mutates `sections` /
   `storeDraft[list]` via `listFor`.
4. **move** → posts `mcloud:reorder-preview`; bridge `insertBefore`s existing
   nodes instantly (no reload). **add / delete / duplicate** → debounced reload
   redraws.
5. `dirty` flips true → the floating Save button appears → existing
   `updatePageSections` / `updateStoreSettings` persist. No new save path.

## Add semantics — the seed

New items are **seeded with placeholder copy**, never truly empty, so there is
always clickable text (respecting the empty-field lesson):

- **New section:** merchant picks a type from a small menu built from
  `SECTION_REGISTRY`, filtered to the store's vertical. The new section starts
  with that section schema's **default values**. A type picker is unavoidable —
  it is the one place a menu is genuinely required, because there is no other way
  to name a section type. Insertion index comes from which `＋` was clicked.
- **New record:** seeded per-list placeholder, e.g. a programme starts as
  `{ title: 'New programme', description: 'Describe it…' }`, a stat as
  `{ value: '0', label: 'New stat' }`, etc. Merchant types over the placeholder.
  Inserted at the clicked position in `storeDraft[list]`.

The seed guarantees a clickable target immediately; the `:empty::before`
"Click to add" affordance remains the safety net if a merchant clears a field.

## Error handling

- Every op is index/whitelist-guarded and drops silently on drift (same posture
  as the existing edit channels). An `index` past the end (preview and draft
  disagree) is a no-op, never grows an array with a hole.
- Reorder past bounds (moving the first item up, last item down) is a no-op.
- Save failure retains the draft — the merchant never loses structural work
  (already the current behaviour of the floating Save).
- Unknown section types stay inert in the rail and skippable in render; CRUD
  never assumes a type is known (delete/move/duplicate operate on position, not
  type).

## Testing — fault-line first

Per the `editor-render-save-divergence` memory, the regression tests come before
implementation, and verification means clicking in a real browser
(`elementFromPoint`), not asserting a string is present in the HTML.

1. **Default-trap regression (must exist):** add a record → clear a seeded field →
   save → reload → a default must NOT reappear where the merchant left it blank.
2. **Reorder persistence:** reorder two sections → save → reload → order persists
   and rail indices match DOM `data-mcloud-section` indices.
3. **Delete integrity:** delete record N → the *remaining* records survive intact,
   no array hole, no wrong-record deletion; the correct record is gone.
4. **Reachability, not string-match:** `elementFromPoint` on each overlay handle
   confirms a human can actually click it — the overlay does not eat clicks on the
   text/image beneath (fault-line bug #5).
5. **Duplicate independence:** duplicate a section → both copies are independently
   editable (deep clone, no shared reference).
6. **Legacy hero on first structural op:** add a slide to a store that has flat
   hero keys and no `heroSlides` array → `listFor`/`authoredSlides` normalises so
   nothing is dropped (fault-line bug #3).
7. **Backfill parity (sub-project 0):** for a store that had no `pages` row, the
   Editor rail after backfill lists the SAME sections the storefront renders, and
   the rendered home is byte-for-byte unchanged (defaults derived from the same
   `getVertical` source). Backfill is idempotent (re-run inserts nothing).
8. **New-store provisioning:** a store created after the migration gets a home
   `pages` row at creation, so the rail-vs-storefront divergence does not return.

## Files touched (anticipated)

- `apps/web/.../settings/editor/editor-client.tsx` — two new inbound channels,
  op handlers mutating `sections` / `storeDraft`, seeds, `move` special-case,
  section type-picker UI.
- `apps/storefront/components/store/editor-bridge.tsx` — hover overlay toolbar,
  outbound `section-op` / `item-op`, inbound `reorder-preview` node shuffle.
- `packages/liquid/themes/classic/snippets/editable-item.liquid` (and section
  templates) — ensure records expose a hoverable host for the overlay; sections
  already anchored by `render-page.ts`.
- Tests alongside each.
