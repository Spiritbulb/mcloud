# 2026-11-12: store themes (Classic 2, Studio, Soft)

**What was tested.** The signed Editor preview route for a shop (`munch-hub`) and an NGO
(`kfs`) with `settings.themeId` set as an unsaved override, at 1280px and 390px. Nothing was
written to either store. Presets were applied as `--sf-*` variables and `data-sf-theme` was set
on `.storefront-root`, which is what the Editor's `mcloud:theme` and `mcloud:layout` messages do
inside its frame.

| Theme | Preset (shop / NGO) | Result |
|---|---|---|
| `classic-2` | Classic / Classic | 200, every section carries `sf-t-classic-2` (22 shop, 5 NGO), no page errors |
| `studio` | Bold / Bold | 200, all sections themed, no page errors |
| `soft` | Market / Giving | 200, all sections themed, no page errors |

Fixed from these shots: Classic 2 and Soft show two products per row on phones; Studio's nav
icons sit right, a short last grid row leaves no grey filler, and its hero button is white.

CI (`npx turbo run typecheck lint test --concurrency=1`): 18/18 green.
