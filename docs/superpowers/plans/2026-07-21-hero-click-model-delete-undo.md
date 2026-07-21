# Hero Editor: click-model refactor + slide delete + delete-undo

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans or subagent-driven-development. Steps use `- [ ]`.

**Goal:** Stop the editor click handler from stealing clicks (intercept only real navigation), give each hero slide its own confirmed delete in the filmstrip, and add a "Deleted. Undo?" safety net for any structural delete.

**Architecture:** Three focused changes on top of the shipped hero-slide-CRUD work. (1) `editor-bridge.tsx` `onClick` becomes intercept-only-navigation. (2) The filmstrip gains per-slide delete (×) with a confirm; section/slide deletes confirm. (3) `editor-client.tsx` snapshots state before a delete and shows an auto-dismiss undo toast that restores it.

**Tech Stack:** React (editor-client), liquidjs (hero.liquid filmstrip), TypeScript, Playwright via run-mcloud.

## Global Constraints

- On `main` (deploying with the CRUD work). No new server action or schema.
- **The click handler regressed twice this session** — after the refactor, re-verify in a REAL browser: text edit, image picker, section select, filmstrip dots, add-slide, the hero CTA (must NOT navigate), and a normal product link (must NOT navigate in editor).
- Editor-only markup gated on `store.editing`; visitors unaffected.
- No em/en dashes in merchant-facing copy (confirm prompts, toast, labels).
- Fault line: deletes operate on the same `sections`/`storeDraft` state; undo restores an exact prior snapshot.

---

## Task 1: Refactor onClick to intercept-only-navigation

Replace the blanket `preventDefault()/stopPropagation()` on every hero/section click with targeted interception: block ONLY clicks that would navigate or submit; leave everything else to proceed normally (dots, editable text, images, plain content).

**Files:** Modify `apps/storefront/components/store/editor-bridge.tsx` (`onClick`, ~line 454).

- [ ] **Step 1:** Define what "navigational" means. In `onClick`, after resolving `field`/`image`/`index`, compute:
```ts
const nav = e.target instanceof Element
  ? e.target.closest('a[href], button[type="submit"], .sf-donate, [onclick]')
  : null
```
- [ ] **Step 2:** Only preventDefault/stopPropagation when needed:
  - If `nav` and NOT an editable field/image: `e.preventDefault(); e.stopPropagation()` (stop the navigation), then fall through to section-select. This keeps "clicking Shop now / Donate in the editor doesn't leave the page".
  - If `field` (editable) or `image`: preventDefault only (so no native nav/selection quirk), handle edit/picker as today. Do NOT stopPropagation broadly.
  - Otherwise (plain content, dots already bailed above): do nothing special — no preventDefault, no stopPropagation. Section-select can still run for section-click reporting without blocking the event.
  Remove the unconditional `e.preventDefault(); e.stopPropagation()` at the top of the post-resolve block.
- [ ] **Step 3:** Keep the existing early bail for `.sf-hero__dot, [data-mcloud-add-slide]` (already present).
- [ ] **Step 4:** `cd apps/storefront && npx tsc --noEmit 2>&1 | grep editor-bridge` → clean.
- [ ] **Step 5: Browser re-verify (REAL clicks, both apps up), log to docs/test-runs/2026-07-21-hero-click-model/:**
  - Edit a hero heading → caret + type works.
  - Click an image area → picker opens.
  - Click a section (non-hero) → rail selects it.
  - Filmstrip dots page slides; add-slide adds.
  - Click hero CTA (Shop now/Donate) → does NOT navigate/scroll away.
  - Click a product card link elsewhere → does NOT navigate in the editor.
- [ ] **Step 6:** Commit: `refactor(editor): intercept only navigational clicks, stop swallowing everything`.

---

## Task 2: Per-slide delete in the filmstrip + confirms

Give each filmstrip slide its own delete control, distinct from the section toolbar, and confirm both slide- and section-delete so an accidental click can't nuke the hero.

**Files:**
- `packages/liquid/themes/classic/sections/hero.liquid` (filmstrip: per-slide × in editor)
- `apps/storefront/components/store/editor-bridge.tsx` (wire × → item-op delete heroSlides at that index; add confirm to slide- AND section-delete)
- Regenerate manifest.

