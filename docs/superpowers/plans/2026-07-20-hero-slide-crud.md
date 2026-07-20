# Multi-slide Hero — Slide CRUD + Filmstrip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a merchant add, delete, reorder, and page-between hero slides in the Editor preview, with the carousel following the slide they act on across the debounced reload.

**Architecture:** Slides are already a `heroSlides` record list flowing through the existing `item-op` → `applyItemOp` → `seedRecord` path and the `record-anchor`. This plan adds: (1) the hover toolbar acting on the ACTIVE slide, (2) an editor-only dot "filmstrip" with an add-slide control, and (3) an active-slide handoff across the iframe reload via a URL hash (`#slide=N`) the carousel reads on init — no server round-trip.

**Tech Stack:** Next.js 16 / React (editor-client), liquidjs (hero.liquid inline carousel JS), TypeScript, Playwright via run-mcloud for browser verification.

## Global Constraints

- **This is a follow-up to Editor CRUD (on `main`).** Reuse the existing slide record path; no new server action, no new reducer, no schema change.
- **The render/save fault line** governs: editable elements diff against `data-mcloud-stored`; a cleared field saves `''`, never a placeholder default. Verify by real mouse click in a browser, not a string match — this session proved headless hit-tests lie about the hero.
- **The carousel is FROZEN in the editor** (`editing` disables auto-advance). Keep it frozen; slide changes happen only by explicit merchant action (dot click, toolbar op).
- **Editor-only markup:** filmstrip labels, the add-slide control, and any `data-*` for slide nav emit ONLY when `store.editing`. A visitor sees the normal carousel.
- **No em/en dashes in merchant-facing copy** (filmstrip labels, tooltips). Periods/commas.
- **Verify each task with a REAL mouse click in the running Editor** (both apps up), not elementFromPoint alone. The hero's carousel stacking makes synthetic checks unreliable (see the session that produced this plan).
- Hero slide edit itself already works (pointer-events fix for inactive slides + mousedown-begin, committed on main). This plan builds ON that.

## File Structure

- `packages/liquid/themes/classic/sections/hero.liquid` — carousel JS reads `#slide=N` on init (start on the followed slide); editor-only filmstrip labels + add-slide `＋`; regenerate manifest.
- `apps/storefront/components/store/editor-bridge.tsx` — toolbar on the active hero slide maps to `heroSlides` item-ops; after an op, set the hash so the reloaded carousel follows; filmstrip dot → page slide (already works, confirm in editor).
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx` — when a hero item-op changes slide count/order, compute the slide to follow and include it so the reloaded preview opens there (via the hash on the iframe src, or a post-reload message).
- Tests: reuse existing `applyItemOp` coverage (no new reducer). Add a small pure helper test for "which slide to follow after an op" if one is extracted.

---

## Task 1: Carousel starts on the hash-specified slide

Make the hero carousel honor `#slide=N` on load, so after a reload the merchant lands on the slide they were acting on instead of snapping to slide 0. Server-free.

**Files:**
- Modify: `packages/liquid/themes/classic/sections/hero.liquid` (carousel `<script>`, around `var current = 0;` at line ~155)
- Regenerate: `packages/liquid/src/themes-manifest.ts` via `npm run gen:manifest`
- Test: `packages/liquid/src/hero-slide-init.test.ts` (self-contained liquidjs render, mirrors `record-anchor.test.ts`)

**Interfaces:**
- Produces: a hero whose carousel, on init, reads `location.hash` for `slide=N` and calls `goTo(N)` if valid (0 ≤ N < slides.length). Absent/invalid hash → slide 0 (unchanged behavior).

- [ ] **Step 1: Write the failing test**

`packages/liquid/src/hero-slide-init.test.ts` — render the hero section and assert the init script contains the hash-reading logic. Use the self-contained engine pattern from `record-anchor.test.ts` (import `Liquid` from `liquidjs`, read the section file, render with a 2-slide `slides` array + `store.editing:true`).

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Liquid } from 'liquidjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../themes/classic/sections/hero.liquid'), 'utf8')
const engine = new Liquid()
const ctx = {
  store: { name: 'S', settings: {}, editing: true, commerce: true },
  slides: [ { title: 'A', image: 'x', subtitle:'', accent:'', buttonText:'Shop' },
            { title: 'B', image: 'y', subtitle:'', accent:'', buttonText:'Shop' } ],
  authored: [ { title:'A' }, { title:'B' } ],
  campaigns: [],
}

