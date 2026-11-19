-- ============================================================================
-- store_overview_totals: the Overview's lifetime and 7-day numbers, computed in Postgres
--
-- getStoreOverview used to download every order of the store (total, status, metadata) and every
-- store_analytics event of the last 7 days, then add them up in JavaScript. That grows without
-- bound, and PostgREST's row cap (1000 by default) silently truncates it for a busy store.
-- This returns only the totals:
--
--   order_count, revenue_total   every order, any status (what the Overview has always shown)
--   total_raised, donation_count completed donations (metadata isDonation + payment_status),
--                                the same rule as lib/campaigns.ts and overview-series.ts
--   raised_by_campaign           { campaignId: amount } for those donations
--   events                       { view, add_to_cart, checkout_started, order_placed } since p_since
--
-- Indexes already cover it: idx_orders_store_id, idx_store_analytics_store_created.
-- Callers are the storefront's settings loaders, which authorise the store first, so EXECUTE is
-- pinned to service_role. Idempotent.
-- ============================================================================

create or replace function public.store_overview_totals(
  p_store_id uuid,
  p_since    timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'order_count',   (select count(*) from orders where store_id = p_store_id),
    'revenue_total', (select coalesce(sum(total), 0) from orders where store_id = p_store_id),
    'total_raised',  (select coalesce(sum(total), 0) from orders
                       where store_id = p_store_id
                         and metadata->>'isDonation' = 'true'
                         and metadata->>'payment_status' = 'completed'),
    'donation_count', (select count(*) from orders
                       where store_id = p_store_id
                         and metadata->>'isDonation' = 'true'
                         and metadata->>'payment_status' = 'completed'),
    'raised_by_campaign', (select coalesce(jsonb_object_agg(cid, amount), '{}'::jsonb)
                       from (select metadata->>'campaignId' as cid, sum(coalesce(total, 0)) as amount
                               from orders
                              where store_id = p_store_id
                                and metadata->>'isDonation' = 'true'
                                and metadata->>'payment_status' = 'completed'
                                and jsonb_typeof(metadata->'campaignId') = 'string'
                              group by 1) c),
    'events', (select jsonb_build_object(
                 'view',             count(*) filter (where event = 'view'),
                 'add_to_cart',      count(*) filter (where event = 'add_to_cart'),
                 'checkout_started', count(*) filter (where event = 'checkout_started'),
                 'order_placed',     count(*) filter (where event = 'order_placed'))
               from store_analytics
              where store_id = p_store_id and created_at >= p_since)
  );
$$;

revoke all on function public.store_overview_totals(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.store_overview_totals(uuid, timestamptz) to service_role;