- [ ] **Step 1:** In the filmstrip loop (editor only), add a small delete affordance per dot carrying its index:
```liquid
{%- if store.editing -%}<button type="button" class="sf-hero__slide-del" data-mcloud-del-slide="{{ forloop.index0 }}" aria-label="Delete slide {{ forloop.index }}">×</button>{%- endif -%}
```
Place it so it reads as "delete THIS slide" (e.g. a small × on/after each numbered dot). Style in the bridge CSS (editor-only, clearly a delete).
- [ ] **Step 2:** In the bridge, add `onDeleteSlide` (capture, before onClick, like onAddSlide):
```ts
function onDeleteSlide(e: MouseEvent) {
  const btn = (e.target as Element)?.closest<HTMLElement>('[data-mcloud-del-slide]')
  if (!btn) return
  e.preventDefault(); e.stopPropagation()
  const index = Number(btn.getAttribute('data-mcloud-del-slide'))
  if (!Number.isInteger(index)) return
  const total = document.querySelectorAll('[data-mcloud-record][data-mcloud-list="heroSlides"]').length
  if (total <= 1) { window.alert('This is the only slide. A hero needs at least one slide.'); return }
  if (!window.confirm('Delete this slide? You can undo right after.')) return
  post({ type: 'mcloud:item-op', op: 'delete', list: 'heroSlides', index })
}
```
Register + clean up alongside onAddSlide.
- [ ] **Step 3:** Add a confirm to the SECTION delete in `onToolbarClick` (the section 🗑 path): before posting `section-op delete`, `if (!window.confirm('Delete this whole section?')) return`. This is the guard against "deleted the whole hero by accident".
- [ ] **Step 4:** Regenerate manifest; `tsc` clean for editor-bridge.
- [ ] **Step 5: Browser verify:** the filmstrip × deletes ONLY that slide (others intact), confirm appears; deleting the last slide is blocked; the section 🗑 now confirms before removing the hero.
- [ ] **Step 6:** Commit: `feat(hero): per-slide delete in filmstrip + confirm on slide and section delete`.

---

## Task 3: "Deleted. Undo?" safety net

After any structural delete (slide or section), snapshot the pre-delete state and show an auto-dismissing toast that restores it on click.

**Files:** `apps/web/.../editor/editor-client.tsx`.

- [ ] **Step 1:** Add undo state + a ref for the pending snapshot:
```ts
const [undo, setUndo] = useState<{ label: string; restore: () => void } | null>(null)
```
- [ ] **Step 2:** In the `section-op` handler, when `op === 'delete'`, capture `sections` BEFORE applying and register undo:
```ts
if (op === 'delete') {
  const prevSections = sections
  setUndo({ label: 'Section deleted.', restore: () => { setSections(prevSections); setSaved(false) } })
}
```
Do the analogous capture in the `item-op` handler for `op === 'delete'` (snapshot `storeDraft` — specifically the affected list via `listFor`, restore `storeDraft`). Snapshot BEFORE the setState that applies the delete.
- [ ] **Step 3:** Auto-dismiss: when `undo` is set, start a ~6s timer to clear it (useEffect on `undo`). Clicking Undo runs `restore()` then clears.
- [ ] **Step 4:** Render the toast (bottom-center, above the preview), editor-chrome styled, with an "Undo" button. No em dashes in the copy.
- [ ] **Step 5:** `tsc` clean.
- [ ] **Step 6: Browser verify:** delete a slide → toast appears → Undo restores it (and the carousel shows it again after the reload). Delete a section → Undo restores it. Toast auto-dismisses after ~6s. Undo works BEFORE save; after save it is a normal edit (acceptable).
- [ ] **Step 7:** Commit: `feat(editor): undo toast for slide and section deletes`.

---

## Task 4: Full verification

- [ ] Unit suites green (web + liquid); both apps `tsc` clean.
- [ ] Real-browser pass on locd26 (3-slide) + a single-slide store + a non-commerce (NGO) store: click model (no stolen clicks, no unwanted nav), per-slide delete + confirm, section-delete confirm, undo for both, visitor sees normal carousel with working CTA + dots.
- [ ] `superpowers:requesting-code-review` before considering done.
