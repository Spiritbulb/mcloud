-- WhatsApp merchant bot (v1, user-initiated). See docs/superpowers/specs/2026-11-09-whatsapp-merchant-bot-design.md
--
-- Five tables, all server-only: RLS is enabled with NO policies, so only the service role can touch them.
-- The user foreign keys CASCADE on purpose: every other foreign key to users is NO ACTION and once
-- blocked account deletion (see 20261107c_delete_user_account.sql). A link must never do that.

create table if not exists public.whatsapp_links (
  id         uuid primary key default gen_random_uuid(),
  wa_id      text not null,
  user_id    text not null references public.users(id) on delete cascade,
  linked_at  timestamptz not null default now(),
  revoked_at timestamptz
);
-- At most one ACTIVE link per number and per user. Revoked rows stay as history.
create unique index if not exists whatsapp_links_active_wa_id on public.whatsapp_links (wa_id) where revoked_at is null;
create unique index if not exists whatsapp_links_active_user  on public.whatsapp_links (user_id) where revoked_at is null;

create table if not exists public.whatsapp_link_codes (
  id         uuid primary key default gen_random_uuid(),
  code_hash  text not null unique,
  user_id    text not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_link_codes_user on public.whatsapp_link_codes (user_id);

-- One row per failed LINK attempt, so guessing codes is limited per number across serverless instances.
create table if not exists public.whatsapp_link_attempts (
  id         bigint generated always as identity primary key,
  wa_id      text not null,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_link_attempts_wa_id_at on public.whatsapp_link_attempts (wa_id, created_at desc);

-- Conversation state per number. The bot treats rows idle for 30 minutes as expired.
create table if not exists public.whatsapp_sessions (
  wa_id      text primary key,
  state      jsonb not null default '{"step":"idle"}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Meta retries webhooks; the message id makes processing idempotent (insert, skip on conflict).
create table if not exists public.whatsapp_messages (
  id         text primary key,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_created_at on public.whatsapp_messages (created_at);

alter table public.whatsapp_links         enable row level security;
alter table public.whatsapp_link_codes    enable row level security;
alter table public.whatsapp_link_attempts enable row level security;
alter table public.whatsapp_sessions      enable row level security;
alter table public.whatsapp_messages      enable row level security;

-- Redeem a link code in one transaction so two concurrent redemptions cannot both succeed.
--   ok            { ok: true, user_id }
--   bad_code      unknown, expired or already used
--   number_in_use the number is actively linked to a DIFFERENT user
-- A user who already has a link on another number gets it replaced (the old row is revoked).
create or replace function public.whatsapp_redeem_link_code(p_code_hash text, p_wa_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_code record;
  v_other text;
begin
  select * into v_code from whatsapp_link_codes
   where code_hash = p_code_hash and used_at is null and expires_at > now()
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'bad_code');
  end if;

  select user_id into v_other from whatsapp_links where wa_id = p_wa_id and revoked_at is null;
  if found and v_other <> v_code.user_id then
    return jsonb_build_object('ok', false, 'code', 'number_in_use');
  end if;

  update whatsapp_link_codes set used_at = now() where id = v_code.id;
  update whatsapp_links set revoked_at = now()
   where user_id = v_code.user_id and revoked_at is null and wa_id <> p_wa_id;

  insert into whatsapp_links (wa_id, user_id)
  select p_wa_id, v_code.user_id
   where not exists (select 1 from whatsapp_links where wa_id = p_wa_id and revoked_at is null);

  return jsonb_build_object('ok', true, 'user_id', v_code.user_id);
end;
$function$;

revoke all on function public.whatsapp_redeem_link_code(text, text) from public, anon, authenticated;
grant execute on function public.whatsapp_redeem_link_code(text, text) to service_role;
