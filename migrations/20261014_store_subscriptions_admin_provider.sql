-- Allow 'admin' as a subscription provider.
--
-- apps/web/app/api/admin/stores/[id]/plan inserts provider = 'admin' for a manual grant, but the
-- check constraint only allowed 'paystack' and 'wallet', so every admin grant failed on the
-- insert. The route ignored that error and had already flagged the store, leaving it Pro-flagged
-- with no subscription (resolved as Free). The route now checks the insert; this makes it succeed.
--
-- Applied manually (there is no migration runner). Safe to run more than once.
alter table public.store_subscriptions drop constraint if exists store_subscriptions_provider_check;
alter table public.store_subscriptions
  add constraint store_subscriptions_provider_check
  check (provider = any (array['paystack'::text, 'wallet'::text, 'admin'::text]));
