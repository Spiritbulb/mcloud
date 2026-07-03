# Nuru MVP — Shared Reviewed Knowledge Base + RAG Chat

**Date:** 2026-07-03
**Status:** Approved (design), pending implementation plan
**Repo:** mcloud-1 (backend in `apps/web`, app in `apps/nuru`)
**Predecessor:** `2026-07-02-nuru-app-auth-scaffold-design.md` (auth done; notes/chat still mocked)

## Problem

Nuru is a student "chat with your notes" app. Today the app runs entirely on in-memory
mock services (`apps/nuru/services/notes.ts`, `services/chat.ts`); only auth (WorkOS
magic-code) is real. We need to:

1. Replace the mocks with a real backend that lets students upload notes and chat with an
   AI that answers **from those notes** (RAG).
2. Make the knowledge base **shared and moderated**: a student's own uploads are usable by
   the AI immediately for that student, but only **admin-approved** notes enter the shared
   pool the AI can use for the whole community.
3. Install the full **native capture surface** in one pass so the first EAS build covers the
   MVP (native modules can't ship over-the-air).

## Answer to the original question: is Supabase enough?

**Yes.** No separate vector DB (Pinecone/Weaviate) is needed at MVP scale. Supabase's
`pgvector` extension is first-class. This reuses the established mcloud pattern:
`/api/mobile/*` route handlers in `apps/web`, `requireMobileUser` bearer auth, service-role
Supabase client (`@mcloud/db/server`), user-scoping enforced in app code.

## Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| KB model | Student uploads → shared pool → **admin-reviewed** before community use |
| AI retrieval scope | **My notes (incl. pending) OR community-approved** |
| Retrieval tech | **pgvector semantic search (RAG)** on Supabase |
| Chat model | **GPT-5 via Azure AI Foundry** (Claude not available in user's Foundry region) |
| Embeddings | **Azure OpenAI `text-embedding-3-small`** → `vector(1536)` |
| OCR / text extraction | **Azure AI Vision / Document Intelligence** |
| Review surface | **Admin via web dashboard** — deferred to slice 2; MVP approves via SQL/table edit |
| Ingestion timing | **Synchronous** with a page/size cap (async deferred) |
| Native deps added | `expo-document-picker`, `expo-image-picker`, `expo-file-system` |
| Out of MVP | camera (`expo-camera`), voice/transcription |

**AI stack is fully consolidated under Azure** (student credits cover it): chat (GPT-5),
embeddings (Azure OpenAI), OCR (Azure Vision). No Anthropic key required.

## Architecture

Four isolated units, each behind a clean interface, independently testable, provider-swappable.

### 1. Storage & schema (Supabase)

Raw SQL migrations in `mcloud-1/migrations/` (matches `20260609_store_analytics_rpc.sql` convention).
Requires `create extension if not exists vector;`.

**`nuru_notes`** — one row per uploaded note
- `id uuid pk default gen_random_uuid()`
- `uploader_id uuid not null` (→ users.id)
- `title text`, `subject text`
- `source text` — `'text' | 'file' | 'photo'`
- `original_content text` — pasted text, or Azure-extracted text for files/photos
- `file_url text null` — Supabase Storage path of original (null for typed notes)
- `status text not null default 'pending'` — `'pending' | 'approved' | 'rejected'` (community-share gate)
- `extraction_status text not null default 'done'` — `'pending' | 'done' | 'failed'`
- `created_at timestamptz default now()`, `reviewed_at timestamptz null`, `reviewed_by uuid null`

**`nuru_note_chunks`** — one row per embeddable chunk (RAG unit)
- `id uuid pk default gen_random_uuid()`
- `note_id uuid not null references nuru_notes(id) on delete cascade`
- `chunk_index int not null`
- `content text not null`
- `embedding vector(1536) not null`
- `uploader_id uuid not null` — **denormalized** from parent note (avoids join on hot path)
- `status text not null default 'pending'` — **denormalized** from parent note
- Index: `ivfflat`/`hnsw` on `embedding` for cosine (`vector_cosine_ops`)
- **Denormalized `status` must be kept in sync** when a note is approved/rejected (update both
  `nuru_notes` and its `nuru_note_chunks`, or do it in one transaction/RPC).

**`nuru_chat_messages`** — persisted chat history (replaces in-memory stub)
- `id uuid pk`, `user_id uuid not null`, `role text` (`'user' | 'assistant'`),
  `text text`, `context_note_ids uuid[]`, `created_at timestamptz default now()`

**Storage bucket `nuru-notes`** — **private** (student notes are not world-readable, unlike the
existing public `product-images`). App fetches originals via signed URLs.

### 2. Ingestion pipeline (server, isolated functions)

```
extractText(file) → text        // Azure AI Vision; typed notes skip this
chunk(text) → chunks[]          // ~500-token chunks, small overlap
embed(chunk) → vector(1536)     // Azure OpenAI, batched
chatComplete(question, chunks) → answer   // GPT-5 via Azure Foundry
```

Each provider call is behind a single function so it is swappable in one file.

### 3. RAG chat endpoint (server)

Core retrieval query:
```sql
select content, note_id from nuru_note_chunks
where (uploader_id = $me or status = 'approved')
order by embedding <=> $question_embedding
limit 8;
```

### 4. Admin review — DEFERRED to slice 2

MVP: approve by flipping `status` in SQL / Supabase table editor (and syncing chunk rows).
The retrieval query already respects `status`, so approving a note makes it community-visible
with zero code change. Web dashboard in `apps/web` is a later slice.

## Data flow (upload)

```
phone picks file/photo/text
  → POST /api/mobile/notes (multipart)
  → requireMobileUser(req)                          // bearer auth → scoped user id
  → if file/photo: store original in `nuru-notes` (private bucket)
  → if file/photo: extractText(file) → text         // Azure Vision
  → insert nuru_notes row (status='pending', extraction_status)
  → chunk(text) → chunks[]
  → embed(chunk) → vector(1536)   (batched)         // Azure OpenAI
  → insert nuru_note_chunks rows (denormalized uploader_id + status)
  → return created note   // immediately answerable to THIS uploader (pending or not)
```

**Synchronous** with a page/size cap (mirror existing upload route's 8 MB limit) so it stays a
few seconds. `extraction_status` retained so we can move to async (Edge Function/queue) later
with no schema change.

## API endpoints (all `/api/mobile/`, mirror existing routes)

| Route | Purpose |
|---|---|
| `POST /api/mobile/notes` | Upload/create note → runs ingestion pipeline |
| `GET /api/mobile/notes` | List the student's own notes (replaces mock `notes.list`) |
| `GET /api/mobile/notes/[id]` | Fetch one note (signed URL for original) |
| `POST /api/mobile/chat` | RAG: embed question → similarity search (`me OR approved`) → GPT-5 → persist + return |
| `GET /api/mobile/chat` | Chat history (replaces mock `chat.history`) |

## Native dependencies (MVP capture surface)

App currently has **zero** capture native modules (auth-only). Install the full surface in
**one pass** — native modules can't ship OTA, so each new one = a new EAS build.

**Add:**
- `expo-document-picker` — pick PDFs/docs (the `file` source)
- `expo-image-picker` — pick photos from gallery (the `photo` source, handwritten notes)
- `expo-file-system` — stream picked files into the multipart upload

**Already present (auth):** `expo-secure-store`, `expo-auth-session`, `expo-web-browser`,
`expo-constants`, `expo-linking`.

**Out of MVP:** `expo-camera` (live capture — gallery import covers photos), voice/transcription.

`AddNoteSheet` already renders all four method buttons; wire file + photo to real pickers,
leave voice as a disabled "coming soon" affordance.

> Per `AGENTS.md`: read the exact SDK 57 versioned docs before writing code. `expo-file-system`
> in SDK 57 has a legacy-vs-new API split — pin the import style against
> https://docs.expo.dev/versions/v57.0.0/ during planning.

## Client wiring

- Swap `apps/nuru/services/notes.ts` and `services/chat.ts` (in-memory mocks) to call the new
  endpoints via the `authedFetch` pattern from `apps/mobile/src/lib/api.ts`.
- `types/index.ts` `Note` gains `status` and `fileUrl`.

## Security / correctness notes

- **No RLS.** Service-role bypasses RLS; app-code scoping is the only backstop. For a *shared
  community KB* a scoping bug leaks the whole pool — higher-stakes than private notes.
  **Mitigation:** retrieval + original-file fetch always go through **one helper** that injects
  `uploader_id = $me OR status = 'approved'`, so the filter can't be forgotten. Consider RLS as
  defense-in-depth in a later slice.
- **Private bucket + signed URLs** for note originals (not public like product images).
- **Denormalized `status`** on chunks must be updated on approve/reject (transaction/RPC).
- **Per-user scoping** on `GET /notes`, `GET /notes/[id]`, chat history — always `.eq` on the
  authed user id (like the canonical `me/route.ts`).

## MVP slice order (backend-RAG-first)

1. **Schema + ingestion pipeline**: migrations (pgvector, 3 tables, private bucket),
   `extractText`/`chunk`/`embed` functions, `POST /api/mobile/notes`.
2. **RAG chat**: `POST /api/mobile/chat` + `GET /api/mobile/chat`, GPT-5 via Foundry.
3. **Notes read endpoints**: `GET /api/mobile/notes`, `GET /api/mobile/notes/[id]`.
4. **App wiring**: swap mock services → real endpoints; wire `expo-document-picker` +
   `expo-image-picker` into the real `AddNoteSheet`.
5. **EAS-readiness + build**: bundle ids, `eas.json`, projectId, reanimated babel, icons —
   one build covering the whole MVP native surface.

Admin review dashboard = separate later slice (approve via SQL until then).

## Open items to resolve at plan time

- Exact `expo-file-system` SDK 57 API (legacy vs new) — confirm against versioned docs.
- Azure Foundry GPT-5 deployment name/endpoint + Azure OpenAI embedding deployment name/endpoint
  + Azure Vision endpoint — env vars in `apps/web`.
- pgvector index type (`ivfflat` vs `hnsw`) and list/probe params — pick at migration time.
- Chunk size/overlap tuning.
