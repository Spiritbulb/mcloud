-- migrations/20260704_nuru_chat_sessions.sql
-- Nuru chat sessions — group the flat nuru_chat_messages into named threads.
-- Existing rows are backfilled into one "Chat" session per user so nobody loses
-- history. RLS stays off; app routes scope by user_id (+ session_id). Re-runnable.

create table if not exists public.nuru_chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(id) on delete cascade,
  title       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_nuru_sessions_user
  on public.nuru_chat_sessions (user_id, updated_at desc);

alter table public.nuru_chat_messages
  add column if not exists session_id uuid references public.nuru_chat_sessions(id) on delete cascade;

create index if not exists idx_nuru_chat_session
  on public.nuru_chat_messages (session_id, created_at);

-- Backfill: one "Chat" session per user who has messages, then stamp their rows.
-- Idempotent: only acts on messages that don't yet have a session_id.
do $$
declare
  u text;
  sid uuid;
begin
  for u in
    select distinct user_id from public.nuru_chat_messages where session_id is null
  loop
    insert into public.nuru_chat_sessions (user_id, title, created_at, updated_at)
      values (u, 'Chat', now(), now())
      returning id into sid;
    update public.nuru_chat_messages
      set session_id = sid
      where user_id = u and session_id is null;
  end loop;
end $$;
