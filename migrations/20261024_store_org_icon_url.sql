-- ============================================================================
-- stores.icon_url, orgs.icon_url — a square mark beside the full logo
--
-- logo_url is the full logo, often a wide wordmark: the storefront header and
-- emails show it at its own shape. Square places (the browser tab and
-- home-screen icon, the dashboard's store/org tiles) need a square image, and a
-- wordmark squeezed or cropped into one is unreadable. icon_url is that square
-- mark. Optional: when null, those places fall back to logo_url, fitted (not
-- cropped) into the square.
--
-- Plain nullable text like logo_url, so no backfill. No grants: the tables are
-- server-only (20261012b_server_only_database_access.sql). Idempotent.
-- ============================================================================

alter table public.stores add column if not exists icon_url text;
alter table public.orgs add column if not exists icon_url text;

comment on column public.stores.icon_url is
  'Square mark for the browser tab, home-screen icon and dashboard tiles. Null: use logo_url, fitted.';
comment on column public.orgs.icon_url is
  'Square mark for dashboard tiles. Null: use logo_url, fitted.';
