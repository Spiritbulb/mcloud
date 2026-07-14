# Nuru KB — Slice 1: Schema + Ingestion Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the shared, reviewed knowledge base storage and the upload→extract→chunk→embed ingestion pipeline, exposed as `POST /api/mobile/notes`, so an uploaded note (text/file/photo) becomes searchable RAG chunks in Supabase.

**Architecture:** New Supabase tables (`nuru_notes`, `nuru_note_chunks`, `nuru_chat_messages`) with a `pgvector` column and a `match_nuru_chunks` RPC for similarity search. A single Next.js route handler in `apps/web` runs the pipeline synchronously behind three isolated, provider-swappable functions (`extractText` via Azure Vision, `chunk` pure-JS, `embed` via Azure OpenAI). Follows the established `/api/mobile/*` pattern: `requireMobileUser` bearer auth + service-role `createClient()`, user-scoping enforced in app code.

**Tech Stack:** Next.js route handlers (`apps/web`), `@mcloud/db/server` (Supabase service-role, `@supabase/ssr`), Postgres + `pgvector`, Azure AI Vision (OCR), Azure OpenAI (`text-embedding-3-large`). Tests: built-in `node:test` + `node:assert/strict` (no framework — matches `apps/web/app/api/_auth-ratelimit.test.ts`).

## Global Constraints

- **Repo:** all backend work in `mcloud-1`, branch `feat/nuru-app`. Migrations in `mcloud-1/migrations/`.
- **Route style (verbatim from `me/route.ts`):** 4-space indent; `import { NextResponse, type NextRequest } from 'next/server'`; guard with `const auth = await requireMobileUser(req); if (auth instanceof NextResponse) return auth`; DB via `const supabase = await createClient()` from `@mcloud/db/server`.
- **User scoping is the ONLY isolation** (service-role bypasses RLS). Every read/write MUST filter by `auth.user.id`. Retrieval MUST be `uploader_id = $me OR status = 'approved'` — routed through ONE function so it can't be forgotten.
- **`public.users.id` is `text`** (WorkOS ids like `user_01...`), verified at execution. All user-referencing columns (`uploader_id`, `user_id`, `reviewed_by`) and the `match_nuru_chunks` `p_user_id` param are **`text`, not uuid**. Generated type: `uploader_id: string`.
- **Migrations:** lowercase SQL, `create ... if not exists` / `create or replace`, re-runnable, comment header (match `20260609_store_analytics_rpc.sql`).
- **Embeddings:** Azure OpenAI `text-embedding-3-large` → `vector(3072)`. Env in `apps/web/.env.local`: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`, `AZURE_VISION_ENDPOINT`, `AZURE_VISION_API_KEY`.
- **⚠️ pgvector ANN indexes cap at 2000 dims.** `vector(3072)` CANNOT use `ivfflat`/`hnsw`. Slice 1 uses **exact search** (no ANN index) — correct at MVP scale. Do NOT add a vector index.
- **⚠️ Known blocker (resolve before Task 5 verify):** `AZURE_OPENAI_ENDPOINT` in `.env.local` is currently a Foundry *project* URL (`...services.ai.azure.com/api/projects/...`). The Azure OpenAI REST call needs the resource form `https://<resource>.openai.azure.com`. Get the correct endpoint from the portal (embedding deployment → target URI) before running the live embed verification.
- **Tests:** colocated `*.test.ts`, `import { test } from 'node:test'` + `import assert from 'node:assert/strict'`, run via `node --test <file>`. Only pure logic gets unit tests; I/O-bound pieces get a documented live verification step.
- **Node version:** route handlers may use `File`/`FormData`/`fetch` (Node 18+ globals, already used in `upload/route.ts`).

---

## File Structure

- `mcloud-1/migrations/20260703_nuru_kb.sql` — **Create.** pgvector extension, 3 tables, `match_nuru_chunks` RPC, `nuru-notes` private bucket. One re-runnable migration.
- `apps/web/app/api/mobile/notes/_ingest/chunk.ts` — **Create.** Pure `chunk(text)` — the only unit-tested logic.
- `apps/web/app/api/mobile/notes/_ingest/chunk.test.ts` — **Create.** `node:test` unit tests for `chunk`.
- `apps/web/app/api/mobile/notes/_ingest/extract.ts` — **Create.** `extractText(bytes, contentType)` via Azure Vision. Isolated vendor call.
- `apps/web/app/api/mobile/notes/_ingest/embed.ts` — **Create.** `embed(texts)` via Azure OpenAI. Isolated vendor call.
- `apps/web/app/api/mobile/notes/route.ts` — **Create.** `POST` handler orchestrating store→extract→chunk→embed→insert.
- `packages/db/src/database.types.ts` — **Modify.** Regenerate after migration (adds nuru tables to typed client).

