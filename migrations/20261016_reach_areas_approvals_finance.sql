-- Reach: locations, listing approval, and the money ledger the admin pays out from.
--
-- 1. reach_areas: a curated two-level list (town > area) the Reach admin maintains. A vendor has one
--    home area (reach_vendors.area_id) and may deliver to more (reach_vendor_areas). A buyer picks an
--    area and sees the vendors that serve it. Coverage is hierarchical: serving a town covers its areas.
-- 2. Approval: reach_vendors.approval_status ('draft' -> 'pending' -> 'approved' | 'rejected', or
--    'suspended' by the admin). Owners ask to be listed from the store dashboard; the Reach admin
--    decides in the app. Only approved + listed + active vendors are sold to buyers. Vendors that were
--    already listed are grandfathered as approved.
-- 3. Payout details: reach_vendors.payout_phone (the M-Pesa number the admin pays) and, on each
--    payout, who paid it and the M-Pesa reference. reach_mark_vendor_paid settles everything a vendor
--    is owed in one atomic step; reach_finance_summary is the admin's earnings / owed / paid view.
--
-- Additive: safe to run before the matching deploy (old code ignores every new column).

create table if not exists public.reach_areas (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.reach_areas(id) on delete restrict,
  name       text not null check (length(btrim(name)) between 2 and 60),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  lat        double precision check (lat between -90 and 90),
  lng        double precision check (lng between -180 and 180),
  active     boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists reach_areas_parent_idx on public.reach_areas (parent_id);
alter table public.reach_areas enable row level security;
revoke all on public.reach_areas from anon, authenticated;

-- Starting towns (approximate centres, used only to suggest the nearest one from GPS).
insert into public.reach_areas (name, slug, lat, lng, sort) values
  ('Nairobi', 'nairobi', -1.2921, 36.8219, 1),
  ('Mombasa', 'mombasa', -4.0435, 39.6682, 2),
  ('Nakuru',  'nakuru',  -0.3031, 36.0800, 3),
  ('Kisumu',  'kisumu',  -0.0917, 34.7680, 4),
  ('Eldoret', 'eldoret',  0.5143, 35.2698, 5)
on conflict (slug) do nothing;

alter table public.reach_vendors
  add column if not exists area_id         uuid references public.reach_areas(id) on delete set null,
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  add column if not exists requested_at    timestamptz,
  add column if not exists reviewed_at     timestamptz,
  add column if not exists reviewed_by     text references public.users(id) on delete set null,
  add column if not exists review_note     text,
  add column if not exists payout_phone    text;

-- Vendors already on the marketplace keep selling.
update public.reach_vendors
   set approval_status = 'approved', reviewed_at = coalesce(reviewed_at, now())
 where listed and approval_status = 'draft';

create table if not exists public.reach_vendor_areas (
  vendor_id uuid not null references public.reach_vendors(id) on delete cascade,
  area_id   uuid not null references public.reach_areas(id)   on delete cascade,
  primary key (vendor_id, area_id)
);
create index if not exists reach_vendor_areas_area_idx on public.reach_vendor_areas (area_id);
alter table public.reach_vendor_areas enable row level security;
revoke all on public.reach_vendor_areas from anon, authenticated;

alter table public.reach_vendor_payouts
  add column if not exists payout_ref text,
  add column if not exists paid_out_by text references public.users(id) on delete set null;

-- Pay a vendor everything released to them (delivered orders) in one step. Returns the KES paid.
-- Only 'released' rows move, so a double click or a retry pays nothing twice.
create or replace function public.reach_mark_vendor_paid(p_vendor_id uuid, p_ref text, p_admin text)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_total integer;
begin
  if p_ref is null or length(btrim(p_ref)) < 3 then raise exception 'ref_required'; end if;

  with moved as (
    update reach_vendor_payouts
       set status = 'paid_out', paid_out_at = now(), payout_ref = btrim(p_ref), paid_out_by = p_admin
     where vendor_id = p_vendor_id and status = 'released'
    returning amount_kes
  )
  select coalesce(sum(amount_kes), 0)::integer into v_total from moved;

  if v_total = 0 then raise exception 'nothing_owed'; end if;
  return v_total;
end $function$;

-- Money overview for the Reach admin.
--   gross        what buyers paid (paid Reach orders)
--   vendor_share what those orders owe vendors (their own prices)
--   reach_earned gross - vendor_share: the markup and service fees Reach keeps
--   held         vendor share of paid orders not yet delivered
--   owed         delivered, not yet paid out: what the admin must send now
--   paid_out     already sent
-- p_since limits to orders paid since that time (null = all time).
create or replace function public.reach_finance_summary(p_since timestamptz default null)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with paid_orders as (
    select o.id, o.total
      from orders o
     where o.source = 'reach' and o.status = 'paid'
       and (p_since is null or o.created_at >= p_since)
  ),
  shares as (
    select p.vendor_id, p.status, p.amount_kes
      from reach_vendor_payouts p
      join paid_orders po on po.id = p.order_id
     where p.status in ('held', 'released', 'paid_out')
  ),
  per_vendor as (
    select v.id, v.name, v.payout_phone,
           coalesce(sum(s.amount_kes) filter (where s.status = 'held'), 0)     as held,
           coalesce(sum(s.amount_kes) filter (where s.status = 'released'), 0) as owed,
           coalesce(sum(s.amount_kes) filter (where s.status = 'paid_out'), 0) as paid_out
      from reach_vendors v
      left join shares s on s.vendor_id = v.id
     group by v.id, v.name, v.payout_phone
  )
  select jsonb_build_object(
    'orders',       (select count(*) from paid_orders),
    'gross',        (select coalesce(sum(total), 0) from paid_orders),
    'vendor_share', (select coalesce(sum(amount_kes), 0) from shares),
    'reach_earned', (select coalesce(sum(total), 0) from paid_orders) - (select coalesce(sum(amount_kes), 0) from shares),
    'held',         (select coalesce(sum(held), 0) from per_vendor),
    'owed',         (select coalesce(sum(owed), 0) from per_vendor),
    'paid_out',     (select coalesce(sum(paid_out), 0) from per_vendor),
    'vendors',      coalesce((
      select jsonb_agg(jsonb_build_object(
               'vendor_id', id, 'name', name, 'payout_phone', payout_phone,
               'held', held, 'owed', owed, 'paid_out', paid_out)
             order by owed desc, name)
        from per_vendor where held + owed + paid_out > 0), '[]'::jsonb)
  );
$function$;

revoke all on function public.reach_mark_vendor_paid(uuid, text, text) from public, anon, authenticated;
revoke all on function public.reach_finance_summary(timestamptz)       from public, anon, authenticated;
