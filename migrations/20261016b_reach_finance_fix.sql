-- Follow-up to 20261016_reach_areas_approvals_finance.sql, found by checking the live ledger.
--
-- 1. reach_finance_summary counted a paid order that has no payout rows (seed/test data) as 100% Reach
--    earnings, and ignored payouts still 'pending' on a paid order. Now only paid orders that HAVE
--    payout rows count, and a 'pending' payout on a paid order counts as held (it is paid, just not
--    advanced).
-- 2. RCH-MUNQ325D was paid but its payout stayed 'pending' (settled before reach_settle_payment moved
--    payouts to 'held'), so the vendor could not see it or mark it delivered. Advance it the way
--    settlement does. Scoped to paid orders, so it can never release money for an unpaid one.

update public.reach_vendor_payouts p
   set status = 'held'
  from public.orders o
 where o.id = p.order_id and o.source = 'reach' and o.status = 'paid' and p.status = 'pending';

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
       and exists (select 1 from reach_vendor_payouts x where x.order_id = o.id)
       and (p_since is null or o.created_at >= p_since)
  ),
  shares as (
    select p.vendor_id,
           case when p.status = 'pending' then 'held' else p.status end as status,
           p.amount_kes
      from reach_vendor_payouts p
      join paid_orders po on po.id = p.order_id
     where p.status in ('pending', 'held', 'released', 'paid_out')
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

revoke all on function public.reach_finance_summary(timestamptz) from public, anon, authenticated;
