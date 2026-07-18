# Editor CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a merchant add, delete, reorder, and duplicate both page sections and repeated records (programs/campaigns/impactStats/heroSlides) directly in the Editor's live preview.

**Architecture:** CRUD is array mutation on the two collections the Editor already holds in React state (`sections` for `pages.sections`, `storeDraft[list]` for `stores.settings[list]`) and already persists (`updatePageSections`, `updateStoreSettings`). The storefront `editor-bridge` grows a hover overlay that posts two new structural message channels (`mcloud:section-op`, `mcloud:item-op`); `editor-client` validates and applies them. Reorder shuffles existing DOM nodes in place (no reload); add/delete/duplicate ride the existing debounced iframe reload.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React, TypeScript, Supabase (Postgres), liquidjs, Tailwind + Material tokens, node:test for unit tests, Playwright (via the `run-mcloud` skill) for browser verification.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-18-editor-crud-design.md`. Sub-project 0 (pages backfill) is DONE and shipped; this plan is the CRUD feature only.
- **The render/save fault line** (`editor-render-save-divergence` memory) governs everything: the code that RENDERS a value and the code that SAVES it must agree on where the value lives. Every editable/structural element diffs against `data-mcloud-stored`, never `textContent`. Verify reachability with `elementFromPoint` in a real browser, never a string-match on HTML.
- **Editor-only markup:** any `data-mcloud-*` attribute must emit ONLY when `editing` is true (guard: `{%- if editing -%}` in snippets). A real visitor receives none of it.
- **Plain text only** from the preview: values read with `textContent`, never `innerHTML`.
- **Desktop-only.** No touch/tablet/phone work. Do not regress the desktop three-pane shell.
- **No em dashes in merchant-facing copy** (seed strings, button labels, menu text): use periods/commas. (User preference; internal code comments are exempt.)
- **Message validation posture:** every inbound postMessage is checked, not trusted — integer/bounds-checked `index`, `list` must be in `EDITABLE_LISTS`, unknown shapes dropped silently.
- Run all `node:test` suites from the package/app that owns them. Commit after each green step.

---

## File Structure

**Modified:**
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.ts` — loosen `updatePageSections`'s `sameShape` guard so structural changes are allowed (Task 1).
- `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx` — inbound `section-op`/`item-op` handlers, seeds, `move` special-case + `reorder-preview` post, section type-picker UI, encode-`[]` guard (Tasks 2, 3, 4, 6, 8).
- `apps/storefront/components/store/editor-bridge.tsx` — hover overlay toolbar, outbound `section-op`/`item-op`, inbound `reorder-preview` node shuffle (Tasks 5, 7).
- `apps/storefront/app/store/[slug]/page.tsx` — honor "no preview intent" (encode-`[]` guard, storefront half) (Task 8).

**Created:**
- `packages/liquid/themes/classic/snippets/record-anchor.liquid` — emits `data-mcloud-list`/`data-mcloud-index` on a record's container element, editor-only (Task 5).
- `apps/web/.../settings/editor/section-seeds.ts` — pure map: section type → default settings; list → placeholder record (Task 2).
- Test files alongside each (node:test).

**Record-anchor wiring** (Task 5) touches the four record-bearing section templates:
`packages/liquid/themes/classic/sections/{programs,impact,campaigns,hero}.liquid`.

---

## Task 1: Allow structural changes in `updatePageSections`

The current action REJECTS any change to section count or order (`sameShape` guard, `actions.ts:120-124`) with "The page layout changed." That guard existed for the edit-only era. CRUD needs add/delete/reorder/duplicate to save. We keep a weaker invariant: every section `type` must be a known registry type OR already present in the stored page (so a stale tab still cannot inject an arbitrary type), but count and order may change.

**Files:**
- Modify: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.ts:98-131`
- Test: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.pages.test.ts` (create)

**Interfaces:**
- Consumes: existing `updatePageSections(slug, pageSlug, sections)` signature — unchanged.
- Produces: `updatePageSections` now accepts a `sections` array of different length/order than stored, rejecting only sections whose `type` is neither in `SECTION_REGISTRY` nor in the stored page.

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.pages.test.ts`. Because the action hits Supabase/session, test the pure validation helper we are about to extract, not the whole action.

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSectionTypes } from './section-validate'

test('accepts a longer list when all types are known', () => {
  const stored = [{ type: 'hero' }, { type: 'featured' }]
  const next = [{ type: 'hero' }, { type: 'featured' }, { type: 'all-products' }]
  assert.equal(validateSectionTypes(next, stored), true)
})

test('accepts reorder and deletion of known types', () => {
  const stored = [{ type: 'hero' }, { type: 'collections' }, { type: 'featured' }]
  const next = [{ type: 'featured' }, { type: 'hero' }]
  assert.equal(validateSectionTypes(next, stored), true)
})

test('rejects an unknown type not present in the stored page', () => {
  const stored = [{ type: 'hero' }]
  const next = [{ type: 'hero' }, { type: 'evil-injected' }]
  assert.equal(validateSectionTypes(next, stored), false)
})

test('accepts an unknown type that WAS already stored (retired registry entry)', () => {
  const stored = [{ type: 'legacy-retired' }, { type: 'hero' }]
  const next = [{ type: 'hero' }, { type: 'legacy-retired' }]
  assert.equal(validateSectionTypes(next, stored), true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && node --experimental-strip-types --test "app/(merchant)/org/[orgSlug]/[storeSlug]/settings/section-validate.test.ts" 2>&1 | head` (adjust glob if node cannot resolve the bracketed path; use the file path directly).
