# Editor CRUD — verification run (2026-07-20)

## Static gates (all green)
- Unit tests: apps/web editor+settings = 24/24 pass; packages/liquid record-anchor = 2/2 pass. Total 26.
- `apps/web` `tsc --noEmit`: exit 0, clean.
- `apps/storefront` `tsc --noEmit`: exit 0, clean.

## Browser / server-render checks (storefront on :3001, real Supabase)
Store: locd26 (the OG store). Signed 30-min preview token.

1. PREVIEW NOT BLANK (original bug fixed): preview render (editing token) shows
   4 `data-mcloud-section` anchors + 3 `data-mcloud-record` anchors; body shows the
   real site ("New Arrivals", "Discover our bestsellers"). The blank-preview bug is gone.
2. ENCODE-[] GUARD: `?token=...` with NO preview param renders the saved page
   (4 section anchors), never blank.
3. SETTINGS OVERRIDE (Task 8b) — record CRUD renders live:
   - baseline (no override): injected marker absent (0).
   - WITH valid token + `?settings=<base64url heroSlides override>`: injected hero
     slide title renders (3 occurrences). Unsaved record edits reach the preview.
4. SECURITY (token gate): the SAME `?settings=` override WITHOUT a valid token is
   IGNORED (0 occurrences). A crafted URL cannot alter a live store's content.

## Boundary (not run headless; needs manual confirmation)
- The hover overlay TOOLBAR interaction (elementFromPoint reachability on the
  ↑↓⧉🗑＋ buttons, live drag-free reorder with no reload flash) requires the full
  Editor app on :3000 framing the preview — the storefront CSP is
  `frame-ancestors 'self' http://localhost:3000`, so the preview only frames inside
  the real admin. The toolbar's hero-lesson invariant (bar pointer-events:none,
  buttons pointer-events:auto) and all message contracts were verified STATICALLY
  in Task 6 by diff inspection. Recommend a manual click-through in the running
  Editor to confirm the live toolbar + reorder feel before/at merge.