Each `_ingest/*` file has one responsibility and one export, so a later slice can swap Azure for another provider by editing one file.

---

### Task 1: Migration — pgvector, tables, RPC, bucket

**Files:**
- Create: `mcloud-1/migrations/20260703_nuru_kb.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: tables `nuru_notes`, `nuru_note_chunks`, `nuru_chat_messages`; RPC `public.match_nuru_chunks(p_user_id text, p_query_embedding vector(3072), p_match_count int) returns table(note_id uuid, content text, similarity float)`; storage bucket `nuru-notes` (private). Column contract used by later tasks: `nuru_notes(id, uploader_id, title, subject, source, original_content, file_url, status, extraction_status, created_at, reviewed_at, reviewed_by)`; `nuru_note_chunks(id, note_id, chunk_index, content, embedding vector(3072), uploader_id, status)`.

- [ ] **Step 1: Write the migration SQL**

Create `mcloud-1/migrations/20260703_nuru_kb.sql`:

```sql
-- ============================================================================
-- Nuru knowledge base — Slice 1 schema
-- Shared, admin-reviewed notes + RAG chunks + chat history.
-- Retrieval scope is "my notes OR approved" — enforced in app code AND in the
-- match_nuru_chunks RPC below. Service-role bypasses RLS; app-code is the guard.
-- pgvector ANN indexes cap at 2000 dims, so vector(3072) uses EXACT search
-- (no ivfflat/hnsw index) — correct at MVP scale.
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
```

- [ ] **Step 2: Apply the migration to Supabase**

Apply via the Supabase MCP `apply_migration` tool (name `nuru_kb_slice1`, the SQL above) OR paste into the Supabase SQL editor. Both are idempotent.

Expected: success, no error. If `public.users` FK fails, confirm the table name — it is `users` per `me/route.ts`.

- [ ] **Step 3: Verify objects exist**

Run (Supabase SQL editor or MCP `execute_sql`):
```sql
select table_name from information_schema.tables
where table_schema='public' and table_name like 'nuru_%';
select proname from pg_proc where proname='match_nuru_chunks';
select id from storage.buckets where id='nuru-notes';
```
Expected: 3 tables listed, 1 proc, 1 bucket.

- [ ] **Step 4: Regenerate DB types**

Run: `cd apps/web && npm run sb-typegen`
Expected: `packages/db/src/database.types.ts` now contains `nuru_notes`, `nuru_note_chunks`, `nuru_chat_messages`. Verify with: `grep -c 'nuru_notes' packages/db/src/database.types.ts` → ≥1.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260703_nuru_kb.sql packages/db/src/database.types.ts
git commit -m "feat(nuru): KB schema — pgvector tables, match RPC, private bucket"
```

---

### Task 2: `chunk(text)` — pure chunking logic (TDD)

**Files:**
- Create: `apps/web/app/api/mobile/notes/_ingest/chunk.ts`
- Test: `apps/web/app/api/mobile/notes/_ingest/chunk.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function chunk(text: string, opts?: { size?: number; overlap?: number }): string[]`. Splits on whitespace into ~`size` (default 1200) character windows with `overlap` (default 150) char overlap; trims; drops empty. Deterministic. Used by Task 5.

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/api/mobile/notes/_ingest/chunk.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunk } from './chunk.ts'

test('short text returns a single chunk', () => {
  const out = chunk('hello world')
  assert.deepEqual(out, ['hello world'])
})

test('empty / whitespace-only text returns no chunks', () => {
  assert.deepEqual(chunk(''), [])
  assert.deepEqual(chunk('   \n  '), [])
})

test('long text splits into multiple overlapping chunks', () => {
  const text = 'a'.repeat(3000)
  const out = chunk(text, { size: 1000, overlap: 100 })
  assert.ok(out.length >= 3, `expected >=3 chunks, got ${out.length}`)
  // each chunk no larger than size
  for (const c of out) assert.ok(c.length <= 1000, `chunk too long: ${c.length}`)
  // overlap: consecutive chunks share a suffix/prefix (non-zero overlap window)
  assert.ok(out.length < 3000 / 1000 + 3, 'overlap should not explode chunk count')
})