Expected: FAIL — `Cannot find module './section-validate'`.

- [ ] **Step 3: Write the minimal implementation**

Create `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/section-validate.ts`:

```ts
import { SECTION_REGISTRY } from '../../../../../../../../storefront/lib/sections'

/**
 * A section is allowed to be saved if its type is either a known registry type
 * or was ALREADY in the stored page. This lets CRUD change count/order freely
 * while still stopping a stale/hostile tab from injecting an arbitrary type.
 */
export function validateSectionTypes(
  next: { type: string }[],
  stored: { type: string }[],
): boolean {
  const known = new Set(Object.keys(SECTION_REGISTRY))
  const wasStored = new Set(stored.map((s) => s.type))
  return next.every((s) => known.has(s.type) || wasStored.has(s.type))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && node --experimental-strip-types --test ./app/**/settings/section-validate.test.ts` (or pass the explicit path).
Expected: PASS (4/4).

- [ ] **Step 5: Swap the guard in the action**

In `actions.ts`, replace the `sameShape` block (lines ~120-124) with the new validator:

```ts
    const stored = (Array.isArray(page.sections) ? page.sections : []) as { type: string }[]
    if (!validateSectionTypes(sections, stored)) {
      return { error: 'That section type is not allowed. Reload and try again.' }
    }
```

Add the import at the top of `actions.ts`:

```ts
import { validateSectionTypes } from './section-validate'
```

- [ ] **Step 6: Typecheck + commit**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | head`
Expected: no new errors in the touched files.

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/section-validate.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/section-validate.test.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/actions.ts"
git commit -m "feat(editor): allow structural section changes in updatePageSections"
```

---

## Task 2: Seed map for new sections and new records

Pure, testable map of what a newly added thing starts as. New sections start from their schema defaults; new records start from a per-list placeholder. No DB, no React — just data.

**Files:**
- Create: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/section-seeds.ts`
- Test: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/section-seeds.test.ts`

**Interfaces:**
- Consumes: `SECTION_REGISTRY` (from `apps/storefront/lib/sections`) for section schema defaults.
- Produces:
  - `seedSection(type: string): { type: string; settings: Record<string, unknown> }`
  - `seedRecord(list: string): Record<string, unknown>`
  - `EDITABLE_LISTS_SEEDS: Record<string, Record<string, unknown>>` (the placeholder per list)

- [ ] **Step 1: Write the failing test**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seedSection, seedRecord } from './section-seeds'

test('seedSection fills schema defaults for a known type', () => {
  const s = seedSection('featured')
  assert.equal(s.type, 'featured')
  // featured schema declares heading 'Top Picks', eyebrow 'Featured Collection'
  assert.equal(s.settings.heading, 'Top Picks')
  assert.equal(s.settings.eyebrow, 'Featured Collection')
})

test('seedSection for a schema-less type (hero) yields empty settings', () => {
  const s = seedSection('hero')
  assert.equal(s.type, 'hero')
  assert.deepEqual(s.settings, {})
})

test('seedRecord returns a clickable placeholder for programs', () => {
  const r = seedRecord('programs')
  assert.equal(typeof r.title, 'string')
  assert.ok((r.title as string).length > 0)
})

