-- Reach (the mobile marketplace) gets its own profile table instead of overwriting users.role.
--
-- Why: Reach stored its role in users.role as 'rch-customer' / 'rch-vendor'. That column is the
-- platform role (requireAdmin reads users.role = 'admin'), so a Reach vendor could not also be a
-- platform admin or a merchant, and two real merchant accounts were left with role 'rch-vendor'.
-- It also broke sign-up: new users get the column default 'customer', but confirm-buyer and
-- reach_confirm_vendor only accepted role 'user', so both failed with role_conflict for everyone new.
--
-- This file is additive and safe to run before the matching web deploy:
--   1. creates reach_users (server-only, like every other table),
--   2. copies the existing rch-* accounts into it,
--   3. replaces reach_confirm_vendor so it records the vendor here and leaves users.role alone.
-- It does NOT touch users.role. See 20261014c_remove_rch_roles_from_users.sql for that, to run
-- AFTER the web app that reads reach_users is deployed.
--
-- The mobile app is unchanged: /api/mobile/me still reports 'rch-customer' / 'rch-vendor', mapped
-- from this table (apps/web/lib/reach-role.ts).

create table if not exists public.reach_users (
  user_id      text primary key references public.users(id) on delete cascade,
  role         text not null check (role in ('buyer', 'vendor')),
  name         text,
  mpesa_number text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Server-only: service role bypasses RLS; the public roles get nothing.
alter table public.reach_users enable row level security;
revoke all on public.reach_users from anon, authenticated;

-- Copy what is in users today (idempotent).
insert into public.reach_users (user_id, role, name, mpesa_number, created_at)
select id,
       case role when 'rch-vendor' then 'vendor' else 'buyer' end,
       name,
       mpesa_number,
       coalesce(created_at, now())
from public.users
where role in ('rch-customer', 'rch-vendor')
on conflict (user_id) do nothing;

-- Vendor sign-up with a store key. Same contract as before (returns 'rch-vendor', raises no_user /
-- bad_key / role_conflict), but the Reach role lives in reach_users, so ANY platform user can
-- become a vendor. role_conflict now only means "already registered as a Reach buyer".
create or replace function public.reach_confirm_vendor(p_user_id text, p_key text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_name     text;
  v_existing text;
  v_key_id   uuid;
  v_vendor_id uuid;
begin
  select name into v_name from users where id = p_user_id for update;
  if not found then raise exception 'no_user'; end if;

  select role into v_existing from reach_users where user_id = p_user_id for update;
  if v_existing = 'vendor' then return 'rch-vendor'; end if;
  if v_existing is not null then raise exception 'role_conflict'; end if;

  select id, vendor_id into v_key_id, v_vendor_id
    from reach_courier_keys where key = p_key and active;
  if v_key_id is null then raise exception 'bad_key'; end if;

  insert into reach_vendor_members (user_id, vendor_id, key_id)
    values (p_user_id, v_vendor_id, v_key_id);
  insert into reach_users (user_id, role, name) values (p_user_id, 'vendor', v_name);
  return 'rch-vendor';
end $function$;
