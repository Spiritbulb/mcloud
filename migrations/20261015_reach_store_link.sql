-- Reach vendors are now backed by a real mcloud store.
--
-- Until now Reach had one hardcoded marketplace store and vendors were hand-made rows linked to its
-- products through reach_product_vendors. A merchant could not join, leave, or hand out access.
-- Now a store owner turns on "List on Reach" in the store dashboard, which creates (or reuses) the
-- reach_vendors row for that store and sets `listed`. The marketplace shows the products of every
-- listed store, and the owner issues store keys from the dashboard; a key is how a person gets into
-- the Reach mobile app as that vendor.
--
-- Additive and safe to run before the matching deploy:
--   1. reach_vendors gets store_id (unique, nullable) and listed. Existing vendors (store_id null)
--      are the legacy hand-linked ones: they stay listed and keep working through
--      reach_product_vendors exactly as before.
--   2. reach_confirm_vendor now (a) refuses keys of inactive vendors, (b) lets an existing vendor
--      join again with a new key. Before, a vendor whose key was revoked and who entered a fresh one
--      got 'rch-vendor' back without any membership row, so every vendor call 403'd.
--   3. reach_update_vendor_product also accepts products that belong to the vendor's store.
--
-- Revoking a key now ends the access of everyone who joined with it: the app checks that the
-- member's key is still active (apps/web/lib/reach/vendor.ts), so no cleanup job is needed.

alter table public.reach_vendors
  -- set null, not cascade: deleting a store must not erase a vendor that still has payout history.
  -- The vendor simply stops having a storefront (and so nothing to list).
  add column if not exists store_id  uuid references public.stores(id) on delete set null,
  add column if not exists listed    boolean not null default false,
  add column if not exists listed_at timestamptz;

-- One vendor per store.
create unique index if not exists reach_vendors_store_id_key
  on public.reach_vendors (store_id) where store_id is not null;

-- Legacy vendors (no store) were always visible in the marketplace.
update public.reach_vendors
   set listed = true, listed_at = coalesce(listed_at, created_at)
 where store_id is null and not listed;

-- Who minted a key, shown on the dashboard.
alter table public.reach_courier_keys
  add column if not exists created_by text references public.users(id) on delete set null;

create index if not exists reach_courier_keys_vendor_idx
  on public.reach_courier_keys (vendor_id, active);

create or replace function public.reach_confirm_vendor(p_user_id text, p_key text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_name      text;
  v_existing  text;
  v_key_id    uuid;
  v_vendor_id uuid;
begin
  select name into v_name from users where id = p_user_id for update;
  if not found then raise exception 'no_user'; end if;

  select role into v_existing from reach_users where user_id = p_user_id for update;
  if v_existing is not null and v_existing <> 'vendor' then raise exception 'role_conflict'; end if;

  -- The key must be live and its vendor active, even for someone who is already a vendor.
  select k.id, k.vendor_id into v_key_id, v_vendor_id
    from reach_courier_keys k
    join reach_vendors v on v.id = k.vendor_id
   where k.key = p_key and k.active and v.active;
  if v_key_id is null then raise exception 'bad_key'; end if;

  -- One vendor per user (reach_vendor_members is keyed on user_id): joining replaces any old link.
  insert into reach_vendor_members (user_id, vendor_id, key_id)
    values (p_user_id, v_vendor_id, v_key_id)
  on conflict (user_id) do update
    set vendor_id = excluded.vendor_id, key_id = excluded.key_id;

  if v_existing is null then
    insert into reach_users (user_id, role, name) values (p_user_id, 'vendor', v_name);
  end if;
  return 'rch-vendor';
end $function$;

create or replace function public.reach_update_vendor_product(
  p_vendor_id uuid, p_product_id uuid,
  p_price numeric default null, p_description text default null,
  p_inventory_quantity integer default null, p_track_inventory boolean default null,
  p_images jsonb default null)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not exists (
       select 1 from reach_product_vendors
        where vendor_id = p_vendor_id and product_id = p_product_id
     )
     and not exists (
       select 1 from products p
         join reach_vendors v on v.store_id = p.store_id
        where v.id = p_vendor_id and p.id = p_product_id
     ) then
    raise exception 'Product % is not linked to vendor %', p_product_id, p_vendor_id;
  end if;

  update products
  set
    price = coalesce(p_price, price),
    description = coalesce(p_description, description),
    inventory_quantity = coalesce(p_inventory_quantity, inventory_quantity),
    track_inventory = coalesce(p_track_inventory, track_inventory),
    images = coalesce(p_images, images),
    updated_at = now()
  where id = p_product_id;
end;
$function$;

-- Functions are server-only, like every other Reach object (see 20261012_lock_down_*).
revoke all on function public.reach_confirm_vendor(text, text) from public, anon, authenticated;
revoke all on function public.reach_update_vendor_product(uuid, uuid, numeric, text, integer, boolean, jsonb)
  from public, anon, authenticated;
