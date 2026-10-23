-- users.role = 'client' for anyone who owns an org or a store; 'customer' is everyone else.
--
-- Why: ensureUserRow() inserts every new user with the column default ('customer'), and nothing
-- ever promoted them when they created an org or store, so merchants stayed 'customer'. Org and
-- store creation is duplicated across web, mobile, storefront and @mcloud/merchant, so this is a
-- trigger rather than a change in each of those call sites.
--
-- Only 'customer' is promoted: 'admin' and an existing 'client' are left alone, and nothing is
-- ever demoted.
--
-- No backfill here. The WorkOS-matched owners were backfilled by hand on 2026-10-23; legacy
-- Auth0/Supabase-Auth owners who have not signed in since the move are left as they are.

create or replace function public.promote_owner_to_client() returns trigger
language plpgsql as $$
begin
  update public.users
     set role = 'client', updated_at = now()
   where id = new.owner_id and role = 'customer';
  return new;
end;
$$;

drop trigger if exists orgs_promote_owner on public.orgs;
create trigger orgs_promote_owner after insert on public.orgs
  for each row execute function public.promote_owner_to_client();

drop trigger if exists stores_promote_owner on public.stores;
create trigger stores_promote_owner after insert on public.stores
  for each row execute function public.promote_owner_to_client();
