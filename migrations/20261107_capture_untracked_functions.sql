-- Functions that exist in the live database but had no definition in migrations/.
--
-- SPI-71: they were applied straight to Supabase (the initial `create_functions`,
-- `reach_courier_keys_and_key_rpcs`, `add_increment_store_views`, `reach_escrow_fix_user_id_text`
-- migrations, and the wallet RPCs), so a rebuilt database would have been missing them. This file
-- is the live definition, copied with pg_get_functiondef on 2026-11-07, so applying it to the live
-- database changes nothing. Idempotent (create or replace).
--
-- Known weakness, kept as it is here so this migration is a faithful capture; fixed in its own
-- migration (20261107d_reach_courier_key_hardening.sql):
--   * reach_issue_courier_key: the key is 4 characters of the vendor id plus 4 random digits
--     (random(), not a CSPRNG), so about 10^4 guesses per vendor.

-- ── Org wallet ─────────────────────────────────────────────────────────────

create or replace function public.adjust_org_wallet(p_org_id uuid, p_amount_cents bigint, p_kind text, p_server_id uuid default null::uuid, p_reference text default null::text, p_metadata jsonb default '{}'::jsonb)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_new_balance bigint;
begin
  insert into org_wallets (org_id) values (p_org_id)
  on conflict (org_id) do nothing;

  update org_wallets
  set balance_cents = balance_cents + p_amount_cents,
      updated_at = now()
  where org_id = p_org_id
  returning balance_cents into v_new_balance;

  if v_new_balance < 0 then
    raise exception 'Insufficient wallet balance for org %: would go to % cents', p_org_id, v_new_balance
      using errcode = 'P0001';
  end if;

  insert into wallet_ledger_entries (org_id, amount_cents, balance_after_cents, kind, server_id, reference, metadata)
  values (p_org_id, p_amount_cents, v_new_balance, p_kind, p_server_id, p_reference, p_metadata);

  return v_new_balance;
end;
$function$;

-- purchase_store_plan and expire_store_subscriptions are NOT here. They were captured from the live
-- database on 2026-11-07, but 20261105_expire_store_subscriptions.sql (applied to live the same day)
-- replaces both: expire_store_subscriptions(uuid) with a pinned search_path, and a purchase_store_plan
-- that expires the store's lapsed rows first. Re-creating the older versions here would undo that,
-- so the definitions live in that file only.

-- ── Storefront ─────────────────────────────────────────────────────────────

create or replace function public.increment_store_views(store_id uuid)
 returns void
 language sql
 security definer
 set search_path to 'public'
as $function$
  update public.stores set views = coalesce(views, 0) + 1 where id = store_id;
$function$;

-- ── Reach ──────────────────────────────────────────────────────────────────

create or replace function public.reach_issue_courier_key(p_vendor_id uuid, p_label text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_key text;
begin
  v_key := upper(substr(replace(p_vendor_id::text, '-', ''), 1, 4)) || '-' || lpad(floor(random() * 10000)::text, 4, '0');
  insert into public.reach_courier_keys(key, vendor_id, label) values (v_key, p_vendor_id, p_label);
  return v_key;
end;
$function$;

create or replace function public.reach_revoke_courier_key(p_key text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  update public.reach_courier_keys set active = false, revoked_at = now() where key = p_key;
end;
$function$;

create or replace function public.reach_verify_courier_key(p_key text)
 returns table(vendor_id uuid, vendor_name text, label text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  return query
  select k.vendor_id, v.name, k.label
  from public.reach_courier_keys k
  join public.reach_vendors v on v.id = k.vendor_id
  where k.key = p_key and k.active = true;
end;
$function$;

create or replace function public.reach_settle_payment(p_payment_id uuid, p_status text, p_receipt text default null::text, p_reason text default null::text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_order uuid;
begin
  update reach_payments
     set status = p_status,
         mpesa_receipt = p_receipt,
         failure_reason = p_reason,
         settled_at = now()
   where id = p_payment_id and status = 'pending'
   returning order_id into v_order;

  if v_order is null then
    return false;
  end if;

  if p_status = 'success' then
    update orders set status = 'paid' where id = v_order;

    update reach_vendor_payouts set status = 'held'
     where order_id = v_order and status = 'pending';

    update products p
       set inventory_quantity = greatest(coalesce(p.inventory_quantity, 0) - oi.quantity, 0)
      from order_items oi
     where oi.order_id = v_order
       and oi.product_id = p.id
       and coalesce(p.track_inventory, true);
  end if;

  return true;
end;
$function$;

-- These are server-only: the privileges the live database has (postgres and service_role).
-- Re-stated so a rebuilt database matches; see 20261012_lock_down_privileged_functions_and_wallet_tables.sql.
revoke all on function public.adjust_org_wallet(uuid, bigint, text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.increment_store_views(uuid) from public, anon, authenticated;
revoke all on function public.reach_issue_courier_key(uuid, text) from public, anon, authenticated;
revoke all on function public.reach_revoke_courier_key(text) from public, anon, authenticated;
revoke all on function public.reach_verify_courier_key(text) from public, anon, authenticated;
revoke all on function public.reach_settle_payment(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.adjust_org_wallet(uuid, bigint, text, uuid, text, jsonb) to service_role;
grant execute on function public.increment_store_views(uuid) to service_role;
grant execute on function public.reach_issue_courier_key(uuid, text) to service_role;
grant execute on function public.reach_revoke_courier_key(text) to service_role;
grant execute on function public.reach_verify_courier_key(text) to service_role;
grant execute on function public.reach_settle_payment(uuid, text, text, text) to service_role;
