-- Backfill a home `pages` row for every store that lacks one.
--
-- Why: the storefront renders a page-less store from `defaultHomeSections(type)`
-- (a repo default), but the Editor reads the `pages` row directly. With no row it
-- loads `sections = []` and encodes THAT empty array into the preview URL, which
-- the storefront honours as an authoritative override -> renderPage([]) -> a blank
-- preview. As of 2026-07-18, 20 of 22 active stores had no home page row, so the
-- Editor preview was blank for ~91% of live stores (the live site was unaffected).
--
-- Fix: give every store a real, persisted home page so the Editor and the
-- storefront read the SAME sections. The section lists below are copied verbatim
-- from packages/verticals/src/index.ts (VERTICALS.<id>.defaultPages[slug='']),
-- so no store's rendered home changes -- this only PERSISTS what was already
-- being rendered by default.
--
-- Idempotent: ON CONFLICT (store_id, slug) DO NOTHING, so re-running inserts
-- nothing and it is safe to apply more than once. Only touches the home slug ('').
--
-- Unknown/null store type maps to the shop layout, matching getVertical()'s own
-- fallback (getVertical(null) -> shop).

insert into public.pages (store_id, slug, title, position, is_published, sections)
select
  s.id,
  ''            as slug,
  'Home'        as title,
  0             as position,
  true          as is_published,
  case s.type
    when 'ngo' then
      '[{"type":"hero"},{"type":"programs"},{"type":"impact"},{"type":"campaigns"},{"type":"contact"}]'::jsonb
    else
      -- shop, and any unknown/null type (getVertical falls back to shop)
      '[{"type":"hero"},{"type":"collections"},{"type":"featured"},{"type":"all-products"}]'::jsonb
  end as sections
from public.stores s
on conflict (store_id, slug) do nothing;
