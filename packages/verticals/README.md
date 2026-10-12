# @mcloud/verticals

What kind of site a store is. `VERTICALS.shop` and `VERTICALS.ngo` define the default pages
and sections for a new store, whether it has a catalog (`commerce`), and its settings
navigation (`sectionsFor(vertical)` in `nav.ts`).

`getVertical(type)` falls back to `shop` for unknown or missing types. To add a vertical:
define it in `src/index.ts`, give it default sections, add nav in `nav.ts`, and update the
tests.

Tests: `npm test -w @mcloud/verticals`.