test('does not split a word across a boundary when whitespace exists', () => {
  const words = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ')
  const out = chunk(words, { size: 500, overlap: 50 })
  for (const c of out) assert.ok(!/^\S*$/.test(c) || c.length <= 500)
  // no chunk starts or ends mid-"word" fragment like "wor"
  for (const c of out) assert.ok(!c.startsWith('ord'), `mid-word split: ${c.slice(0, 6)}`)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && node --test app/api/mobile/notes/_ingest/chunk.test.ts`
Expected: FAIL — `Cannot find module './chunk.ts'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/app/api/mobile/notes/_ingest/chunk.ts`:

```ts
// Pure text chunker for RAG. Deterministic, no I/O. Splits on whitespace into
// ~`size`-char windows with `overlap`-char overlap, preferring word boundaries.
export function chunk(
  text: string,
  opts: { size?: number; overlap?: number } = {},
): string[] {
  const size = opts.size ?? 1200
  const overlap = opts.overlap ?? 150
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= size) return [clean]

  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length)
    // back off to the last space before `end` to avoid splitting a word
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end)
      if (lastSpace > start) end = lastSpace
    }
    const piece = clean.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= clean.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return chunks
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && node --test app/api/mobile/notes/_ingest/chunk.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/mobile/notes/_ingest/chunk.ts app/api/mobile/notes/_ingest/chunk.test.ts
git commit -m "feat(nuru): pure text chunker for RAG ingestion (TDD)"
```

---

### Task 3: `extractText` — Azure Vision OCR (isolated vendor call)

**Files:**
- Create: `apps/web/app/api/mobile/notes/_ingest/extract.ts`

**Interfaces:**
- Consumes: env `AZURE_VISION_ENDPOINT`, `AZURE_VISION_API_KEY`.
- Produces: `export async function extractText(bytes: ArrayBuffer, contentType: string): Promise<string>`. Sends bytes to Azure AI Vision Image Analysis `read` (OCR); returns concatenated text lines. Throws `Error('extraction_failed')` on non-2xx. Used by Task 5.

- [ ] **Step 1: Write the implementation**

> No unit test: this is a pure network call to Azure with no branching logic worth mocking. It is exercised by the live verification in Task 5, Step 4. (Matches the repo's practice of not mock-testing vendor I/O.)

Create `apps/web/app/api/mobile/notes/_ingest/extract.ts`:

```ts
// Azure AI Vision — Image Analysis 4.0 "read" (OCR). Isolated so the OCR vendor
// can be swapped in one file. Returns plain text; throws 'extraction_failed'.
const API_VERSION = '2024-02-01'

export async function extractText(
  bytes: ArrayBuffer,
  _contentType: string,
): Promise<string> {
  const endpoint = process.env.AZURE_VISION_ENDPOINT
  const key = process.env.AZURE_VISION_API_KEY
  if (!endpoint || !key) throw new Error('extraction_failed')

  const url =
    `${endpoint.replace(/\/$/, '')}/computervision/imageanalysis:analyze` +
    `?api-version=${API_VERSION}&features=read`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/octet-stream',
    },
    body: bytes,
  })

  if (!res.ok) {
    console.error('[nuru extract]', res.status, await res.text().catch(() => ''))
    throw new Error('extraction_failed')
  }

  const json = (await res.json()) as {
    readResult?: { blocks?: { lines?: { text: string }[] }[] }
  }
  const lines =
    json.readResult?.blocks?.flatMap((b) => b.lines?.map((l) => l.text) ?? []) ?? []
  return lines.join('\n').trim()
}
```

- [ ] **Step 2: Type-check compiles**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i 'extract.ts' || echo "no extract.ts type errors"`
Expected: `no extract.ts type errors`.

- [ ] **Step 3: Commit**

```bash
git add app/api/mobile/notes/_ingest/extract.ts
git commit -m "feat(nuru): Azure Vision OCR extractText (isolated vendor call)"
```

---

### Task 4: `embed` — Azure OpenAI embeddings (isolated vendor call)

**Files:**
- Create: `apps/web/app/api/mobile/notes/_ingest/embed.ts`

**Interfaces:**
- Consumes: env `AZURE_OPENAI_ENDPOINT` (resource form — see Global Constraints blocker), `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`.
- Produces: `export async function embed(texts: string[]): Promise<number[][]>`. Returns one 3072-dim vector per input, order-preserved. Throws `Error('embed_failed')` on non-2xx. Used by Tasks 5.

- [ ] **Step 1: Write the implementation**

> No unit test (vendor I/O) — exercised by Task 5 live verification.

Create `apps/web/app/api/mobile/notes/_ingest/embed.ts`:

```ts
// Azure OpenAI embeddings (text-embedding-3-large → 3072 dims). Isolated so the
// embedding provider is swappable. Batches all texts in one request.
// NOTE: AZURE_OPENAI_ENDPOINT must be the resource form
// https://<resource>.openai.azure.com (NOT the Foundry project URL).
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION
  if (!endpoint || !key || !deployment || !apiVersion) throw new Error('embed_failed')

  const url =
    `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/embeddings` +
    `?api-version=${apiVersion}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts }),
  })

  if (!res.ok) {
    console.error('[nuru embed]', res.status, await res.text().catch(() => ''))
    throw new Error('embed_failed')
  }

  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] }
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}
```

- [ ] **Step 2: Type-check compiles**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i 'embed.ts' || echo "no embed.ts type errors"`
Expected: `no embed.ts type errors`.

- [ ] **Step 3: Commit**

```bash
git add app/api/mobile/notes/_ingest/embed.ts
git commit -m "feat(nuru): Azure OpenAI embed() for text-embedding-3-large"
```

---

### Task 5: `POST /api/mobile/notes` — orchestrate the pipeline

**Files:**
- Create: `apps/web/app/api/mobile/notes/route.ts`

**Interfaces:**
- Consumes: `requireMobileUser` (`../_lib`), `createClient` (`@mcloud/db/server`), `chunk` (`./_ingest/chunk`), `extractText` (`./_ingest/extract`), `embed` (`./_ingest/embed`).
- Produces: `POST` accepting multipart/form-data `{ source, title?, subject?, text?, file? }`. Returns `201 { note }` where note is the inserted `nuru_notes` row. Errors: 400 bad input, 401 unauth, 422 extraction/embedding failure, 500 db.

- [ ] **Step 1: Write the route handler**

> This handler is verified end-to-end via live curl (Step 4), not a unit test — it is pure I/O orchestration over auth + Supabase + Azure, with no isolated branching logic that a mock would meaningfully cover. Pure logic already lives in `chunk` (unit-tested, Task 2).

Create `apps/web/app/api/mobile/notes/route.ts`:

```ts
// POST /api/mobile/notes — create a note and ingest it into the KB.
// multipart/form-data: source ('text'|'file'|'photo'), title?, subject?,
//   text? (for source='text'), file? (for 'file'|'photo').
// Pipeline: store original (file/photo) → extractText → chunk → embed → insert.
// The note is answerable to its uploader immediately; status='pending' gates
// community sharing. Auth: mobile bearer token; scoped to auth.user.id.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../_lib'
import { chunk } from './_ingest/chunk'
import { extractText } from './_ingest/extract'
import { embed } from './_ingest/embed'

const MAX_SIZE = 8 * 1024 * 1024 // 8 MB, matches existing upload route
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const FILE_TYPES = [...IMAGE_TYPES, 'application/pdf']

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id

    let form: FormData
    try {
        form = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const source = form.get('source') as string | null
    const title = (form.get('title') as string | null) ?? null
    const subject = (form.get('subject') as string | null) ?? null
    if (!source || !['text', 'file', 'photo'].includes(source)) {
        return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }

    const supabase = await createClient()
    let content = ''
    let fileUrl: string | null = null

    if (source === 'text') {
        content = ((form.get('text') as string | null) ?? '').trim()
        if (!content) return NextResponse.json({ error: 'Empty text' }, { status: 400 })
    } else {
        const file = form.get('file') as File | null
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 8 MB)' }, { status: 400 })
        }
        if (!FILE_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
        }
        const bytes = await file.arrayBuffer()

        // Store the original in the private bucket.
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
            .from('nuru-notes')
            .upload(path, bytes, { contentType: file.type, upsert: false })
        if (upErr) {
            console.error('[nuru notes upload]', upErr.message)
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
        }
        fileUrl = path

        // Extract text (OCR / PDF read).
        try {
            content = await extractText(bytes, file.type)
        } catch {
            return NextResponse.json({ error: 'Could not read the file' }, { status: 422 })
        }
        if (!content) {
            return NextResponse.json({ error: 'No text found in file' }, { status: 422 })
        }
    }

    // Insert the note (answerable to uploader immediately; pending for community).
    const { data: note, error: noteErr } = await supabase
        .from('nuru_notes')
        .insert({
            uploader_id: userId,
            title,
            subject,
            source,
            original_content: content,
            file_url: fileUrl,
            status: 'pending',
            extraction_status: 'done',
        })
        .select()
        .single()
    if (noteErr || !note) {
        console.error('[nuru notes insert]', noteErr?.message)
        return NextResponse.json({ error: 'Could not save note' }, { status: 500 })
    }

    // Chunk + embed + store chunks.
    const pieces = chunk(content)
    if (pieces.length > 0) {
        let vectors: number[][]
        try {
            vectors = await embed(pieces)
        } catch {
            return NextResponse.json({ error: 'Could not index note' }, { status: 422 })
        }
        const rows = pieces.map((c, i) => ({
            note_id: note.id,
            chunk_index: i,
            content: c,
            embedding: JSON.stringify(vectors[i]), // pgvector accepts the JSON array text form
            uploader_id: userId,
            status: 'pending',
        }))
        const { error: chunkErr } = await supabase.from('nuru_note_chunks').insert(rows)
        if (chunkErr) {
            console.error('[nuru chunks insert]', chunkErr.message)
            return NextResponse.json({ error: 'Could not index note' }, { status: 500 })
        }
    }

    return NextResponse.json({ note }, { status: 201 })
}
```

