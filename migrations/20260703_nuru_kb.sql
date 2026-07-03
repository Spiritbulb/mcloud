-- ============================================================================
-- Nuru knowledge base — Slice 1 schema
-- Shared, admin-reviewed notes + RAG chunks + chat history.
-- Retrieval scope is "my notes OR approved" — enforced in app code AND in the
-- match_nuru_chunks RPC below. Service-role bypasses RLS; app-code is the guard.
-- pgvector ANN indexes cap at 2000 dims, so vector(3072) uses EXACT search
-- (no ivfflat/hnsw index) — correct at MVP scale.
--
-- NOTE: public.users.id is TEXT (WorkOS user ids like 'user_01...'), so every
-- user-referencing column here is TEXT, not uuid. Matches me/route.ts scoping.
-- Safe to re-run.
-- ============================================================================

create extension if not exists vector;

-- ── Notes ────────────────────────────────────────────────────────────────────
create table if not exists public.nuru_notes (
  id                uuid primary key default gen_random_uuid(),
  uploader_id       text not null references public.users(id) on delete cascade,
  title             text,
  subject           text,
  source            text not null check (source in ('text', 'file', 'photo')),
  original_content  text,
  file_url          text,
  status            text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  extraction_status text not null default 'done'
                      check (extraction_status in ('pending', 'done', 'failed')),
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       text references public.users(id)
);

create index if not exists idx_nuru_notes_uploader on public.nuru_notes (uploader_id, created_at desc);

-- ── Chunks (RAG unit) ────────────────────────────────────────────────────────
-- uploader_id + status denormalized from parent note so the retrieval filter
-- needs no join. MUST be kept in sync on approve/reject (see review slice).
create table if not exists public.nuru_note_chunks (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid not null references public.nuru_notes(id) on delete cascade,
  chunk_index  int not null,
  content      text not null,
  embedding    vector(3072) not null,
  uploader_id  text not null,
  status       text not null default 'pending'
);

create index if not exists idx_nuru_chunks_note on public.nuru_note_chunks (note_id);
-- NOTE: intentionally NO ivfflat/hnsw index — 3072 dims exceeds pgvector's 2000-dim ANN cap.

-- ── Chat history ─────────────────────────────────────────────────────────────
create table if not exists public.nuru_chat_messages (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null references public.users(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  text             text not null,
  context_note_ids uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists idx_nuru_chat_user on public.nuru_chat_messages (user_id, created_at);

-- ── Retrieval RPC: "my notes OR approved", exact cosine search ────────────────
create or replace function public.match_nuru_chunks(
  p_user_id         text,
  p_query_embedding vector(3072),
  p_match_count     int default 8
)
returns table (note_id uuid, content text, similarity float)
language sql
stable
as $$
  select c.note_id, c.content, 1 - (c.embedding <=> p_query_embedding) as similarity
  from public.nuru_note_chunks c
  where c.uploader_id = p_user_id or c.status = 'approved'
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- ── Private storage bucket for original uploads ──────────────────────────────
insert into storage.buckets (id, name, public)
values ('nuru-notes', 'nuru-notes', false)
on conflict (id) do nothing;
