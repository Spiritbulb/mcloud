-- Expire lapsed store subscriptions (FEATURES.md OB-5, docs/CLEANUP.md 9.1 follow-up 3).
--
-- Why: purchase_store_plan() inserts a row with status = 'active' and a period_end, but nothing
-- ever moved it out of 'active'. resolvePlan() (packages/merchant/src/plans.ts) already ignores
-- rows past period_end, so the app behaved correctly, but the database said otherwise: rows stayed
-- 'active' forever and the legacy stores.is_pro cache stayed true after the plan lapsed.
--
-- What this does:
--   1. expire_store_subscriptions(): marks every active row whose period_end has passed as
--      'expired', then clears stores.is_pro for stores left with no active, unexpired paid row.
--      Rows with no period_end (admin grants) never expire. Covers every provider, which matches
--      what resolvePlan already enforces.
--   2. A pg_cron job runs it hourly.
--   3. purchase_store_plan() calls it for the store being bought, so the purchase always starts
--      from clean state. Its signature, return shape and pricing behaviour are unchanged.
--
-- Before applying, confirm 'expired' is an allowed status (no row = no constraint, fine):
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.store_subscriptions'::regclass and contype = 'c'
--     and pg_get_constraintdef(oid) ilike '%status%';
--
-- Applied manually (there is no migration runner). Safe to run more than once.

-- 1. Expiry function -------------------------------------------------------------------------
-- An older, unscheduled no-argument version existed in production and made calls ambiguous.
-- It counted Hobby as Pro, cleared admin grants (null period_end), and was SECURITY DEFINER
-- with no search_path. Nothing called it, so it is replaced by the version below.
drop function if exists public.expire_store_subscriptions();

create or replace function public.expire_store_subscriptions(p_store_id uuid default null)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_expired integer;
begin
  with expired as (
    update public.store_subscriptions ss
    set status = 'expired'
    where ss.status = 'active'
      and ss.period_end is not null
      and ss.period_end <= now()
      and (p_store_id is null or ss.store_id = p_store_id)
    returning ss.store_id
  ),
  touched as (
    select distinct store_id from expired
  ),
  cleared as (
    -- Keep the legacy cache honest: a store with no remaining paid plan is not Pro.
    update public.stores s
    set is_pro = false
    from touched t
    where s.id = t.store_id
      and s.is_pro
      and not exists (
        select 1
        from public.store_subscriptions a
        where a.store_id = s.id
          and a.status = 'active'
          and a.plan = 'pro'
          and (a.period_end is null or a.period_end > now())
      )
    returning s.id
  )
  select count(*) into v_expired from expired;

  return v_expired;
end;
$$;

revoke all on function public.expire_store_subscriptions(uuid) from public, anon, authenticated;
grant execute on function public.expire_store_subscriptions(uuid) to service_role;

-- 2. Hourly job (cron.schedule with an existing name replaces that job) -----------------------
select cron.schedule(
  'expire-store-subscriptions',
  '7 * * * *',
  $cron$select public.expire_store_subscriptions()$cron$
);

-- 3. purchase_store_plan: expire this store's lapsed rows first -------------------------------
-- Identical to the live definition except for the marked line.
create or replace function public.purchase_store_plan(p_org_id uuid, p_store_id uuid, p_plan text, p_amount_cents bigint)
 returns table(new_balance_cents bigint, period_start timestamp with time zone, period_end timestamp with time zone)
 language plpgsql
as $function$
declare
  v_balance bigint;
  v_current_end timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_ledger_id uuid;
begin
  if p_plan not in ('hobby', 'pro') then
    raise exception 'invalid plan: %', p_plan;
  end if;

  select balance_cents into v_balance
  from org_wallets
  where org_id = p_org_id
  for update;

  if v_balance is null then
    raise exception 'no wallet found for org %', p_org_id;
  end if;

  if v_balance < p_amount_cents then
    raise exception 'insufficient balance: have %, need %', v_balance, p_amount_cents;
  end if;

  perform public.expire_store_subscriptions(p_store_id);  -- NEW: lapsed rows leave 'active'

  select ss.period_end into v_current_end
  from store_subscriptions ss
  where ss.store_id = p_store_id and ss.status = 'active'
  order by ss.created_at desc
  limit 1;

  v_period_start := now();
  if v_current_end is not null and v_current_end > now() then
    v_period_end := v_current_end + interval '1 month';
  else
    v_period_end := now() + interval '1 month';
  end if;

  update org_wallets
  set balance_cents = balance_cents - p_amount_cents,
      updated_at = now()
  where org_id = p_org_id;

  insert into wallet_ledger_entries
    (id, org_id, amount_cents, balance_after_cents, kind, store_id, reference, metadata, created_at)
  values
    (gen_random_uuid(), p_org_id, -p_amount_cents, v_balance - p_amount_cents, 'store_subscription', p_store_id,
     null, jsonb_build_object('plan', p_plan), now())
  returning id into v_ledger_id;

  insert into store_subscriptions
    (id, store_id, amount, currency, status, period_start, period_end, created_at, provider, plan)
  values
    (gen_random_uuid(), p_store_id, round(p_amount_cents / 100.0, 2), 'KES', 'active', v_period_start, v_period_end, now(), 'wallet', p_plan);

  update stores
  set is_pro = (p_plan = 'pro'),
      pro_since = case when p_plan = 'pro' then v_period_start else pro_since end,
      pro_expires_at = v_period_end
  where id = p_store_id;

  return query select v_balance - p_amount_cents, v_period_start, v_period_end;
end;
$function$;

-- create or replace keeps existing grants; restate them in case the function was ever recreated.
revoke all on function public.purchase_store_plan(uuid, uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.purchase_store_plan(uuid, uuid, text, bigint) to service_role;

-- 4. Verify ---------------------------------------------------------------------------------
--   select jobname, schedule, command from cron.job where jobname = 'expire-store-subscriptions';
--   select public.expire_store_subscriptions();   -- returns how many rows it expired
--   select count(*) from store_subscriptions where status = 'active' and period_end <= now();  -- 0