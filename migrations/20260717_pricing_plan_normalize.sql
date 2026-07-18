-- ============================================================================
-- Pricing plan normalization
--
-- Tier is now derived from store_subscriptions.plan on the active row. Every
-- row ever written used plan='pro', but guard against any null/blank/unknown
-- plan on an active row by backfilling to 'pro' (historically is_pro=true has
-- meant Pro). No schema change; idempotent.
-- ============================================================================

update public.store_subscriptions
set plan = 'pro'
where status = 'active'
  and (plan is null or plan not in ('hobby', 'pro'));
