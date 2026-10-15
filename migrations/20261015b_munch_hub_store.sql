-- One-off data move: give the legacy Reach vendor "Munch Hub" a real store.
--
-- Creates the store (what createStoreForUser does: store, owner membership, default Home page),
-- moves Munch Hub's 11 products out of the Reach marketplace store into it, and points the vendor
-- at the store. A store-backed vendor sells its own store's products, so without the move Munch Hub
-- would disappear from the marketplace. Its reach_product_vendors rows become redundant and go.
--
-- Owner is the Reach store's owner so it can be handed over from the dashboard (Members).
-- Run 20261016_reach_areas_approvals_finance.sql FIRST: Munch Hub must be placed in a delivery area, or
-- the marketplace will not show it (a store-backed vendor with no area is never sellable). Set
-- v_area_slug below to the slug of the town or area it delivers from (e.g. 'nakuru').
-- Runs in one transaction and aborts unless exactly 11 products move. Not idempotent by design.

do $$
declare
  v_store uuid;
  v_vendor constant uuid := 'e8743fac-26fd-4a78-84ad-91caa675e6eb';
  v_owner constant text := 'auth0|69b0fc02f5f8370eea772e82';
  v_moved int;
  v_area_slug constant text := 'CHANGE-ME';
  v_area uuid;
begin
  select id into v_area from reach_areas where slug = v_area_slug and active;
  if v_area is null then raise exception 'set v_area_slug to a real reach_areas.slug (was %)', v_area_slug; end if;
  if exists (select 1 from stores where slug = 'munch-hub') then raise exception 'slug taken'; end if;
  if exists (select 1 from reach_vendors where id = v_vendor and store_id is not null) then raise exception 'already linked'; end if;

  insert into stores (name, slug, org_id, owner_id, type)
  values ('Munch Hub', 'munch-hub', 'd43798e7-1c87-4bdf-8ae9-8636ea3efb0f', v_owner, 'shop')
  returning id into v_store;

  insert into store_members (store_id, user_id, role) values (v_store, v_owner, 'owner');
  insert into pages (store_id, slug, title, position, is_published, sections)
  values (v_store, '', 'Home', 0, true,
          '[{"type":"hero"},{"type":"collections"},{"type":"featured"},{"type":"services"},{"type":"all-products"}]'::jsonb);

  update products set store_id = v_store, updated_at = now()
   where id in (select product_id from reach_product_vendors where vendor_id = v_vendor)
     and store_id = '6bff1366-d8ea-4a0a-a90d-55026bfcb464';
  get diagnostics v_moved = row_count;
  if v_moved <> 11 then raise exception 'expected to move 11 products, moved %', v_moved; end if;

  update reach_vendors
     set store_id = v_store, area_id = v_area, listed = true, listed_at = coalesce(listed_at, now()),
         approval_status = 'approved'
   where id = v_vendor;
  delete from reach_product_vendors where vendor_id = v_vendor;
end $$;