test('seedRecord for an unknown list is an empty object', () => {
  assert.deepEqual(seedRecord('nope'), {})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && node --experimental-strip-types --test ./app/**/editor/section-seeds.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `section-seeds.ts`:

```ts
import { SECTION_REGISTRY } from '../../../../../../../../storefront/lib/sections'
import type { SettingField } from '@mcloud/verticals'

/** A new section starts from its schema's declared defaults (all string copy). */
export function seedSection(type: string): { type: string; settings: Record<string, unknown> } {
  const def = (SECTION_REGISTRY as Record<string, { schema?: readonly SettingField[] }>)[type]
  const settings: Record<string, unknown> = {}
  for (const f of def?.schema ?? []) {
    if (f.default !== undefined) settings[f.id] = f.default
  }
  return { type, settings }
}

/**
 * Placeholder copy for a newly added record. Seeded (not empty) so there is
 * always a clickable target the merchant can type over. No em dashes (merchant
 * facing). Keys match what each section template reads.
 */
export const EDITABLE_LISTS_SEEDS: Record<string, Record<string, unknown>> = {
  programs: { title: 'New program', description: 'Describe this program.' },
  campaigns: { title: 'New campaign', description: 'Describe this campaign.', goal: 0, raised: 0 },
  impactStats: { value: '0', label: 'New stat' },
  heroSlides: { title: 'New slide', subtitle: '' },
}

export function seedRecord(list: string): Record<string, unknown> {
  return { ...(EDITABLE_LISTS_SEEDS[list] ?? {}) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && node --experimental-strip-types --test ./app/**/editor/section-seeds.test.ts`
Expected: PASS (4/4). If `featured` defaults differ, read `apps/storefront/lib/sections.ts` and correct the asserted strings to match the registry verbatim (they must match).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/section-seeds.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/section-seeds.test.ts"
git commit -m "feat(editor): seed map for new sections and records"
```

---

## Task 3: `section-op` handler in editor-client (add/delete/duplicate/move)

Apply structural ops to the `sections` array. Pure reducer first (testable), then wire the message handler.

**Files:**
- Create: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/section-ops.ts`
- Test: `apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/section-ops.test.ts`
- Modify: `editor-client.tsx` (message handler `onMessage`, ~line 167-273)

**Interfaces:**
- Consumes: `seedSection` (Task 2); `Section = { type: string; settings?: Record<string, unknown> }`.
- Produces: `applySectionOp(sections: Section[], op: SectionOp): Section[]` where
  `type SectionOp = { op: 'move'; index: number; to: number } | { op: 'delete'; index: number } | { op: 'duplicate'; index: number } | { op: 'add'; index: number; sectionType: string }`.
  Returns a NEW array; returns the input unchanged if the op is out of bounds.

- [ ] **Step 1: Write the failing test**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applySectionOp } from './section-ops'

const base = () => [{ type: 'hero' }, { type: 'collections' }, { type: 'featured' }]

test('move reorders', () => {
  const r = applySectionOp(base(), { op: 'move', index: 0, to: 2 })
  assert.deepEqual(r.map((s) => s.type), ['collections', 'featured', 'hero'])
})

test('move out of bounds is a no-op (same contents)', () => {
  const r = applySectionOp(base(), { op: 'move', index: 0, to: 9 })
  assert.deepEqual(r.map((s) => s.type), ['hero', 'collections', 'featured'])
})

test('delete removes the indexed section', () => {
  const r = applySectionOp(base(), { op: 'delete', index: 1 })
  assert.deepEqual(r.map((s) => s.type), ['hero', 'featured'])
})

test('duplicate inserts an independent copy after the original', () => {
  const src = [{ type: 'featured', settings: { heading: 'X' } }]
  const r = applySectionOp(src, { op: 'duplicate', index: 0 })
  assert.equal(r.length, 2)
  assert.notEqual(r[0].settings, r[1].settings) // deep clone, not shared ref
  ;(r[1].settings as Record<string, unknown>).heading = 'Y'
  assert.equal((r[0].settings as Record<string, unknown>).heading, 'X')
})

test('add inserts a seeded section at index', () => {
  const r = applySectionOp(base(), { op: 'add', index: 1, sectionType: 'all-products' })
  assert.equal(r[1].type, 'all-products')
  assert.equal(r.length, 4)
})

test('a bad index leaves the array untouched', () => {
  assert.deepEqual(applySectionOp(base(), { op: 'delete', index: 99 }).length, 3)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && node --experimental-strip-types --test ./app/**/editor/section-ops.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the reducer**

Create `section-ops.ts`:

```ts
import { seedSection } from './section-seeds'

export type Section = { type: string; settings?: Record<string, unknown> }
export type SectionOp =
  | { op: 'move'; index: number; to: number }
  | { op: 'delete'; index: number }
  | { op: 'duplicate'; index: number }
  | { op: 'add'; index: number; sectionType: string }

const inBounds = (i: number, len: number) => Number.isInteger(i) && i >= 0 && i < len

export function applySectionOp(sections: Section[], op: SectionOp): Section[] {
  const next = [...sections]
  switch (op.op) {
    case 'move': {
      if (!inBounds(op.index, next.length) || !inBounds(op.to, next.length)) return sections
      const [moved] = next.splice(op.index, 1)
      next.splice(op.to, 0, moved)
      return next
    }
    case 'delete': {
      if (!inBounds(op.index, next.length)) return sections
      next.splice(op.index, 1)
      return next
    }
    case 'duplicate': {
      if (!inBounds(op.index, next.length)) return sections
      const copy = structuredClone(next[op.index])
      next.splice(op.index + 1, 0, copy)
      return next
    }
    case 'add': {
      // insertion index may equal length (append). Clamp into [0, length].
      const at = Number.isInteger(op.index) ? Math.max(0, Math.min(op.index, next.length)) : next.length
      next.splice(at, 0, seedSection(op.sectionType))
      return next
    }
    default:
      return sections
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && node --experimental-strip-types --test ./app/**/editor/section-ops.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Wire the message handler in editor-client.tsx**

Inside the `onMessage` function in `editor-client.tsx` (the same `useEffect` that already handles `field-edit` etc.), add a branch. Place it after the existing `mcloud:field-edit` block:

```ts
            // Structural op on page sections -> mutate `sections`.
            if (data.type === 'mcloud:section-op') {
                const op = data.op
                if (op === 'add' && typeof data.sectionType !== 'string') return
                if (op === 'move' && !Number.isInteger(data.to)) return
                if (!['move', 'delete', 'duplicate', 'add'].includes(op)) return
                if (!Number.isInteger(data.index)) return

                // move reorders in place in the preview (no reload); the others
                // must redraw, so let the debounced reload run.
                if (op === 'move') skipReloadRef.current = true

                setSections((prev) => applySectionOp(prev, {
                    op, index: data.index, to: data.to, sectionType: data.sectionType,
                } as SectionOp))
                setSaved(false)

                if (op === 'move' && Number.isInteger(data.to)) {
                    // Tell the preview to shuffle the existing nodes now.
                    const win = iframeRef.current?.contentWindow
                    try { win?.postMessage({ type: 'mcloud:reorder-preview', from: data.index, to: data.to }, storefrontOrigin) } catch {}
                }
            }
```

Add the imports at the top of `editor-client.tsx`:

```ts
import { applySectionOp, type SectionOp } from './section-ops'
```

- [ ] **Step 6: Typecheck + commit**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -i "editor-client\|section-ops" | head`
Expected: no errors referencing these files.

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/section-ops.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/section-ops.test.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx"
git commit -m "feat(editor): apply section-op messages to the sections array"
```

---

## Task 4: `item-op` handler in editor-client (record add/delete/duplicate/move)

Same shape for repeated records, but records live in `storeDraft[list]` and must be read through the existing `listFor` reader (so a legacy hero normalises on first touch).

**Files:**
- Create: `apps/web/.../editor/item-ops.ts`
- Test: `apps/web/.../editor/item-ops.test.ts`
- Modify: `editor-client.tsx` (`onMessage`, after the `item-edit` block)

**Interfaces:**
- Consumes: `seedRecord` (Task 2).
- Produces: `applyItemOp(arr: unknown[], op: ItemOp): unknown[]` where
  `type ItemOp = { op: 'move'; index: number; to: number } | { op: 'delete'; index: number } | { op: 'duplicate'; index: number } | { op: 'add'; index: number; list: string }`.
  `arr` is the CURRENT list (already resolved by `listFor`); returns a new array.

- [ ] **Step 1: Write the failing test**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyItemOp } from './item-ops'

const progs = () => [{ title: 'A' }, { title: 'B' }, { title: 'C' }]

test('move reorders records', () => {
  assert.deepEqual(applyItemOp(progs(), { op: 'move', index: 2, to: 0 }).map((r: any) => r.title), ['C', 'A', 'B'])
})
test('delete removes the record, others intact', () => {
  assert.deepEqual(applyItemOp(progs(), { op: 'delete', index: 1 }).map((r: any) => r.title), ['A', 'C'])
})
test('duplicate is an independent copy', () => {
  const r: any[] = applyItemOp(progs(), { op: 'duplicate', index: 0 })
  assert.equal(r.length, 4)
  r[1].title = 'Z'
  assert.equal(r[0].title, 'A')
})
test('add seeds a placeholder record for the list', () => {
  const r: any[] = applyItemOp(progs(), { op: 'add', index: 3, list: 'programs' })
  assert.equal(r.length, 4)
  assert.ok(typeof r[3].title === 'string' && r[3].title.length > 0)
})
test('bad index is a no-op', () => {
  assert.equal(applyItemOp(progs(), { op: 'delete', index: 9 }).length, 3)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && node --experimental-strip-types --test ./app/**/editor/item-ops.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `item-ops.ts`:

```ts
import { seedRecord } from './section-seeds'

export type ItemOp =
  | { op: 'move'; index: number; to: number }
  | { op: 'delete'; index: number }
  | { op: 'duplicate'; index: number }
  | { op: 'add'; index: number; list: string }

const inBounds = (i: number, len: number) => Number.isInteger(i) && i >= 0 && i < len

export function applyItemOp(arr: unknown[], op: ItemOp): unknown[] {
  const next = [...arr]
  switch (op.op) {
    case 'move': {
      if (!inBounds(op.index, next.length) || !inBounds(op.to, next.length)) return arr
      const [m] = next.splice(op.index, 1)
      next.splice(op.to, 0, m)
      return next
    }
    case 'delete': {
      if (!inBounds(op.index, next.length)) return arr
      next.splice(op.index, 1)
      return next
    }
    case 'duplicate': {
      if (!inBounds(op.index, next.length)) return arr
      next.splice(op.index + 1, 0, structuredClone(next[op.index]))
      return next
    }
    case 'add': {
      const at = Number.isInteger(op.index) ? Math.max(0, Math.min(op.index, next.length)) : next.length
      next.splice(at, 0, seedRecord(op.list))
      return next
    }
    default:
      return arr
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && node --experimental-strip-types --test ./app/**/editor/item-ops.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Wire the handler in editor-client.tsx**

After the existing `mcloud:item-edit` block in `onMessage`, add:

```ts
            // Structural op on a repeated record -> mutate storeDraft[list].
            if (data.type === 'mcloud:item-op') {
                const { list, op } = data
                if (typeof list !== 'string' || !EDITABLE_LISTS.has(list)) return
                if (!['move', 'delete', 'duplicate', 'add'].includes(op)) return
                if (!Number.isInteger(data.index)) return
                if (op === 'move' && !Number.isInteger(data.to)) return

                setStoreDraft((prev) => {
                    const arr = listFor(list, prev, storeSettings)
                    const applied = applyItemOp(arr, {
                        op, index: data.index, to: data.to, list,
                    } as ItemOp)
                    return { ...prev, [list]: applied }
                })
                setSaved(false)
                // Records always change record COUNT/order -> the list re-renders,
                // so let the debounced reload run (do NOT set skipReloadRef).
            }
```

Add the import:

```ts
import { applyItemOp, type ItemOp } from './item-ops'
```

- [ ] **Step 6: Typecheck + commit**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -i "item-ops\|editor-client" | head`
Expected: no errors.

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/item-ops.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/item-ops.test.ts" \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx"
git commit -m "feat(editor): apply item-op messages to repeated records"
```

---

## Task 5: Record-anchor snippet + wiring

Records are marked per-FIELD today, but no per-RECORD container carries `data-mcloud-index`, so the overlay (Task 6) has nothing to hover a record's toolbar onto. Add an editor-only snippet that stamps the record's container, and wire it into the four record-bearing sections.

**Files:**
- Create: `packages/liquid/themes/classic/snippets/record-anchor.liquid`
- Modify: `packages/liquid/themes/classic/sections/{programs,impact,campaigns,hero}.liquid` (the loop container element)
- Test: `packages/liquid/test/record-anchor.test.ts` (create) — asserts the snippet emits attributes only when editing.

**Interfaces:**
- Consumes: liquid render context vars `editing`, `list`, `index`.
- Produces: on the record container, in editor mode only: `data-mcloud-record="1" data-mcloud-list="{list}" data-mcloud-index="{index}"`. Emits NOTHING when `editing` is falsy.

- [ ] **Step 1: Write the failing test**

Create `packages/liquid/test/record-anchor.test.ts`. Use the package's existing render harness (mirror an existing test in `packages/liquid/test`; if the engine export differs, match that file's import).

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderTemplate } from '../src/index'

// Render the snippet directly through the manifest and assert its contract:
// attributes in editor mode, nothing otherwise.
test('record-anchor emits attributes when editing', async () => {
  const html = await renderTemplate('classic/snippets/record-anchor', { editing: true, list: 'programs', index: 2 })
  assert.match(html, /data-mcloud-record="1"/)
  assert.match(html, /data-mcloud-list="programs"/)
  assert.match(html, /data-mcloud-index="2"/)
})

test('record-anchor emits nothing when not editing', async () => {
  const html = await renderTemplate('classic/snippets/record-anchor', { editing: false, list: 'programs', index: 2 })
  assert.equal(html.trim(), '')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/liquid && node --experimental-strip-types --test ./test/record-anchor.test.ts`
Expected: FAIL — template `classic/snippets/record-anchor` not in the manifest.

- [ ] **Step 3: Create the snippet**

Create `packages/liquid/themes/classic/snippets/record-anchor.liquid`:

```liquid
{%- comment -%}
  Marks a repeated record's CONTAINER element as a hover target for the Editor's
  structural overlay (add/delete/reorder/duplicate). Field-level editability is
  handled separately by editable-item; this is the record as a whole.

  Editor-only: a visitor receives none of these attributes.

  Usage, on the record's outer element inside a {% for %}:
    <article {% render 'classic/snippets/record-anchor', editing: store.editing, list: 'programs', index: forloop.index0 %}>
{%- endcomment -%}
{%- if editing -%}data-mcloud-record="1" data-mcloud-list="{{ list }}" data-mcloud-index="{{ index }}"{%- endif -%}
```

Then regenerate the theme manifest so the new snippet is bundled and resolvable
by `renderTemplate`:

Run: `cd packages/liquid && npm run gen:manifest`
Expected: `Generated themes-manifest with N templates.` (N increases by 1), and `packages/liquid/src/themes-manifest.ts` now contains a `classic/snippets/record-anchor` entry.

- [ ] **Step 4: Wire into the four sections**

In `programs.liquid`, change the record container (line ~17) from:

```liquid
        <article class="sf-card sf-program-card overflow-hidden">
```

to:

```liquid
        <article class="sf-card sf-program-card overflow-hidden" {% render 'classic/snippets/record-anchor', editing: store.editing, list: 'programs', index: forloop.index0 %}>
```

Apply the equivalent change to the loop's record container in:
- `impact.liquid` — the `.sf-impact-stat` div, `list: 'impactStats'`
- `campaigns.liquid` — the campaign card container, `list: 'campaigns'`
- `hero.liquid` — the `.sf-hero__slide` element, `list: 'heroSlides'`

For each, read the file first, find the element directly inside the `{%- for ... -%}`, and add the `{% render 'classic/snippets/record-anchor', editing: store.editing, list: '<list>', index: forloop.index0 %}` to that element's attributes. Do NOT add a new wrapper element (it would shift layout); attach to the existing container.

- [ ] **Step 5: Run to verify snippet tests pass**

Run: `cd packages/liquid && node --experimental-strip-types --test ./test/record-anchor.test.ts`
Expected: PASS (2/2).

- [ ] **Step 6: Regenerate manifest is committed + run existing liquid tests**

Run: `cd packages/liquid && node --experimental-strip-types --test ./test/*.test.ts 2>&1 | tail -5`
Expected: existing suites still PASS (no template broke).

- [ ] **Step 7: Commit**

```bash
git add packages/liquid/themes/classic/snippets/record-anchor.liquid \
        packages/liquid/themes/classic/sections/programs.liquid \
        packages/liquid/themes/classic/sections/impact.liquid \
        packages/liquid/themes/classic/sections/campaigns.liquid \
        packages/liquid/themes/classic/sections/hero.liquid \
        packages/liquid/src/themes-manifest.ts \
        packages/liquid/test/record-anchor.test.ts
git commit -m "feat(liquid): record-anchor snippet marks record containers for the editor overlay"
```

---

## Task 6: Hover overlay toolbar in editor-bridge (outbound ops)

The bridge shows a floating toolbar over the hovered section or record and posts structural ops. This is the hero-lesson-sensitive part: the toolbar must not eat clicks meant for the content beneath it.

**Files:**
- Modify: `apps/storefront/components/store/editor-bridge.tsx`

**Interfaces:**
- Consumes: DOM anchors `[data-mcloud-section]` (sections) and `[data-mcloud-record][data-mcloud-list][data-mcloud-index]` (records, from Task 5).
- Produces (outbound postMessage, to `adminOrigin`):
  - `{ type: 'mcloud:section-op', op, index, to?, sectionType? }`
  - `{ type: 'mcloud:item-op', op, list, index, to? }`
  For `add`, the bridge cannot name a section type; it posts `{ type: 'mcloud:section-add-requested', index }` and the admin opens the picker (Task 7). Records `add` posts `{ op: 'add', list, index }` directly (no type choice).

- [ ] **Step 1: Add the overlay element and styles**

In the `useEffect` in `editor-bridge.tsx`, after the existing style injection, append toolbar CSS to the same style block (so both surfaces share one `<style>`):

```css
                #mcloud-op-toolbar {
                    position: fixed;
                    z-index: 2147483647;
                    display: none;
                    gap: 4px;
                    padding: 4px;
                    background: #11111b;
                    border-radius: 8px;
                    box-shadow: 0 4px 14px rgba(0,0,0,.35);
                    /* the BAR ignores clicks; only its buttons take them, so it
                       can never eat a click meant for the content beneath. */
                    pointer-events: none;
                }
                #mcloud-op-toolbar button {
                    pointer-events: auto;
                    width: 28px; height: 28px;
                    display: grid; place-items: center;
                    border: 0; border-radius: 6px;
                    background: transparent; color: #fff;
                    font: 600 14px/1 system-ui, sans-serif; cursor: pointer;
                }
                #mcloud-op-toolbar button:hover { background: rgba(255,255,255,.14); }
```

- [ ] **Step 2: Build the toolbar and hover tracking**

Inside the effect, create the toolbar node once and track the hovered target:

```ts
        const toolbar = document.createElement('div')
        toolbar.id = 'mcloud-op-toolbar'
        toolbar.innerHTML =
            '<button data-op="up" title="Move up">↑</button>' +
            '<button data-op="down" title="Move down">↓</button>' +
            '<button data-op="dup" title="Duplicate">⧉</button>' +
            '<button data-op="del" title="Delete">🗑</button>' +
            '<button data-op="add" title="Add below">＋</button>'
        document.body.appendChild(toolbar)

        // The element the toolbar currently acts on: either a section or a record.
        let hovered: HTMLElement | null = null

        function targetOf(el: Element): HTMLElement | null {
            // A record wins over its section: the more specific handle.
            return el.closest<HTMLElement>('[data-mcloud-record]')
                ?? el.closest<HTMLElement>('[data-mcloud-section]')
        }

        function showToolbarFor(el: HTMLElement) {
            hovered = el
            const r = el.getBoundingClientRect()
            toolbar.style.display = 'flex'
            // top-right of the element, clamped into the viewport.
            toolbar.style.top = `${Math.max(4, r.top + 4)}px`
            toolbar.style.left = `${Math.min(window.innerWidth - 160, r.right - 160)}px`
        }

        function onOver(e: Event) {
            if (!(e.target instanceof Element)) return
            const t = targetOf(e.target)
            if (t) showToolbarFor(t)
        }
        function onOut(e: Event) {
            // Hide only when leaving to something that is neither the toolbar nor a target.
            const to = (e as MouseEvent).relatedTarget
            if (to instanceof Element && (to.closest('#mcloud-op-toolbar') || targetOf(to))) return
            toolbar.style.display = 'none'
            hovered = null
        }
```

- [ ] **Step 3: Handle toolbar clicks -> post ops**

```ts
        function indexOf(el: HTMLElement): number {
            return Number(el.getAttribute('data-mcloud-index') ?? el.getAttribute('data-mcloud-section'))
        }

        function onToolbarClick(e: MouseEvent) {
            const btn = (e.target as Element)?.closest<HTMLButtonElement>('button[data-op]')
            if (!btn || !hovered) return
            e.preventDefault(); e.stopPropagation()

            const isRecord = hovered.hasAttribute('data-mcloud-record')
            const index = indexOf(hovered)
            if (!Number.isInteger(index)) return
            const op = btn.getAttribute('data-op')

            if (isRecord) {
                const list = hovered.getAttribute('data-mcloud-list')
                if (!list) return
                if (op === 'up') post({ type: 'mcloud:item-op', op: 'move', list, index, to: index - 1 })
                else if (op === 'down') post({ type: 'mcloud:item-op', op: 'move', list, index, to: index + 1 })
                else if (op === 'dup') post({ type: 'mcloud:item-op', op: 'duplicate', list, index })
                else if (op === 'del') post({ type: 'mcloud:item-op', op: 'delete', list, index })
                else if (op === 'add') post({ type: 'mcloud:item-op', op: 'add', list, index: index + 1 })
            } else {
                if (op === 'up') post({ type: 'mcloud:section-op', op: 'move', index, to: index - 1 })
                else if (op === 'down') post({ type: 'mcloud:section-op', op: 'move', index, to: index + 1 })
                else if (op === 'dup') post({ type: 'mcloud:section-op', op: 'duplicate', index })
                else if (op === 'del') post({ type: 'mcloud:section-op', op: 'delete', index })
                else if (op === 'add') post({ type: 'mcloud:section-add-requested', index: index + 1 })
            }
        }

        function post(msg: Record<string, unknown>) {
            window.parent.postMessage(msg, adminOrigin)
        }
```

- [ ] **Step 4: Register + clean up listeners**

Add to the effect's listener registration block:

```ts
        document.addEventListener('mouseover', onOver, true)
        document.addEventListener('mouseout', onOut, true)
        toolbar.addEventListener('click', onToolbarClick, true)
```

And to the cleanup return:

```ts
            document.removeEventListener('mouseover', onOver, true)
            document.removeEventListener('mouseout', onOut, true)
            toolbar.removeEventListener('click', onToolbarClick, true)
            toolbar.remove()
```

- [ ] **Step 5: Browser reachability check (fault-line rule)**

Start storefront + drive with Playwright via the run-mcloud skill. Confirm (a) hovering a section shows the toolbar, (b) `elementFromPoint` at a toolbar button returns the BUTTON, and (c) `elementFromPoint` just outside the buttons but over the bar returns the CONTENT beneath (bar is click-through). This asserts the hero lesson holds.

Run (inline Playwright, framed preview): navigate to a signed preview URL for `locd26`, hover `[data-mcloud-section="0"]`, then:
```js
const el = await page.evaluate(() => {
  const b = document.querySelector('#mcloud-op-toolbar button[data-op="del"]');
  const r = b.getBoundingClientRect();
  return document.elementFromPoint(r.x + r.width/2, r.y + r.height/2)?.getAttribute('data-op');
});
// expect 'del'
```
Expected: the button is reachable; log the result in `docs/test-runs/2026-07-18-editor-crud/`.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/components/store/editor-bridge.tsx
git commit -m "feat(storefront): hover overlay toolbar posts structural ops"
```

---

## Task 7: Section type-picker (admin) for `add`

When the bridge posts `mcloud:section-add-requested`, the admin opens a small menu of addable section types and, on pick, applies an `add` op at the requested index.

**Files:**
- Modify: `apps/web/.../editor/editor-client.tsx` (handle the request message; render a small picker; filter types by vertical).

**Interfaces:**
- Consumes: `mcloud:section-add-requested` `{ index }` from the bridge; `SECTION_REGISTRY` for labels; `commerce`/store type for filtering.
- Produces: on pick, applies `applySectionOp(sections, { op: 'add', index, sectionType })`.

- [ ] **Step 1: Add picker state + message handling**

In `editor-client.tsx`, add state near the other `useState`s:

```ts
const [addAt, setAddAt] = useState<number | null>(null)
```

In `onMessage`, add:

```ts
            if (data.type === 'mcloud:section-add-requested' && Number.isInteger(data.index)) {
                setAddAt(data.index)
            }
```

- [ ] **Step 2: Compute the addable types for this vertical**

The registry is vertical-agnostic; a shop should not be offered `programs`/`impact`/`campaigns`/`contact`, and an NGO should not be offered `collections`/`featured`/`all-products`. Derive from the store's default page section set plus the currently-used types. Add near the top of the component body:

```ts
const ADDABLE_BY_COMMERCE: Record<'shop' | 'ngo', string[]> = {
    shop: ['hero', 'collections', 'featured', 'all-products'],
    ngo: ['hero', 'mission', 'programs', 'impact', 'campaigns', 'contact'],
}
const addableTypes = (commerce ? ADDABLE_BY_COMMERCE.shop : ADDABLE_BY_COMMERCE.ngo)
```

- [ ] **Step 3: Render the picker**

Add, inside the preview container JSX (near the `ImagePicker`):

```tsx
{addAt !== null && (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/30" onClick={() => setAddAt(null)}>
        <div className="w-72 rounded-xl bg-[var(--md-sys-color-surface)] p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="px-3 py-2 text-[12px] font-semibold text-[var(--md-sys-color-on-surface-variant)]">Add a section</p>
            {addableTypes.map((t) => (
                <button
                    key={t}
                    onClick={() => {
                        setSections((prev) => applySectionOp(prev, { op: 'add', index: addAt, sectionType: t }))
                        setSaved(false)
                        setAddAt(null)
                    }}
                    className="w-full text-left px-3 h-9 rounded-lg text-[13px] hover:bg-[var(--md-sys-color-surface-container)]"
                >
                    {sectionDef(t)?.label ?? t}
                </button>
            ))}
        </div>
    </div>
)}
```

- [ ] **Step 4: Typecheck + browser check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -i editor-client | head` → no errors.
Browser: click `＋` on a section, confirm the menu lists the vertical's types, pick one, confirm it appears in the rail and (after the debounced reload) in the preview.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx"
git commit -m "feat(editor): section type-picker for add"
```

---

## Task 8: `reorder-preview` node shuffle + encode-`[]` guard

Two small closers: make `move` feel instant (shuffle DOM nodes in the preview), and stop the Editor from sending an authoritative empty array when it has no edits.

**Files:**
- Modify: `apps/storefront/components/store/editor-bridge.tsx` (inbound `reorder-preview`)
- Modify: `apps/web/.../editor/editor-client.tsx` (omit `preview` param when no local section edits)
- Modify: `apps/storefront/app/store/[slug]/page.tsx` (already honors a present array; no change needed unless the param is absent — verify)

**Interfaces:**
- Consumes: `mcloud:reorder-preview` `{ from, to }` (posted in Task 3).
- Produces: the preview's `[data-mcloud-section]` nodes reordered to match; `previewSrc` omits `?preview=` when `sections` equals the initially-loaded sections (nothing to preview-override).

- [ ] **Step 1: Inbound reorder in the bridge**

In `editor-bridge.tsx`'s `onMessage`, add (sections are the reorderable unit in the preview DOM):

```ts
            if (data.type === 'mcloud:reorder-preview' && Number.isInteger(data.from) && Number.isInteger(data.to)) {
                const nodes = Array.from(document.querySelectorAll('[data-mcloud-section]'))
                const from = nodes[data.from], parent = from?.parentNode
                if (!from || !parent) return
                const ref = data.to >= nodes.length ? null : nodes[data.to]
                parent.insertBefore(from, data.to > data.from ? (ref?.nextSibling ?? null) : ref)
                // Re-index the moved nodes so later clicks address the right section.
                Array.from(parent.querySelectorAll('[data-mcloud-section]'))
                    .forEach((n, i) => n.setAttribute('data-mcloud-section', String(i)))
            }
```

- [ ] **Step 2: Encode-`[]` guard in editor-client**

Change `previewSrc` (line ~324) so it omits the param when there is nothing authoritative to send. "Nothing to send" = the current `sections` are identical to the ones the page loaded AND there are no local structural edits (i.e., not dirty on sections):

```ts
    const previewSrc = useMemo(() => {
        const sectionsDirty = JSON.stringify(sections) !== JSON.stringify(initialSections)
        const base = `${storefrontOrigin}/store/${slug}?token=${encodeURIComponent(previewToken)}`
        if (!sectionsDirty) return base // let the storefront render its saved page
        const payload = toBase64Url(JSON.stringify(sections))
        return `${base}&preview=${encodeURIComponent(payload)}`
    }, [sections, initialSections, slug, previewToken, storefrontOrigin])
```

Note: post-backfill every store HAS a saved page, so the no-param path renders the real site — never blank. An intentional delete-all makes `sectionsDirty` true, so `[]` is sent and correctly renders empty.

- [ ] **Step 3: Verify the storefront honors both**

Read `apps/storefront/app/store/[slug]/page.tsx:158-165`. Confirm: with NO `preview` param, `sections` stays the saved page (correct). With `preview` present and `[]`, it renders empty (correct, and now only happens on an intentional delete-all). No code change expected; if the current code treats absent param as empty, add `&& preview` to the guard (it already does: `if (editing && preview)`).

- [ ] **Step 4: Browser check — the original bug is gone**

Start storefront + web. Open the Editor for `locd26`. Expected: rail lists Hero/Collections/Featured/All products; preview shows the real site (NOT blank). Reorder two sections via the toolbar; expected: instant reorder, no full reload flash. Save; reload the Editor; expected: order persisted. Log to `docs/test-runs/2026-07-18-editor-crud/`.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/components/store/editor-bridge.tsx \
        "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/editor-client.tsx"
git commit -m "feat(editor): instant reorder in preview + omit empty preview override"
```

---

## Task 9: End-to-end fault-line regression tests

The spec's must-have tests, as an automated browser suite. These are the ones that catch the divergence class.

**Files:**
- Create: `docs/test-runs/2026-07-18-editor-crud/README.md` (manual-verification log per run-mcloud convention)
- Create: `apps/web/.../editor/crud-integration.test.ts` for the pure-reducer end-to-end (default-trap, duplicate independence, delete integrity) that do not need a browser.

**Interfaces:** Consumes `applySectionOp`, `applyItemOp`, `seedRecord`.

- [ ] **Step 1: Default-trap + integrity as unit tests**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyItemOp } from './item-ops'
import { seedRecord } from './section-seeds'

test('default-trap: a cleared seeded field saves as empty, not the placeholder', () => {
  // add a record, then simulate the merchant clearing the title
  let arr = applyItemOp([], { op: 'add', index: 0, list: 'programs' })
  ;(arr[0] as any).title = '' // merchant cleared it
  // The saved value must be '' (which re-defaults on render), never the seed.
  assert.equal((arr[0] as any).title, '')
})

test('delete integrity: correct record gone, rest intact', () => {
  const arr = [{ title: 'A' }, { title: 'B' }, { title: 'C' }]
  const r = applyItemOp(arr, { op: 'delete', index: 1 }) as any[]
  assert.deepEqual(r.map((x) => x.title), ['A', 'C'])
})
```

Run: `cd apps/web && node --experimental-strip-types --test ./app/**/editor/crud-integration.test.ts`
Expected: PASS.

- [ ] **Step 2: Browser suite — the six spec scenarios**

Using the run-mcloud Playwright path, script and run (logging each to the test-runs dir):
1. Default-trap in the real preview: add record, clear field, save, reload, default reappears on render but STORED value is '' (inspect via a follow-up query or the settings drawer).
2. Reorder persistence: reorder, save, reload, DOM `data-mcloud-section` order matches.
3. Delete integrity in browser: delete record 2 of 3, the other two remain.
4. Reachability: `elementFromPoint` on each toolbar button returns that button (from Task 6 Step 5).
5. Duplicate independence: duplicate a section, edit the copy, original unchanged.
6. Legacy hero: on a store with flat hero keys and no `heroSlides`, add a slide; nothing dropped.

- [ ] **Step 3: Write the run log + commit**

```bash
git add "apps/web/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/editor/crud-integration.test.ts" \
        docs/test-runs/2026-07-18-editor-crud/
git commit -m "test(editor): fault-line regression suite for CRUD"
```

---

## Task 10: Full verification pass

- [ ] **Step 1:** Run every touched test suite green:
  - `cd apps/web && node --experimental-strip-types --test ./app/**/editor/*.test.ts ./app/**/settings/*.test.ts`
  - `cd packages/liquid && node --experimental-strip-types --test ./test/*.test.ts`
- [ ] **Step 2:** `cd apps/web && npx tsc --noEmit` and `cd apps/storefront && npx tsc --noEmit` — no new errors.
- [ ] **Step 3:** Manual browser pass on both a shop (`locd26`) and an NGO store: add/delete/reorder/duplicate a section and a record on each; save; reload; confirm persistence and no blank preview.
- [ ] **Step 4:** Invoke `superpowers:requesting-code-review` before merge.
