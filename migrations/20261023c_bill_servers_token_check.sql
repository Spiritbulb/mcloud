-- bill-servers authenticates its caller against the Vault secret
-- `bill_servers_cron_token` (the same one the pg_cron job sends), so Vault is
-- the only copy and the edge function needs no CRON_SECRET of its own.
-- Returns only true/false; the secret never leaves Postgres. Fails closed when
-- the secret is missing or the input is empty.

create or replace function public.check_bill_servers_token(token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected text;
begin
  if token is null or token = '' then
    return false;
  end if;

  select decrypted_secret into expected
  from vault.decrypted_secrets
  where name = 'bill_servers_cron_token'
  limit 1;

  if expected is null or expected = '' then
    return false;
  end if;

  return token = expected;
end;
$$;

revoke all on function public.check_bill_servers_token(text) from public, anon, authenticated;
grant execute on function public.check_bill_servers_token(text) to service_role;

-- The UpCloud key bill-servers uses to stop servers also comes from Vault
-- (`UPCLOUD_API_KEY`), so the function holds no edge secrets of its own.
-- Returns null when missing; callable by service_role only.

create or replace function public.get_upcloud_api_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'UPCLOUD_API_KEY'
  limit 1;
$$;

revoke all on function public.get_upcloud_api_key() from public, anon, authenticated;
grant execute on function public.get_upcloud_api_key() to service_role;
