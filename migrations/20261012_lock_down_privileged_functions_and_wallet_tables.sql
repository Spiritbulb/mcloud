-- NOT YET APPLIED. Review, then run in the Supabase SQL editor (or apply_migration).
--
-- Why: every function in `public` was executable by the public `anon` key, including the
-- SECURITY DEFINER `adjust_org_wallet` (no caller check: anyone could credit/debit any org's
-- wallet). Three tables also had an `*_allow_all_temp` policy (ALL, roles public, using true),
-- letting the anon key read and write them. All callers are server-side with the service-role key.
--
-- Verified before writing: no browser-client code touches org_wallets, wallet_ledger_entries or
-- org_members, and no RLS policy calls a public function (the other policies use auth.uid() only).
-- The pg_cron jobs run as the database owner and are unaffected.

-- 1. Every function in public is server-only.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- New functions are private by default too.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 2. Wallet and org-membership tables: with RLS on and no policy, anon/authenticated get nothing.
--    The service role bypasses RLS, so the app is unaffected.
drop policy if exists org_wallets_allow_all_temp on public.org_wallets;
drop policy if exists wallet_ledger_entries_allow_all_temp on public.wallet_ledger_entries;
drop policy if exists org_members_allow_all_temp on public.org_members;

-- Rollback (restores the open state; do not use except to undo a breakage):
--   create policy org_wallets_allow_all_temp on public.org_wallets for all to public using (true) with check (true);
--   (same for wallet_ledger_entries, org_members)
--   grant execute on all functions in schema public to anon, authenticated;
