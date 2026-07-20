# Code Review: Editor CRUD (diff `25f8bf8..bb98366`)

**Date:** 2026-07-20
**Scope:** The Editor CRUD feature merged to `main` — 22 files, 705 insertions. Section + record add/delete/reorder/duplicate driven from a hover overlay in the storefront preview, persisted through existing server actions, with a token-gated settings override for live record preview.
**Business context provided:** Full context (this reviewer built the feature). Goal: turn the Editor into a page builder by doing structural CRUD in the live preview. Governing constraint is the project's "render/save divergence" fault line and the "hero lesson" (overlays must not eat clicks).
**Tools used:** `npm audit` (present — see Dependency section). `semgrep`, `gitleaks`, `trufflehog` not installed — security reviewed manually.

## Summary
- **Overall risk: Low.** The feature is well-structured: pure bounds-checked reducers, a consistent message-validation posture, and the security-sensitive settings override is correctly token-gated.
- **Findings: 0 Critical, 0 High, 2 Medium, 3 Low, 2 Questions for Author.**
- Shape: 6 new small pure modules + 2 handler integrations (editor-client, editor-bridge) + 1 storefront render change + 4 Liquid section edits + 1 new snippet. Heavily unit-tested (26 tests).

## Code Walkthrough

### `section-ops.ts` / `item-ops.ts` (pure reducers)
- Called by editor-client message handlers when the preview posts a structural op.
- `applySectionOp(sections, op, seed)` / `applyItemOp(arr, op, seed)`: switch on `op.op`.
  - move: bounds-check both indices, `splice` out + `splice` in; out-of-bounds → return input unchanged.
  - delete: bounds-check, `splice` out.
  - duplicate: `structuredClone` the item, insert after.
  - add: clamp insert index into `[0, len]`, insert `seed(...)`.
- Seeder injected (not imported) so the module has no registry dependency and stays unit-testable under the bare node runner.

### `section-seeds.ts` / `section-seeds-registry.ts`
- `fillDefaults(schema)`: copy declared `default` values into a settings object. Pure.
- `EDITABLE_LISTS_SEEDS`: placeholder record per list; campaigns seed carries the full renderer schema (`goalAmount`/`presets`/`allowCustomAmount`/`minAmount`).
- `seedRecord(list)`: clone the placeholder; for `campaigns`, attach a fresh `id` (else `readCampaigns` filters it out).
- `seedSection(type)` (registry file): look up `SECTION_REGISTRY[type].schema`, delegate to `fillDefaults`. Kept in a separate file so its registry import never reaches the test runner.

### `section-validate.ts` + `actions.ts` (updatePageSections)
- `validateSectionTypes(next, stored, known)`: each next section's `type` must be in `known` (registry keys) OR already stored. Pure.
- `updatePageSections` swaps the old `sameShape` guard (rejected any count/order change) for this validator, so CRUD can change structure while still blocking injection of an unknown type.

### `editor-client.tsx` (inbound message handlers)
- Inside the existing `onMessage` (guarded by `e.origin !== storefrontOrigin`).
- `section-add-requested` → set `addAt` (opens the type-picker overlay).
- `section-op` → validate op ∈ {move,delete,duplicate,add}, integer index, (add needs string sectionType, move needs integer to); apply via `applySectionOp(..., seedSection)`; `move` sets `skipReloadRef` and posts `reorder-preview` down.
- `item-op` → validate `list ∈ EDITABLE_LISTS`, op, integer index; read current list via `listFor` (normalizes legacy hero); apply via `applyItemOp(..., seedRecord)`.
- `previewSrc`: builds the iframe URL via `URLSearchParams`; adds `preview` only when sections differ from initial, adds `settings` (base64url of `storeDraft`) only when the draft is non-empty.
- Type-picker overlay: on pick, `applySectionOp` add at `addAt`, filtered to shop vs ngo type list.

### `editor-bridge.tsx` (storefront preview, hover toolbar)
- Runs only when framed (`window.parent !== window`) and origin-validated.
- Injects a `#mcloud-op-toolbar` (bar `pointer-events:none`, buttons `pointer-events:auto`).
- `mouseover`/`mouseout` (capture) track the hovered target; a record (`[data-mcloud-record]`) wins over its section.
- `onToolbarClick` reads index from `data-mcloud-index` (record) or `data-mcloud-section`, posts `item-op`/`section-op`/`section-add-requested` to the admin origin.
- Inbound `reorder-preview`: `insertBefore` the moved node, then renumber all `data-mcloud-section` attributes.
- All new listeners removed + `toolbar.remove()` in cleanup.

### `page.tsx` (storefront home, settings override)
- After the existing sections `preview` override: if `editing && settings`, parse base64url → plain object, merge `{ ...saved, ...override }`, rebuild `previewStore = castStore({...rawStore, settings: merged})`, and pass `merged` to `loadCampaignsWithProgress`. Parse failure falls through to saved settings.

### Liquid: `record-anchor.liquid` + 4 section edits
- New snippet emits `data-mcloud-record/list/index` only when `editing`.
- Wired onto each per-record container in programs/impact/campaigns/hero (no new wrapper element).

## Findings

### `apps/web/.../editor/editor-client.tsx`

