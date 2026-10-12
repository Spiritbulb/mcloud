-- NOT YET APPLIED. Run AFTER 20261012_lock_down_privileged_functions_and_wallet_tables.sql
-- AND after the matching app code is deployed to production.
--
-- Model: all database access is server-side with the service-role key. The browser holds the
-- public anon key but must be able to do nothing with tables. Before this change the anon key
-- could read and write: users (incl. the `role` column that makes someone a platform admin),
-- stores, orders, org_members, store_subscriptions, org_wallets, ... (policies named
-- *_allow_all_temp: ALL, roles public, using true), plus four tables with RLS switched off
-- (contact_submissions, delivery_options, delivery_zones, oauth_states).
--
-- Verified in the repo before writing: no browser code reads or writes a table any more. The
-- only browser Supabase clients make Auth calls (shopper sign-in, legacy password forms), and
-- the mobile apps never import Supabase. Auth endpoints are not affected by table grants.
--
-- DEPLOY ORDER MATTERS: the code that moved the admin pages and the products / services /
-- orders / blog / appearance screens onto server actions must be live first, or the old browser
-- code will start failing the moment this runs.

-- 1. The public roles get no table or sequence access at all.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- 2. Defence in depth: RLS on everywhere (service_role bypasses it), and remove the open policies.
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;

  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname like '%allow_all_temp'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3. Verify (should return no rows):
--   select grantee, table_name, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and grantee in ('anon', 'authenticated');

-- Rollback (reopens the database; only to undo an outage):
--   grant all on all tables in schema public to anon, authenticated;
--   grant all on all sequences in schema public to anon, authenticated;
