-- Append-only record of what platform admins change (plans, store status, roles, subscriptions,
-- recovery emails). Written by apps/web/lib/audit.ts, read by /admin/audit.
--
-- Service-role only, like every other table: RLS is on with no policies and the API roles have no
-- grants, so the browser clients can neither read nor write it. actor_id is plain text (not an FK)
-- so an audit row survives the actor's account being deleted; actor_email is a snapshot for the
-- same reason.
--
-- Append-only is enforced with a trigger rather than convention: any UPDATE or DELETE raises.
-- (A retention purge, if ever wanted, has to drop the trigger deliberately.)

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_id    text not null,
  actor_email text,
  action      text not null,
  target_type text,
  target_id   text,
  summary     text not null,
  before      jsonb,
  after       jsonb,
  ip          text
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx  on public.admin_audit_log (target_type, target_id, created_at desc);
create index if not exists admin_audit_log_actor_idx   on public.admin_audit_log (actor_id, created_at desc);
create index if not exists admin_audit_log_action_idx  on public.admin_audit_log (action, created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

create or replace function public.admin_audit_log_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;

drop trigger if exists admin_audit_log_no_change on public.admin_audit_log;
create trigger admin_audit_log_no_change before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_log_immutable();
