-- ============================================================================
-- get_store_analytics — restore the shape the apps read (SPI-65)
--
-- On 2026-09-27 a migration applied straight to the database
-- (`create_get_store_analytics_rpc`, not in this folder) replaced this function
-- with a flat payload: views / revenue / order_placed at the top level, a funnel
-- with different keys, no totals / previous / series / by_device. The store
-- Analytics page reads `totals` and crashed; the mobile Today and Analytics
-- screens read `totals` / `previous` and quietly showed zeros.
--
-- This re-applies the function from 20260717_store_analytics_funnel_orders.sql
-- unchanged (that file is the source of truth for the shape; see
-- apps/storefront/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/analytics/analytics-client.tsx
-- and apps/mobile/src/lib/api.ts), and pins EXECUTE to service_role: callers are
-- the storefront and web route handlers, which check store access first.
-- Idempotent.
-- ============================================================================

create or replace function public.get_store_analytics(
  p_store_id uuid,
  p_start    timestamptz,
  p_end      timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_len      interval := p_end - p_start;
  v_prev_start timestamptz := p_start - (p_end - p_start);
  v_result   jsonb;
begin
  with
  ev as (
    select event, device_type, referrer, country_code,
           utm_source, session_id, created_at
    from store_analytics
    where store_id = p_store_id
      and created_at >= p_start
      and created_at <  p_end
  ),
  ord as (
    select total, created_at
    from orders
    where store_id = p_store_id
      and created_at >= p_start
      and created_at <  p_end
      and status not in ('cancelled', 'refunded')
  ),
  prev_ev as (
    select event from store_analytics
    where store_id = p_store_id
      and created_at >= v_prev_start
      and created_at <  p_start
  ),
  prev_ord as (
    select total from orders
    where store_id = p_store_id
      and created_at >= v_prev_start
      and created_at <  p_start
      and status not in ('cancelled', 'refunded')
  ),
  days as (
    select generate_series(
      date_trunc('day', p_start),
      date_trunc('day', p_end - interval '1 second'),
      interval '1 day'
    ) as day
  ),
  views_by_day as (
    select date_trunc('day', created_at) as day, count(*) as views
    from ev where event = 'view'
    group by 1
  ),
  orders_by_day as (
    select date_trunc('day', created_at) as day,
           count(*) as orders, coalesce(sum(total), 0) as revenue
    from ord group by 1
  ),
  -- ── Funnel ───────────────────────────────────────────────────────────────
  -- views / add_to_carts / checkouts come from events; orders comes from the
  -- orders table (authoritative), so the funnel can no longer show a step
  -- larger than reality or an order count of 0 while revenue exists.
  funnel as (
    select
      (select count(*) filter (where event = 'view')             from ev) as views,
      (select count(*) filter (where event = 'add_to_cart')      from ev) as add_to_carts,
      (select count(*) filter (where event = 'checkout_started') from ev) as checkouts,
      (select count(*) from ord)                                          as orders
  ),
  by_device as (
    select coalesce(device_type, 'unknown') as key, count(*) as value
    from ev where event = 'view'
    group by 1 order by 2 desc
  ),
  by_source as (
    select
      coalesce(
        nullif(utm_source, ''),
        nullif(split_part(split_part(referrer, '://', 2), '/', 1), ''),
        'direct'
      ) as key,
      count(*) as value
    from ev where event = 'view'
    group by 1 order by 2 desc limit 10
  ),
  by_country as (
    select coalesce(nullif(country_code, ''), 'unknown') as key, count(*) as value
    from ev where event = 'view'
    group by 1 order by 2 desc limit 10
  ),
  top_products as (
    select p.id, p.name, p.images,
           sum(oi.total)    as revenue,
           sum(oi.quantity) as units_sold
    from order_items oi
    join orders o   on o.id = oi.order_id
    join products p on p.id = oi.product_id
    where o.store_id = p_store_id
      and o.created_at >= p_start
      and o.created_at <  p_end
      and o.status not in ('cancelled', 'refunded')
    group by p.id, p.name, p.images
    order by revenue desc
    limit 5
  )
  select jsonb_build_object(
    'range', jsonb_build_object('start', p_start, 'end', p_end),
    'totals', jsonb_build_object(
      'views',     (select count(*) from ev where event = 'view'),
      'orders',    (select count(*) from ord),
      'revenue',   (select coalesce(sum(total), 0) from ord),
      'add_to_carts', (select count(*) from ev where event = 'add_to_cart'),
      'unique_visitors', (select count(distinct session_id) from ev where session_id is not null)
    ),
    'previous', jsonb_build_object(
      'views',   (select count(*) from prev_ev where event = 'view'),
      'orders',  (select count(*) from prev_ord),
      'revenue', (select coalesce(sum(total), 0) from prev_ord)
    ),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date',    to_char(d.day, 'YYYY-MM-DD'),
        'views',   coalesce(v.views, 0),
        'orders',  coalesce(o.orders, 0),
        'revenue', coalesce(o.revenue, 0)
      ) order by d.day), '[]'::jsonb)
      from days d
      left join views_by_day  v on v.day = d.day
      left join orders_by_day o on o.day = d.day
    ),
    'funnel', (select to_jsonb(f) from funnel f),
    'by_device',  (select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) from by_device d),
    'by_source',  (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from by_source s),
    'by_country', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from by_country c),
    'top_products', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name,
        'image_url', case when jsonb_typeof(images) = 'array'
                          then coalesce(images->0->>'url', images->>0) end,
        'revenue', revenue, 'units_sold', units_sold
      )), '[]'::jsonb) from top_products
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_store_analytics(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_store_analytics(uuid, timestamptz, timestamptz) to service_role;