**[Medium] Process — record `move` is not sent to the preview instantly, unlike section move**
`item-op` handler deliberately does not set `skipReloadRef` and posts no `reorder-preview`, so reordering a record waits for the full ~1.6s debounced Liquid reload while a section reorder is instant. Not a correctness bug — a UX asymmetry the merchant will feel on lists (programs, slides). Acceptable for v1; worth a follow-up (a record-level `reorder-preview` keyed by `[data-mcloud-list][data-mcloud-index]`).

**[Low] Coding principles — `applySectionOp` receives `to`/`sectionType` for ops that don't use them**
`{ op, index, to: data.to, sectionType: data.sectionType } as SectionOp` passes `undefined` fields for delete/duplicate. Harmless (the reducer ignores them and the discriminated-union cast is only shape-widening), but the `as SectionOp` cast hides that `data.to`/`data.sectionType` are `any` off the message. Minor type-safety smell; the runtime guards above it cover the real cases.

### `apps/storefront/components/store/editor-bridge.tsx`

**[Medium] Process — toolbar index for a record is the *rendered* (possibly filtered) forloop index, which can diverge from the raw stored array**
`toolbarIndexOf` reads `data-mcloud-index` = `forloop.index0` over the list the template actually renders. For campaigns, `readCampaigns` filters entries lacking a string `id`. The op then mutates the *raw* `storeDraft[list]` at that index in editor-client. If the rendered list is ever shorter than the raw list (a stored campaign missing an id, or any future filtered list), delete/move/duplicate hits the wrong record. The campaigns seed now always assigns an `id` (mitigates the add case), but a *pre-existing* id-less campaign in stored settings still triggers the divergence.
Suggested fix (structural, follow-up):
```diff
- read data-mcloud-index (rendered forloop index)
+ address records by a stable key (e.g. record id) and resolve the raw index by
+ matching that key in storeDraft[list], so filtered/rendered offsets can't desync.
```

**[Low] Coding principles — toolbar horizontal clamp uses a hardcoded 160px**
`left = Math.min(window.innerWidth - 160, r.right - 160)`. The 5-button bar is ~168px, so the toolbar can sit a few px off the element edge / near the viewport edge. Cosmetic. Use `toolbar.offsetWidth` after first show.

**[Low] Process — `onOut` hide relies on `relatedTarget`, which is null for some exits**
`onOut` keeps the toolbar if leaving toward the toolbar/another target, else hides. On a mouseout with `relatedTarget === null` (leaving the document, or some synthetic events) the toolbar hides even if the pointer is technically still over a target on re-entry. Low impact (a re-hover re-shows it); noting for completeness.

## Dependency / Security Scan Output
- **`npm audit`**: 4 vulnerabilities in the repo dependency tree (1 critical, 3 moderate). **None introduced by this diff** — no `package.json`/lockfile changed in `25f8bf8..bb98366`. These are pre-existing and out of scope for this review; worth a separate `npm audit` triage pass on `main`.
- **No new dependencies** added by this feature.
- **`semgrep` / `gitleaks` / `trufflehog`**: not installed locally — injection/secret classes reviewed manually (below).
- **Manual security review:**
  - **Secrets:** none introduced. The HMAC preview secret is read from env server-side (unchanged).
  - **AuthZ / trust boundary:** the two preview overrides (`preview` sections, `settings` record draft) are BOTH gated on `editing` = a verified HMAC token (`page.tsx`). An un-tokened `?settings=` is ignored — verified against a running server (baseline 0, tokened override renders, un-tokened override 0). The message handlers validate `e.origin` and whitelist `list ∈ EDITABLE_LISTS` + op types + integer indices, so a hostile framed page cannot inject arbitrary structural ops.
  - **Injection:** the settings override is `JSON.parse` of base64url, accepted only as a plain object, spread over saved settings — no eval, no template/SQL construction from it. Liquid output escaping is unchanged; the `record-anchor` attributes are `editing`-gated and integer/string values from a trusted repo template, not user free-text into an unescaped sink.
  - **DoS surface:** `previewSrc` puts the full sections + storeDraft in a URL. Very large drafts → a long URL, but it's the merchant's own session and own data; not a cross-tenant concern.

## Questions for Author
- **Record reorder UX (Medium above):** was leaving record `move` on the full-reload path a deliberate v1 scope cut, or an oversight? If deliberate, fine to defer; if not, it's a small follow-up.
- **Filtered-list index divergence (Medium above):** is index-based record addressing considered acceptable given only `campaigns` is filtered and its seed now always has an id — or should record ops move to key-based addressing before more filtered lists appear? A design call, not a confirmed bug in the current shipped state.

## Not Reviewed
- Live hover-toolbar interaction (elementFromPoint reachability, reorder feel) — not exercisable headless here; storefront CSP restricts framing to the admin origin (`frame-ancestors 'self' localhost:3000`). The pointer-events invariant and listener wiring were reviewed statically and are correct in the diff. Recommend a manual click-through in the running Editor.
- Pre-existing `npm audit` vulnerabilities (out of scope for this diff; flagged above for separate triage).
- Test files (reviewed for coverage/behavior, not line-by-line critiqued).