- [ ] **Step 2: Type-check compiles**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE 'notes/route.ts|_ingest' || echo "no nuru notes type errors"`
Expected: `no nuru notes type errors`.

- [ ] **Step 3: Resolve the Azure endpoint blocker**

Before live verification: confirm `AZURE_OPENAI_ENDPOINT` in `apps/web/.env.local` is the resource form `https://<resource>.openai.azure.com` (NOT `...services.ai.azure.com/api/projects/...`). Get it from the Azure portal → your embedding deployment → target URI. Update `.env.local` if needed.

- [ ] **Step 4: Live end-to-end verification (text note)**

Start web: `cd apps/web && npm run dev` (separate terminal). Obtain a valid mobile bearer token (from the nuru app login, or the auth verify endpoint). Then:

```bash
TOKEN="<mobile bearer token>"
curl -sS -X POST http://localhost:3000/api/mobile/notes \
  -H "Authorization: Bearer $TOKEN" \
  -F source=text -F title='Photosynthesis' -F subject='Biology' \
  -F text='Light reactions occur in the thylakoid membrane and produce ATP and NADPH.'
```
Expected: `201` with `{ "note": { "id": "...", "status": "pending", ... } }`.

Then confirm chunks landed with embeddings:
```sql
select n.title, count(c.id) as chunks,
       (select vector_dims(embedding) from nuru_note_chunks where note_id = n.id limit 1) as dims
from nuru_notes n left join nuru_note_chunks c on c.note_id = n.id
where n.title = 'Photosynthesis' group by n.id, n.title;
```
Expected: `chunks >= 1`, `dims = 3072`.

If embed returns 401/404: the endpoint/deployment/api-version is wrong — fix and re-run (this is the most likely failure and why Step 3 exists).

- [ ] **Step 5: Commit**

```bash
git add app/api/mobile/notes/route.ts
git commit -m "feat(nuru): POST /api/mobile/notes — ingest pipeline (store→extract→chunk→embed)"
```

---

## Self-Review

**1. Spec coverage (Slice 1 = spec's slice 1 only):**
- Schema (`nuru_notes`, `nuru_note_chunks` vector(3072), `nuru_chat_messages`, private bucket) → Task 1 ✅
- Retrieval scope "my OR approved" → `match_nuru_chunks` RPC (Task 1); chat endpoint that *calls* it is Slice 2 (out of scope here) ✅ (RPC built now so Slice 2 just calls it)
- Ingestion functions `extractText` / `chunk` / `embed` → Tasks 3, 2, 4 ✅
- `POST /api/mobile/notes` synchronous pipeline with 8 MB cap → Task 5 ✅
- pgvector 2000-dim ANN cap → handled: exact search, no vector index, documented ✅
- Azure endpoint-shape blocker → surfaced in Global Constraints + Task 5 Step 3 ✅
- Out of scope (correctly deferred): chat endpoint, notes read endpoints, app wiring, native deps, admin review — later slices ✅

**2. Placeholder scan:** No TBD/TODO. `_contentType` param in `extractText` is intentionally unused (kept for interface stability / future PDF branch) — not a placeholder. All code blocks complete.

**3. Type consistency:** `chunk(text, opts)` signature identical in Task 2 def and Task 5 use. `extractText(bytes, contentType)` and `embed(texts)` match between their def tasks and Task 5. `match_nuru_chunks` param/return types consistent (defined Task 1, consumed Slice 2). Column names (`uploader_id`, `original_content`, `extraction_status`, `file_url`) consistent between migration and route insert. `embedding` stored as `JSON.stringify(vector)` — valid pgvector text input; column is `vector(3072)`.

**Note on TDD:** Only `chunk` is pure/deterministic and gets real unit tests (Task 2). Vendor I/O (`extractText`, `embed`) and the orchestration route are verified via live end-to-end checks, matching this repo's convention (no mock-heavy vendor tests). This is a deliberate, documented deviation from step-per-test TDD where testing would only assert the mock.