test('multi-slide hero init reads #slide=N from the hash', async () => {
  const html = await engine.parseAndRender(src, ctx)
  assert.match(html, /location\.hash/)          // reads the hash
  assert.match(html, /slide=/)                   // parses slide=N
  assert.match(html, /goTo\(/)                   // navigates to it
})
```

- [ ] **Step 2: Run — confirm FAIL**

Run: `cd packages/liquid && node --experimental-strip-types --test 'src/hero-slide-init.test.ts'`
Expected: FAIL (`location.hash` not yet present).

- [ ] **Step 3: Implement the hash read in hero.liquid**

In the carousel IIFE, replace `var current = 0;` (line ~155) with a hash-aware initializer, placed AFTER `goTo` is defined (so it can call it). Concretely, keep `var current = 0;`, and immediately after the `dots.forEach(...)` click-wiring block, add:

```javascript
      // Editor handoff: after a slide add/delete/reorder the iframe reloads, and
      // the Editor sets location.hash to the slide the merchant was acting on so
      // the carousel FOLLOWS it instead of snapping back to slide 0. Server-free.
      (function () {
        var m = /(?:^|#|&)slide=(\d+)/.exec(location.hash || '');
        if (!m) return;
        var n = parseInt(m[1], 10);
        if (n > 0 && n < slides.length) goTo(n);
      })();
```

(Guard `n > 0`: slide 0 is already the default, so only a non-zero valid index needs a jump. `n < slides.length` drops a stale hash after a delete.)

- [ ] **Step 4: Run — confirm PASS + regen manifest**

Run: `cd packages/liquid && node --experimental-strip-types --test 'src/hero-slide-init.test.ts'` → PASS (3/3 asserts).
Then: `cd packages/liquid && npm run gen:manifest` → "Generated themes-manifest with N templates."

- [ ] **Step 5: Commit**

```bash
git add packages/liquid/themes/classic/sections/hero.liquid packages/liquid/src/themes-manifest.ts packages/liquid/src/hero-slide-init.test.ts
git commit -m "feat(hero): carousel follows #slide=N on load for the editor handoff"
```

---

## Task 2: Hero toolbar ops target the active slide + set the follow-hash

The hover toolbar already targets the hovered record. On the hero, the only interactive slide is the ACTIVE one (inactive slides are inert). Make the toolbar's slide ops set the follow-hash on the preview so the reload lands on the right slide.

**Files:**
- Modify: `apps/storefront/components/store/editor-bridge.tsx` (`onToolbarClick`, item-op branch for `list === 'heroSlides'`)
- Modify: `apps/web/.../editor/editor-client.tsx` (`mcloud:item-op` handler: for `heroSlides`, compute follow-index and append `#slide=N` to the reloaded preview src)

**Interfaces:**
- Consumes: existing `mcloud:item-op` `{ op, list:'heroSlides', index, to? }`.
- Produces: after a heroSlides op, the debounced preview reload URL carries `#slide=<follow>` where follow = new index of the acted-on slide (move→`to`; duplicate→`index+1`; add→insertion index; delete→`min(index, newLen-1)`).

- [ ] **Step 1: Extract a pure follow-index helper (testable)**

Create `apps/web/.../editor/slide-follow.ts`:

```ts
import type { ItemOp } from './item-ops'

/**
 * Which slide index the carousel should show AFTER a heroSlides op, so it FOLLOWS
 * the slide the merchant acted on instead of snapping to 0. `newLen` is the list
 * length AFTER the op. Pure.
 */
export function followSlideIndex(op: ItemOp, newLen: number): number {
  if (newLen <= 0) return 0
  let i: number
  switch (op.op) {
    case 'move': i = op.to; break
    case 'duplicate': i = op.index + 1; break
    case 'add': i = op.index; break
    case 'delete': i = op.index; break // the slide now at the deleted position (its old neighbour)
    default: i = 0
  }
  return Math.max(0, Math.min(i, newLen - 1))
}
```

- [ ] **Step 2: Write the failing test**

`apps/web/.../editor/slide-follow.test.ts` (import with `.ts` extension per repo convention; run with the glob form):

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { followSlideIndex } from './slide-follow.ts'

test('move follows to the destination', () => { assert.equal(followSlideIndex({op:'move',index:0,to:2}, 3), 2) })
test('duplicate follows the copy', () => { assert.equal(followSlideIndex({op:'duplicate',index:0}, 3), 1) })
test('add follows the new slide', () => { assert.equal(followSlideIndex({op:'add',index:2,list:'heroSlides'}, 3), 2) })
test('delete shows the neighbour, clamped', () => { assert.equal(followSlideIndex({op:'delete',index:2}, 2), 1) })
test('delete of first shows new first', () => { assert.equal(followSlideIndex({op:'delete',index:0}, 2), 0) })
test('empty list clamps to 0', () => { assert.equal(followSlideIndex({op:'delete',index:0}, 0), 0) })
```

Run (glob form): `cd apps/web && node --experimental-strip-types --test 'app/**/editor/slide-follow.test.ts'` → FAIL (module missing).

- [ ] **Step 3: Confirm PASS**

Same command → 6/6 pass.

- [ ] **Step 4: Wire follow-hash into the editor-client item-op handler**

In `editor-client.tsx`, the `mcloud:item-op` handler currently applies the op and lets the debounced reload run. For `list === 'heroSlides'`, compute the follow index and stash it so `previewSrc` appends `#slide=N`. Add a ref:

```ts
const followSlideRef = useRef<number | null>(null)
```

Inside the item-op handler, after computing `applied`:

```ts
                if (list === 'heroSlides') {
                    followSlideRef.current = followSlideIndex(
                        { op, index: data.index, to: data.to, list } as ItemOp,
                        (applied as unknown[]).length,
                    )
                }
```

Import: `import { followSlideIndex } from './slide-follow'`.

Then in the `previewSrc` useMemo (line ~401), append the hash when set:

```ts
        const url = `${storefrontOrigin}/store/${slug}?${params.toString()}`
        return followSlideRef.current !== null ? `${url}#slide=${followSlideRef.current}` : url
```

**CAUTION (the fragile bit — verify in a browser, do not trust reasoning):** a
`useMemo` does NOT re-run because a ref mutated. It re-runs only when a listed
dependency changes. The item-op handler sets `followSlideRef.current` AND calls
`setStoreDraft` in the same message handler; `storeDraft` is (and must stay) a
`previewSrc` dependency, so the memo recomputes on that state change and reads the
just-set ref. If in practice the hash is missing on the reload, the ref was set
AFTER the memo ran — in that case, set the follow index into React STATE instead of
a ref (add it as a `previewSrc` dependency) so the memo is guaranteed to see it.
Confirm which is needed by the Task 2 Step 7 browser check, not by inspection.

Reset after the reload fires (Step 5) so a later unrelated reload does not re-jump.

- [ ] **Step 5: Reset the follow-ref after the reload**

In the debounce effect (line ~418-422), after `setDebouncedSrc(previewSrc)`:

```ts
        const t = setTimeout(() => { setDebouncedSrc(previewSrc); followSlideRef.current = null }, 400)
```

- [ ] **Step 6: Typecheck**

`cd apps/web && npx tsc --noEmit 2>&1 | grep -iE "slide-follow|editor-client" | head` → clean.

- [ ] **Step 7: Browser verify (REAL clicks, both apps up)**

Start web (:3000) + storefront (:3001). Open the Editor for a MULTI-slide store (locd26). Hover the active hero slide → toolbar shows. Click ＋ (add) → after the reload the carousel shows the NEW slide (hash followed), and its seeded text is editable. Delete it → carousel shows the neighbour. Reorder (↑/↓) → the moved slide stays visible. Log to `docs/test-runs/2026-07-20-hero-slide-crud/`.

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/slide-follow.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/slide-follow.test.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx" \
        apps/storefront/components/store/editor-bridge.tsx
git commit -m "feat(hero): slide toolbar ops follow the acted-on slide across reload"
```

---

## Task 3: Editor filmstrip — labeled dots + add-slide control

Make it obvious a merchant can page through and edit each slide, and give a visible add-slide control. Editor-only; the public carousel is unchanged.

**Files:**
- Modify: `packages/liquid/themes/classic/sections/hero.liquid` (dot row, `{%- if multi -%}` block ~line 133; also show the row when `store.editing` even for a single slide, so add-slide is reachable)
- Regenerate manifest
- Modify: `apps/storefront/components/store/editor-bridge.tsx` (style the filmstrip in editor; wire the add-slide `＋` to post `mcloud:item-op add heroSlides`)

**Interfaces:**
- Consumes: existing dot `goTo` nav; `mcloud:item-op`.
- Produces: in editing mode, a visible filmstrip (numbered/labeled dots, active-state) + a trailing `＋` that adds a slide after the last and follows it.

- [ ] **Step 1: Make the dot row render in editor mode + add the ＋ control**

In hero.liquid, the dot row is gated `{%- if multi -%}`. Change to `{%- if multi or store.editing -%}` so a single-slide hero still shows the row in the editor (for add). After the `{%- endfor -%}` of the dots, add an editor-only add control:

```liquid
        {%- if store.editing -%}
          <button type="button" class="sf-hero__add-slide" data-mcloud-add-slide="1"
            aria-label="Add slide" style="pointer-events:auto">+</button>
        {%- endif -%}
```

Also add an editor-only label to each dot (slide number) so the filmstrip reads as navigation, guarded by `store.editing`.

- [ ] **Step 2: Style the filmstrip + wire ＋ in the bridge**

In `editor-bridge.tsx` injected style, add editor-only styling for `.sf-hero__add-slide` (visible, tappable, matches the op-toolbar look). Add a dedicated click listener (capture phase, like `onToolbarClick`) that handles the add-slide button:

```ts
function onAddSlide(e: MouseEvent) {
    const btn = (e.target as Element)?.closest<HTMLElement>('[data-mcloud-add-slide]')
    if (!btn) return
    e.preventDefault(); e.stopPropagation()
    const count = document.querySelectorAll(
        '[data-mcloud-record][data-mcloud-list="heroSlides"]',
    ).length
    post({ type: 'mcloud:item-op', op: 'add', list: 'heroSlides', index: count })
}
```

Register `document.addEventListener('click', onAddSlide, true)` alongside the other listeners and remove it in cleanup. `index: count` appends after the last slide; the editor-client handler computes the follow index (Task 2) so the reload lands on the new slide.

- [ ] **Step 3: Regenerate manifest + typecheck**

`cd packages/liquid && npm run gen:manifest`; `cd apps/storefront && npx tsc --noEmit 2>&1 | grep -i editor-bridge` → clean.

- [ ] **Step 4: Browser verify (REAL clicks)**

Editor on locd26: the filmstrip is clearly visible in edit mode; clicking dot 2 pages to slide 2 and its heading edits; clicking ＋ adds a slide and follows it. On a SINGLE-slide store (kfs): the row shows with a ＋ so a second slide can be added. Log the run.

- [ ] **Step 5: Commit**

```bash
git add packages/liquid/themes/classic/sections/hero.liquid packages/liquid/src/themes-manifest.ts apps/storefront/components/store/editor-bridge.tsx docs/test-runs/2026-07-20-hero-slide-crud/
git commit -m "feat(hero): editor filmstrip with slide labels and add-slide control"
```

---

## Task 4: Full verification

- [ ] **Step 1:** Unit suites green: `cd apps/web && node --experimental-strip-types --test 'app/**/editor/*.test.ts' 'app/**/settings/*.test.ts'`; `cd packages/liquid && node --experimental-strip-types --test 'src/*.test.ts'` (record-anchor + hero-slide-init at minimum).
- [ ] **Step 2:** `cd apps/web && npx tsc --noEmit` and `cd apps/storefront && npx tsc --noEmit` — no new errors.
- [ ] **Step 3:** Real-browser matrix, logged to `docs/test-runs/2026-07-20-hero-slide-crud/`:
  - locd26 (3-slide): edit each slide via filmstrip; add → follows + editable; delete active → neighbour shown, other slides intact; reorder → moved slide stays visible; SAVE + reload Editor → new order/content persisted in `heroSlides`.
  - kfs (1-slide): filmstrip shows; add a 2nd slide; both editable; save persists a 2-element `heroSlides`.
  - A visitor (no token) sees the normal carousel: no filmstrip labels, no ＋, auto-advance works.
- [ ] **Step 4:** `superpowers:requesting-code-review` before merge; if merging to main, follow the same worktree/merge flow as the parent feature.
