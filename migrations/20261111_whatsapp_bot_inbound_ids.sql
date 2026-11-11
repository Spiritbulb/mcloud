-- The merchant bot's idempotency table collided with the existing legacy public.whatsapp_messages
-- (conversation_id etc., see whatsapp_conversations), so 20261109's "create table if not exists"
-- was skipped and the bot's insert of just { id } failed. The bot gets its own table instead.
create table if not exists public.whatsapp_inbound_ids (
  id         text primary key,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_inbound_ids_created_at on public.whatsapp_inbound_ids (created_at);
alter table public.whatsapp_inbound_ids enable row level security;

-- 20261109 created this index on the legacy table by mistake; drop it.
drop index if exists public.whatsapp_messages_created_at;
