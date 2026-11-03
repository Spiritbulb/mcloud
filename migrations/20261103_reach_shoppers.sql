-- Reach shoppers sign in with Supabase Auth; store owners join Reach without a key.
--
-- Until now every Reach buyer was a WorkOS user with a reach_users row. Shoppers now use the same
-- Supabase customer account as the web storefronts, and shoppers are not in `users`, so they get
-- their own table. A shopper whose verified email matches an old WorkOS buyer is linked to it
-- (legacy_user_id) by the app server on first sign-in, so their history carries over.
--
-- Store owners can now create or list a store from the Reach app and become its vendor directly.
-- That membership has no key: key_id is null, and apps/web/lib/reach/vendor.ts checks store access
-- instead of the key for those rows. Revoking a key still only ends the access of people who
-- joined with it.
--
-- Additive and safe to run before the matching web deploy. Old app builds keep working:
-- reach_payments.user_id is still filled for WorkOS buyers.

create table if not exists public.reach_shoppers (
  id             uuid primary key default gen_random_uuid(),
  auth_user_id   uuid not null unique,  -- Supabase Auth user id
  email          text not null,         -- from the verified token only
  name           text,
  mpesa_number   text,
  -- The WorkOS buyer this shopper was linked from. set null: deleting the old user must not
  -- delete the shopper.
  legacy_user_id text unique references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Server-only: service role bypasses RLS; the public roles get nothing.
alter table public.reach_shoppers enable row level security;
revoke all on public.reach_shoppers from anon, authenticated;

alter table public.reach_payments
  add column if not exists shopper_id uuid references public.reach_shoppers(id) on delete set null;
alter table public.reach_payments alter column user_id drop not null;

-- Shopper order history reads the Reach store's orders by customer.
create index if not exists orders_store_customer_idx on public.orders (store_id, customer_id);

-- Owner-members have no key.
alter table public.reach_vendor_members alter column key_id drop not null;

-- Join a store owner as its vendor without a key. The caller (the web app) has already checked
-- that p_user_id can manage the store behind p_vendor_id. Same contract as reach_confirm_vendor:
-- returns 'rch-vendor', raises no_user / role_conflict.
create or replace function public.reach_join_as_owner(p_user_id text, p_vendor_id uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_name     text;
  v_existing text;
begin
  select name into v_name from users where id = p_user_id for update;
  if not found then raise exception 'no_user'; end if;

  select role into v_existing from reach_users where user_id = p_user_id for update;
  if v_existing is not null and v_existing <> 'vendor' then raise exception 'role_conflict'; end if;

  -- One vendor per user (reach_vendor_members is keyed on user_id): joining replaces any old link.
  insert into reach_vendor_members (user_id, vendor_id, key_id)
    values (p_user_id, p_vendor_id, null)
  on conflict (user_id) do update
    set vendor_id = excluded.vendor_id, key_id = null;

  if v_existing is null then
    insert into reach_users (user_id, role, name) values (p_user_id, 'vendor', v_name);
  end if;
  return 'rch-vendor';
end $function$;

revoke all on function public.reach_join_as_owner(text, uuid) from public, anon, authenticated;
