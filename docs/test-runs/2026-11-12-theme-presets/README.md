# 2026-11-12: theme presets and section layout variants

**What was tested.** The storefront's signed preview route (`/store/<slug>/-preview?token=…&preview=…`)
for store `munch-hub`, with section-layout overrides in the `preview` payload and preset colours applied
to `.storefront-root` as `--sf-*` variables (what the Editor's `mcloud:theme` message does). No store row
was written. Script: a Playwright run against `next dev` on port 3001 (not committed; it reads
`PREVIEW_SECRET` from the env file to sign the token).

| Shot | Sections | Result |
|---|---|---|
| `1-default.png` | stored page, no overrides | unchanged: `sf-hero--full sf-hero--h-standard`, `sf-grid--auto`, `sf-product-card--flat`, anchors 0–4 |
| `2-split-3col-shadow.png` | hero split; featured **hidden**; all-products columns 3, shadow | hidden section consumed index 1 (anchors `0`, `2`); 3-column grid; shadow cards |
| `3-minimal-short-4col-bordered-noir.png` | hero minimal + short; all-products 4 cols, bordered; Noir preset | no `<img>` in hero; 4 columns; bordered cards; gold-on-black |
| `4-full-tall-2col-market.png` | hero full + tall; all-products 2 cols, flat; Market preset | 100vh hero; 2 columns; Fraunces/Nunito |

All four returned 200 with no page errors. CI (`typecheck lint test`, run with `--concurrency=1`) green.

**Caveat.** A full-page screenshot without scrolling shows empty product grids: cards fade in on
`IntersectionObserver`. The script scrolls the page first. This is pre-existing behaviour, not a change.

**Machine note.** Running the full `turbo run typecheck lint test` (18 parallel tasks) alongside a `next dev`
server exhausted a 7 GB machine twice (exit 137). Run CI with `--concurrency=1` or without a dev server.
