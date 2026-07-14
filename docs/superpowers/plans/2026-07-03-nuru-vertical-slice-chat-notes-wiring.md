# Nuru Vertical Slice — Chat + Notes-Read Endpoints + App Wiring + Native Pickers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Nuru work end-to-end — fix the embeddings vendor call, build the chat + notes-read endpoints, swap both mock client services for real API calls, and wire the native document/image pickers — so a student can upload a real note and chat with GPT-5 that answers from it (RAG).

**Architecture:** New Next.js route handlers in `apps/web` under `/api/mobile/*` (bearer auth via `requireMobileUser`, service-role Supabase, user-scoping in app code). RAG chat embeds the question, retrieves via the `match_nuru_chunks` RPC ("my notes OR approved"), and answers with GPT-5 through an isolated `chatComplete` vendor function. The `apps/nuru` client swaps its two in-memory mock services for factory functions threaded with `authedFetch`, and `AddNoteSheet` gains real pickers that upload via the proven `ExpoFile` multipart pattern.

**Tech Stack:** Next.js route handlers (`apps/web`), `@mcloud/db/server` (Supabase service-role), Postgres + pgvector, Azure OpenAI **v1 API** (`gpt-5` chat, `text-embedding-3-large`), Expo SDK 57 (`expo-document-picker`, `expo-image-picker`, `expo-file-system`). Server tests: `node:test` + `node:assert/strict`.

## Global Constraints

- **Repo/branch:** all work in `mcloud-1`, branch `feat/nuru-app`.
- **Route style (verbatim from `me/route.ts`):** 4-space indent; `import { NextResponse, type NextRequest } from 'next/server'`; guard `const auth = await requireMobileUser(req); if (auth instanceof NextResponse) return auth`; DB via `const supabase = await createClient()` from `@mcloud/db/server`. `requireMobileUser` returns `{ user: AuthUser } | NextResponse`; the user id is `auth.user.id` (string).
- **User scoping is the ONLY isolation** (service-role bypasses RLS). Every read/write filters by `auth.user.id`. Retrieval goes through the `match_nuru_chunks` RPC exclusively (`uploader_id = $me OR status = 'approved'`).
- **`public.users.id` is `text`** (WorkOS ids). All user columns are `text`.
- **Azure endpoint is the v1 API shape (VERIFIED LIVE 2026-07-03):** `AZURE_OPENAI_ENDPOINT=https://nuru-ai-project-resource.openai.azure.com/openai/v1`. Calls are `POST {endpoint}/embeddings` and `POST {endpoint}/chat/completions`, header `api-key: <AZURE_OPENAI_API_KEY>`, body carries `model: <deployment>`, and there is **NO `api-version` query param** and **NO `/deployments/{d}/` path segment**. Deployments: `AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large`. Both returned HTTP 200 in live probes. GPT-5 works with plain `{ model, messages }` — do NOT send `temperature`/`max_tokens` (the gpt-5 deployment rejects non-default temperature; defaults are fine).
- **Slice 1's `embed.ts` is BROKEN against this endpoint** (it uses the classic `/openai/deployments/{d}/embeddings?api-version=` shape). Task 1 fixes it. Chat depends on it, so it is fixed first.
- **Env source of truth:** `apps/web/.env.local` (already contains all Azure vars above).
- **Tests:** colocated `*.test.ts`, `import { test } from 'node:test'` + `import assert from 'node:assert/strict'`, run via `node --test <file>`. Only pure logic gets unit tests; vendor I/O + routes get live verification.
- **Client env:** `authedFetch(path, init)` from `useAuth()` prepends `config.apiBaseUrl`, attaches the bearer, refreshes once on 401, and auto-sets `Content-Type: application/json` for non-FormData bodies (skips it for FormData). Do NOT set Content-Type manually for uploads.
- **Expo multipart (VERIFIED pattern from `apps/mobile/src/lib/api.ts`):** Expo's `fetch` multipart serializer rejects the RN `{ uri, name, type }` part. Build `const file = new ExpoFile(localUri)` (from `import { File as ExpoFile } from 'expo-file-system'`) and append it: `form.append('file', file as unknown as Blob, filename)`.
- **SDK 57 docs:** per `AGENTS.md`, pin picker APIs to https://docs.expo.dev/versions/v57.0.0/ .

---

## File Structure

**Backend (`apps/web`):**
- `app/api/mobile/notes/_ingest/embed.ts` — **Modify.** Fix URL to v1 shape.
- `app/api/mobile/chat/_chat/complete.ts` — **Create.** `chatComplete(question, chunks)` → GPT-5 (v1). Isolated vendor call.
- `app/api/mobile/chat/route.ts` — **Create.** `POST` (RAG) + `GET` (history).
- `app/api/mobile/notes/route.ts` — **Modify.** Add `GET` (list own notes) to the existing `POST`.
- `app/api/mobile/notes/[id]/route.ts` — **Create.** `GET` one note + signed URL.

**Client (`apps/nuru`):**
- `types/index.ts` — **Modify.** `Note` gains `status`, `fileUrl`; add `NoteRow`/`MessageRow` API shapes.
- `services/_map.ts` — **Create.** Pure `mapNote`/`mapMessage` snake→camel. Unit-tested.
- `services/_map.test.ts` — **Create.** Unit tests for mappers.
- `services/notes.ts` — **Rewrite.** `createNotesApi(authedFetch)` → `{ list, get, create }`.
- `services/chat.ts` — **Rewrite.** `createChatApi(authedFetch)` → `{ history, send }`.
- `hooks/useApi.ts` — **Create.** `useApi()` threads `authedFetch` into both factories.
- `components/AddNoteSheet.tsx` — **Modify.** Real file/photo pickers; consume `useApi()`.
- Call sites reading `notes`/`chat` singletons — **Modify** to `useApi()`.
- `package.json` — **Modify.** Add three Expo deps.

Each `_ingest/*` and `_chat/*` file has one export → one vendor, swappable in one file. `_map.ts` isolates the only pure client logic so it is unit-testable without a device.

---

### Task 1: Fix `embed.ts` to the Azure v1 API shape

**Files:**
- Modify: `apps/web/app/api/mobile/notes/_ingest/embed.ts`

**Interfaces:**
- Consumes: env `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`.
- Produces: `export async function embed(texts: string[]): Promise<number[][]>` — one 3072-dim vector per input, order-preserved. Throws `Error('embed_failed')` on non-2xx. **Unchanged signature** — only the URL/body change. Consumed by Tasks 3 (chat) and the existing `POST /notes`.

- [ ] **Step 1: Rewrite the URL + body to the v1 shape**

Replace the body of `apps/web/app/api/mobile/notes/_ingest/embed.ts` with:

```ts
// Azure OpenAI embeddings (text-embedding-3-large → 3072 dims), v1 API shape.
// Isolated so the embedding provider is swappable. Batches all texts in one call.
// v1 API (VERIFIED): POST {endpoint}/embeddings, body { input, model: deployment },
// header api-key; NO api-version, NO /deployments/ path. AZURE_OPENAI_ENDPOINT ends in /openai/v1.
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
  if (!endpoint || !key || !deployment) throw new Error('embed_failed')

  const url = `${endpoint.replace(/\/$/, '')}/embeddings`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts, model: deployment }),
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

- [ ] **Step 3: Live verify `embed` returns a 3072-dim vector**

Create a throwaway script `apps/web/_scratch_embed.mjs`:

```js
import 'dotenv/config'
const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')
const res = await fetch(`${endpoint}/embeddings`, {
  method: 'POST',
  headers: { 'api-key': process.env.AZURE_OPENAI_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ input: ['hello world'], model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT }),
})
const j = await res.json()
console.log('status', res.status, 'dims', j.data?.[0]?.embedding?.length)
```

Run: `cd apps/web && node -r dotenv/config _scratch_embed.mjs dotenv_config_path=.env.local`
Expected: `status 200 dims 3072`. Then delete the scratch file: `rm apps/web/_scratch_embed.mjs`.
(If `dotenv` is not installed, instead export the vars from `.env.local` in the shell and run the fetch inline — the point is to confirm `200` + `3072`.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/mobile/notes/_ingest/embed.ts
git commit -m "fix(nuru): embed() uses Azure v1 API shape (endpoint/embeddings, model=deployment)"
```

---

### Task 2: `chatComplete` — GPT-5 via Azure v1 (isolated vendor call)

**Files:**
- Create: `apps/web/app/api/mobile/chat/_chat/complete.ts`

**Interfaces:**
- Consumes: env `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_CHAT_DEPLOYMENT`.
- Produces: `export async function chatComplete(question: string, chunks: { content: string }[]): Promise<string>` — returns the assistant answer text. Throws `Error('chat_failed')` on non-2xx or empty. Consumed by Task 3.

- [ ] **Step 1: Write the implementation**

> No unit test: pure network call to Azure, no branching worth mocking. Exercised by Task 3 live verification. Matches repo convention (`extract.ts`/`embed.ts` have none).

Create `apps/web/app/api/mobile/chat/_chat/complete.ts`:

```ts
// GPT-5 via Azure OpenAI v1 API. Isolated so the chat model is swappable in one file.
// v1 API (VERIFIED): POST {endpoint}/chat/completions, body { model: deployment, messages },
// header api-key; NO api-version. Do NOT send temperature/max_tokens — the gpt-5 deployment
// only accepts default temperature; defaults produce good answers.
// The prompt constrains the model to answer from the provided note chunks.
export async function chatComplete(
  question: string,
  chunks: { content: string }[],
): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  if (!endpoint || !key || !deployment) throw new Error('chat_failed')

  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
  const system =
    'You are Nuru, a study assistant. Answer the student\'s question using ONLY the ' +
    'note excerpts provided below. If the notes do not contain the answer, say so plainly ' +
    'and do not invent facts. Be concise and clear.\n\nNOTES:\n' +
    (context || '(no relevant notes found)')

  const url = `${endpoint.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: deployment,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
    }),
  })

  if (!res.ok) {
    console.error('[nuru chat]', res.status, await res.text().catch(() => ''))
    throw new Error('chat_failed')
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const answer = json.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('chat_failed')
  return answer
}
```

- [ ] **Step 2: Type-check compiles**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i 'complete.ts' || echo "no complete.ts type errors"`
Expected: `no complete.ts type errors`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/mobile/chat/_chat/complete.ts
git commit -m "feat(nuru): chatComplete() — GPT-5 via Azure v1 (answer-from-notes prompt)"
```

---

### Task 3: `POST` + `GET /api/mobile/chat` — RAG + history

**Files:**
- Create: `apps/web/app/api/mobile/chat/route.ts`

**Interfaces:**
- Consumes: `requireMobileUser` (`../_lib`), `createClient` (`@mcloud/db/server`), `embed` (`../notes/_ingest/embed`), `chatComplete` (`./_chat/complete`), RPC `match_nuru_chunks(p_user_id text, p_query_embedding vector, p_match_count int) → { note_id, content, similarity }[]`.
- Produces:
  - `POST` — JSON body `{ text: string, contextNoteIds?: string[] }` → `201 { message: { id, role:'assistant', text, contextNoteIds, createdAt } }`.
  - `GET` → `200 { messages: Message[] }` ordered oldest→newest.
  - Message shape (camelCase) consumed by the client mapper in Task 6.

- [ ] **Step 1: Write the route handler**

> Verified end-to-end via live curl (Step 3), not a unit test — pure I/O orchestration over auth + Supabase RPC + Azure, no isolated branching a mock would meaningfully cover.

Create `apps/web/app/api/mobile/chat/route.ts`:

```ts
// /api/mobile/chat — RAG chat over the student's notes + the approved community pool.
// POST { text, contextNoteIds? }: embed question → match_nuru_chunks (me OR approved)
//   → GPT-5 → persist user+assistant rows → return assistant message.
// GET: the student's chat history (own user_id only).
// Auth: mobile bearer; every query scoped to auth.user.id.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../_lib'
import { embed } from '../notes/_ingest/embed'
import { chatComplete } from './_chat/complete'

type ChatRow = {
    id: string
    role: 'user' | 'assistant'
    text: string
    context_note_ids: string[]
    created_at: string
}

function toMessage(row: ChatRow) {
    return {
        id: row.id,
        role: row.role,
        text: row.text,
        contextNoteIds: row.context_note_ids ?? [],
        createdAt: row.created_at,
    }
}

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('nuru_chat_messages')
        .select('id, role, text, context_note_ids, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
    if (error) {
        console.error('[nuru chat history]', error.message)
        return NextResponse.json({ error: 'Could not load history' }, { status: 500 })
    }
    return NextResponse.json({ messages: (data as ChatRow[]).map(toMessage) })
}

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id

    let body: { text?: string; contextNoteIds?: string[] }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
    }
    const text = (body.text ?? '').trim()
    if (!text) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

    const supabase = await createClient()

    // 1. Embed the question.
    let queryVec: number[]
    try {
        ;[queryVec] = await embed([text])
    } catch {
        return NextResponse.json({ error: 'Could not process question' }, { status: 422 })
    }

    // 2. Retrieve chunks — "my notes OR approved" is enforced inside the RPC.
    const { data: matches, error: matchErr } = await supabase.rpc('match_nuru_chunks', {
        p_user_id: userId,
        p_query_embedding: JSON.stringify(queryVec), // pgvector accepts the JSON array text form
        p_match_count: 8,
    })
    if (matchErr) {
        console.error('[nuru chat match]', matchErr.message)
        return NextResponse.json({ error: 'Could not search notes' }, { status: 500 })
    }
    const chunks = (matches ?? []) as { note_id: string; content: string; similarity: number }[]
    const noteIds = [...new Set(chunks.map((c) => c.note_id))]

    // 3. Answer with GPT-5.
    let answer: string
    try {
        answer = await chatComplete(text, chunks)
    } catch {
        return NextResponse.json({ error: 'The assistant is unavailable' }, { status: 502 })
    }

    // 4. Persist user + assistant rows.
    const { error: insErr } = await supabase.from('nuru_chat_messages').insert([
        { user_id: userId, role: 'user', text, context_note_ids: [] },
        { user_id: userId, role: 'assistant', text: answer, context_note_ids: noteIds },
    ])
    if (insErr) {
        console.error('[nuru chat insert]', insErr.message)
        // Non-fatal for the reply, but surface it.
        return NextResponse.json({ error: 'Answered but could not save history' }, { status: 500 })
    }

    // Return the assistant message (re-read to get server id/timestamp).
    const { data: saved } = await supabase
        .from('nuru_chat_messages')
        .select('id, role, text, context_note_ids, created_at')
        .eq('user_id', userId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return NextResponse.json(
        { message: saved ? toMessage(saved as ChatRow) : { id: '', role: 'assistant', text: answer, contextNoteIds: noteIds, createdAt: new Date().toISOString() } },
        { status: 201 },
    )
}
```

- [ ] **Step 2: Type-check compiles**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE 'chat/route.ts|_chat' || echo "no chat route type errors"`
Expected: `no chat route type errors`. (If the Supabase typed client errors on the `.rpc('match_nuru_chunks', …)` name because types were regenerated without it, confirm Slice 1's typegen ran; the RPC exists in the DB. A `as never` cast on the args object is acceptable only if the generated types lack the RPC — note it in the commit.)

- [ ] **Step 3: Live end-to-end verification**

Prereq: a text note exists for your user (Slice 1's `POST /notes`, or upload one via the app). Start web: `cd apps/web && npm run dev`. Get a mobile bearer token (from the nuru app login). Then:

```bash
TOKEN="<mobile bearer token>"
# Ask about content that IS in your notes:
curl -sS -X POST http://localhost:3000/api/mobile/chat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"text":"What happens in the light reactions?"}'
```
Expected: `201` with `{ "message": { "role":"assistant", "text":"...from the notes...", "contextNoteIds":["..."] } }` — the answer references note content, and `contextNoteIds` is non-empty.

```bash
curl -sS http://localhost:3000/api/mobile/chat -H "Authorization: Bearer $TOKEN"
```
Expected: `200 { "messages": [ {user...}, {assistant...} ] }` in chronological order.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/mobile/chat/route.ts
git commit -m "feat(nuru): POST/GET /api/mobile/chat — RAG retrieval + GPT-5 + history"
```

---

### Task 4: `GET /api/mobile/notes` — list the student's own notes

**Files:**
- Modify: `apps/web/app/api/mobile/notes/route.ts` (add `GET` alongside existing `POST`)

**Interfaces:**
- Consumes: `requireMobileUser`, `createClient`.
- Produces: `GET` → `200 { notes: NoteRow[] }` where `NoteRow = { id, title, subject, source, original_content, file_url, status, created_at }`, own notes only, newest first. Consumed by the client mapper (Task 6).

- [ ] **Step 1: Add the GET handler**

At the top of `apps/web/app/api/mobile/notes/route.ts`, the imports already include `NextResponse`, `NextRequest`, `createClient`, `requireMobileUser` (from the existing POST). Add this exported function (place it above `export async function POST`):

```ts
export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('nuru_notes')
        .select('id, title, subject, source, original_content, file_url, status, created_at')
        .eq('uploader_id', userId)
        .order('created_at', { ascending: false })
    if (error) {
        console.error('[nuru notes list]', error.message)
        return NextResponse.json({ error: 'Could not load notes' }, { status: 500 })
    }
    return NextResponse.json({ notes: data ?? [] })
}
```

- [ ] **Step 2: Type-check compiles**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i 'notes/route.ts' || echo "no notes route type errors"`
Expected: `no notes route type errors`.

- [ ] **Step 3: Live verify**

With web running + token:
```bash
curl -sS http://localhost:3000/api/mobile/notes -H "Authorization: Bearer $TOKEN"
```
Expected: `200 { "notes": [ { "id":"...", "status":"pending", ... } ] }` — only your notes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/mobile/notes/route.ts
git commit -m "feat(nuru): GET /api/mobile/notes — list the student's own notes"
```

---

### Task 5: `GET /api/mobile/notes/[id]` — one note + signed URL

**Files:**
- Create: `apps/web/app/api/mobile/notes/[id]/route.ts`

**Interfaces:**
- Consumes: `requireMobileUser`, `createClient`.
- Produces: `GET` → `200 { note: NoteRow & { signedUrl: string | null } }`, scoped to owner; `404` if not found/not owned. `signedUrl` present when `file_url` is set (1 h TTL).

- [ ] **Step 1: Write the handler**

Create `apps/web/app/api/mobile/notes/[id]/route.ts`:

```ts
// GET /api/mobile/notes/[id] — one note (owner only) + a signed URL for the private original.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../../_lib'

const SIGNED_URL_TTL = 60 * 60 // 1 hour

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id
    const { id } = await params

    const supabase = await createClient()
    const { data: note, error } = await supabase
        .from('nuru_notes')
        .select('id, title, subject, source, original_content, file_url, status, created_at')
        .eq('id', id)
        .eq('uploader_id', userId)
        .single()
    if (error || !note) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let signedUrl: string | null = null
    if (note.file_url) {
        const { data: signed } = await supabase.storage
            .from('nuru-notes')
            .createSignedUrl(note.file_url, SIGNED_URL_TTL)
        signedUrl = signed?.signedUrl ?? null
    }

    return NextResponse.json({ note: { ...note, signedUrl } })
}
```

> `params` is a Promise in this Next.js version — match the pattern used by existing `[slug]` routes (`apps/web/app/api/mobile/stores/[slug]/hub/route.ts`). If those routes destructure `params` synchronously instead, follow whichever they use — check one before writing.

- [ ] **Step 2: Confirm the params style matches sibling routes**

Run: `grep -n "params" apps/web/app/api/mobile/stores/\[slug\]/hub/route.ts | head -3`
If they use `Promise<{ slug: string }>` + `await params` → keep as written. If synchronous (`{ params }: { params: { slug: string } }`) → change the handler signature to match (drop the `Promise<>` and `await`).

- [ ] **Step 3: Type-check compiles**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i 'notes/\[id\]' || echo "no note-detail type errors"`
Expected: `no note-detail type errors`.

- [ ] **Step 4: Live verify**

```bash
# Use a real note id from the Task 4 list response:
curl -sS http://localhost:3000/api/mobile/notes/<NOTE_ID> -H "Authorization: Bearer $TOKEN"
```
Expected: `200 { "note": { "id":"<NOTE_ID>", "signedUrl": null_or_url, ... } }`. A random uuid → `404`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/mobile/notes/\[id\]/route.ts
git commit -m "feat(nuru): GET /api/mobile/notes/[id] — one note + signed original URL"
```

---

### Task 6: Client types + pure snake→camel mappers (TDD)

**Files:**
- Modify: `apps/nuru/types/index.ts`
- Create: `apps/nuru/services/_map.ts`
- Test: `apps/nuru/services/_map.test.ts`

**Interfaces:**
- Produces:
  - `Note` type gains `status: 'pending' | 'approved' | 'rejected'` and `fileUrl: string | null`.
  - `NoteRow` = API row shape (snake_case) from Tasks 4/5.
  - `MessageRow` = API row shape from Task 3 (already camelCase from the endpoint — see note).
  - `export function mapNote(row: NoteRow): Note`
  - `export function mapMessage(m: Message): Message` (identity/normalize — the chat endpoint already returns camelCase; mapper guards defaults).
- Consumed by Tasks 7 (services).

> **Note:** The chat endpoint (Task 3) already returns camelCase `message`/`messages`, so `mapMessage` mostly normalizes (`contextNoteIds ?? []`). The notes endpoints return snake_case rows, so `mapNote` does the real conversion. Keeping both behind `_map.ts` gives one boundary for shape changes.

- [ ] **Step 1: Inspect the current `Note`/`Message` types**

Run: `cat apps/nuru/types/index.ts`
Confirm existing fields (expected: `Note { id, title, subject, content, source, createdAt }`, `Message { id, role, text, contextNoteIds, createdAt }`, `NoteSource`). The steps below assume these; adjust field names to whatever is actually there.

- [ ] **Step 2: Extend the types**

In `apps/nuru/types/index.ts`, update `Note` and add the API row types (keep `NoteSource`/`Message` as-is):

```ts
export type Note = {
  id: string;
  title: string;
  subject: string;
  content: string;
  source: NoteSource;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  fileUrl: string | null;
};

// Raw API row shapes (snake_case) — mapped to app types in services/_map.ts.
export type NoteRow = {
  id: string;
  title: string | null;
  subject: string | null;
  source: NoteSource;
  original_content: string | null;
  file_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
```

- [ ] **Step 3: Write the failing mapper test**

Create `apps/nuru/services/_map.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapNote } from './_map.ts'

test('mapNote converts snake_case row to camelCase Note with defaults', () => {
  const note = mapNote({
    id: 'n1', title: 'Bio', subject: 'Biology', source: 'text',
    original_content: 'photosynthesis', file_url: null,
    status: 'pending', created_at: '2026-07-03T00:00:00.000Z',
  })
  assert.equal(note.content, 'photosynthesis')
  assert.equal(note.fileUrl, null)
  assert.equal(note.createdAt, '2026-07-03T00:00:00.000Z')
  assert.equal(note.status, 'pending')
})

test('mapNote fills null title/subject/content with safe strings', () => {
  const note = mapNote({
    id: 'n2', title: null, subject: null, source: 'file',
    original_content: null, file_url: 'u/1.pdf',
    status: 'approved', created_at: '2026-07-03T00:00:00.000Z',
  })
  assert.equal(note.title, 'Untitled note')
  assert.equal(note.subject, 'General')
  assert.equal(note.content, '')
  assert.equal(note.fileUrl, 'u/1.pdf')
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd apps/nuru && node --test services/_map.test.ts`
Expected: FAIL — `Cannot find module './_map.ts'`.

- [ ] **Step 5: Write the mapper**

Create `apps/nuru/services/_map.ts`:

```ts
// Pure mappers between raw API rows (snake_case) and app types (camelCase).
// The single boundary where API shape meets UI types — no I/O, unit-tested.
import { Note, NoteRow, Message } from '@/types';

export function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title || 'Untitled note',
    subject: row.subject || 'General',
    content: row.original_content ?? '',
    source: row.source,
    createdAt: row.created_at,
    status: row.status,
    fileUrl: row.file_url,
  };
}

export function mapMessage(m: Message): Message {
  return {
    id: m.id,
    role: m.role,
    text: m.text,
    contextNoteIds: m.contextNoteIds ?? [],
    createdAt: m.createdAt,
  };
}
```

> `@/types` alias must resolve under `node --test`. If it does not (no path mapping in plain node), change the test + `_map.ts` imports to a relative `../types` for the test run, OR run via the app's configured test command. Simplest: import types relatively in `_map.ts` is NOT needed at runtime (types are erased), but the **test** imports `_map.ts` which imports `@/types` only as types — with `--experimental-strip-types`/tsx the type import is erased. If `node --test` cannot parse TS path aliases, run: `cd apps/nuru && npx tsx --test services/_map.test.ts`. Pick whichever runs green and record it in the commit.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/nuru && node --test services/_map.test.ts` (or `npx tsx --test services/_map.test.ts`)
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/nuru/types/index.ts apps/nuru/services/_map.ts apps/nuru/services/_map.test.ts
git commit -m "feat(nuru): Note status/fileUrl fields + pure API-row mappers (TDD)"
```

---

### Task 7: Rewrite `notes.ts` + `chat.ts` as auth-threaded factories

**Files:**
- Rewrite: `apps/nuru/services/notes.ts`
- Rewrite: `apps/nuru/services/chat.ts`
- Create: `apps/nuru/hooks/useApi.ts`

**Interfaces:**
- Consumes: `authedFetch` from `useAuth()`; `mapNote`/`mapMessage` (Task 6); endpoints from Tasks 3–5.
- Produces:
  - `export function createNotesApi(authedFetch: AuthedFetch)` → `{ list(): Promise<Note[]>; get(id: string): Promise<Note | null>; create(input): Promise<Note> }`.
  - `export function createChatApi(authedFetch: AuthedFetch)` → `{ history(): Promise<Message[]>; send(text: string, contextNoteIds: string[]): Promise<Message> }`.
  - `export function useApi()` → `{ notes, chat }`.
  - `create` input: `{ title: string; subject: string; source: NoteSource; content?: string; file?: { uri: string; name: string; type: string } }`.
- Consumed by: `AddNoteSheet` (Task 8) and existing screens (Task 9).

- [ ] **Step 1: Define the `AuthedFetch` type + rewrite `notes.ts`**

Replace `apps/nuru/services/notes.ts` entirely:

```ts
import { Note, NoteRow, NoteSource } from '@/types';
import { mapNote } from './_map';
import { File as ExpoFile } from 'expo-file-system';

export type AuthedFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type CreateNoteInput = {
  title: string;
  subject: string;
  source: NoteSource;
  content?: string;
  file?: { uri: string; name: string; type: string };
};

export function createNotesApi(authedFetch: AuthedFetch) {
  return {
    async list(): Promise<Note[]> {
      const res = await authedFetch('/api/mobile/notes');
      if (!res.ok) throw new Error('Could not load notes');
      const { notes } = (await res.json()) as { notes: NoteRow[] };
      return notes.map(mapNote);
    },

    async get(id: string): Promise<Note | null> {
      const res = await authedFetch(`/api/mobile/notes/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Could not load note');
      const { note } = (await res.json()) as { note: NoteRow };
      return mapNote(note);
    },

    async create(input: CreateNoteInput): Promise<Note> {
      const form = new FormData();
      form.append('source', input.source);
      if (input.title) form.append('title', input.title);
      if (input.subject) form.append('subject', input.subject);

      if (input.source === 'text') {
        form.append('text', input.content ?? '');
      } else if (input.file) {
        // Expo fetch multipart requires an ExpoFile blob, NOT the RN {uri,name,type} part.
        const file = new ExpoFile(input.file.uri);
        form.append('file', file as unknown as Blob, input.file.name);
      }

      const res = await authedFetch('/api/mobile/notes', { method: 'POST', body: form });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error((msg as { error?: string }).error ?? 'Upload failed');
      }
      const { note } = (await res.json()) as { note: NoteRow };
      return mapNote(note);
    },
  };
}
```

- [ ] **Step 2: Rewrite `chat.ts`**

Replace `apps/nuru/services/chat.ts` entirely:

```ts
import { Message } from '@/types';
import { mapMessage } from './_map';
import type { AuthedFetch } from './notes';

export function createChatApi(authedFetch: AuthedFetch) {
  return {
    async history(): Promise<Message[]> {
      const res = await authedFetch('/api/mobile/chat');
      if (!res.ok) throw new Error('Could not load chat');
      const { messages } = (await res.json()) as { messages: Message[] };
      return messages.map(mapMessage);
    },

    async send(text: string, contextNoteIds: string[]): Promise<Message> {
      const res = await authedFetch('/api/mobile/chat', {
        method: 'POST',
        body: JSON.stringify({ text, contextNoteIds }),
      });
      if (!res.ok) throw new Error('Could not send message');
      const { message } = (await res.json()) as { message: Message };
      return mapMessage(message);
    },
  };
}
```

- [ ] **Step 3: Create the `useApi` hook**

Create `apps/nuru/hooks/useApi.ts`:

```ts
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createNotesApi } from '@/services/notes';
import { createChatApi } from '@/services/chat';

// Threads the auth-scoped fetch into the API service factories.
export function useApi() {
  const { authedFetch } = useAuth();
  return useMemo(
    () => ({ notes: createNotesApi(authedFetch), chat: createChatApi(authedFetch) }),
    [authedFetch],
  );
}
```

> Confirm `useAuth` is exported from `@/context/AuthContext` (it is used elsewhere per the auth scaffold). If the hook lives at a different path, fix the import.

- [ ] **Step 4: Type-check compiles**

Run: `cd apps/nuru && npx tsc --noEmit 2>&1 | grep -iE 'services/(notes|chat).ts|useApi' || echo "no service type errors"`
Expected: `no service type errors`. (Call sites still importing the old `notes`/`chat` singletons will error — those are fixed in Tasks 8–9. Ignore errors outside these three files for now.)

- [ ] **Step 5: Commit**

```bash
git add apps/nuru/services/notes.ts apps/nuru/services/chat.ts apps/nuru/hooks/useApi.ts
git commit -m "feat(nuru): real notes/chat API factories + useApi() (auth-threaded)"
```

---

### Task 8: Native pickers in `AddNoteSheet`

**Files:**
- Modify: `apps/nuru/package.json` (add deps)
- Modify: `apps/nuru/components/AddNoteSheet.tsx`

**Interfaces:**
- Consumes: `useApi()` (Task 7), `expo-document-picker`, `expo-image-picker`.
- Produces: file + photo buttons open real pickers and upload; voice button disabled.

- [ ] **Step 1: Install the Expo deps (versioned)**

Run: `cd apps/nuru && npx expo install expo-document-picker expo-image-picker expo-file-system`
(`expo install` picks the SDK-57-correct versions — do NOT `npm install` bare. `expo-file-system` may already be present from the auth scaffold; `expo install` is idempotent.)
Expected: three deps added/aligned in `package.json`.

- [ ] **Step 2: Rewrite `AddNoteSheet` to use real pickers + `useApi`**

In `apps/nuru/components/AddNoteSheet.tsx`:

Change the imports at the top — replace `import { notes } from '@/services/notes';` with:

```ts
import { useApi } from '@/hooks/useApi';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
```

Inside the component, add near the other hooks (after `const [error, setError] = useState...`):

```ts
  const { notes } = useApi();
```

Replace `createStubbed` and the `placeholderContent` map entirely with real picker handlers:

```ts
  async function pickFile() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await upload('file', {
      uri: asset.uri,
      name: asset.name ?? 'document',
      type: asset.mimeType ?? 'application/octet-stream',
    });
  }

  async function pickPhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('Photo access is needed to import an image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
    await upload('photo', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' });
  }

  async function upload(source: 'file' | 'photo', file: { uri: string; name: string; type: string }) {
    setBusy(true); setError(null);
    try {
      const note = await notes.create({ title, subject, source, file });
      onCreated(note); reset();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
```

Update `createText` to the new `create` signature (`content` field, no `maybeError`):

```ts
  async function createText() {
    setBusy(true); setError(null);
    try {
      const note = await notes.create({ title, subject, source: 'text', content });
      onCreated(note); reset();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
```

Update the three method buttons' `onPress`:
- File button: `onPress={pickFile}`
- Photo button: `onPress={pickPhoto}`
- Voice button: make it disabled + relabel:

```tsx
              <Pressable style={[styles.option, { opacity: 0.4 }]} disabled>
                <Text style={styles.optionText}>🎙️  Record voice — coming soon</Text>
              </Pressable>
```

- [ ] **Step 3: Type-check compiles**

Run: `cd apps/nuru && npx tsc --noEmit 2>&1 | grep -i 'AddNoteSheet' || echo "no AddNoteSheet type errors"`
Expected: `no AddNoteSheet type errors`.

- [ ] **Step 4: Commit**

```bash
git add apps/nuru/package.json apps/nuru/package-lock.json apps/nuru/components/AddNoteSheet.tsx
git commit -m "feat(nuru): real document/image pickers in AddNoteSheet; voice disabled"
```

---

### Task 9: Migrate remaining call sites to `useApi()`

**Files:**
- Modify: every screen still importing the `notes`/`chat` singletons (candidates: `app/(tabs)/notes.tsx`, `app/(tabs)/index.tsx`, `app/note/[id].tsx`, plus any chat screen).

**Interfaces:**
- Consumes: `useApi()`.
- Produces: no more imports of a bare `notes`/`chat` object; all calls go through the hook.

- [ ] **Step 1: Find all call sites**

Run: `grep -rn "from '@/services/notes'\|from '@/services/chat'\|notes\.\(list\|get\|create\)\|chat\.\(history\|send\)" apps/nuru/app apps/nuru/components`
This lists every file to migrate (AddNoteSheet already done in Task 8).

- [ ] **Step 2: Migrate each file**

For each file found, apply this pattern:
- Remove `import { notes } from '@/services/notes';` / `import { chat } from '@/services/chat';`.
- Add `import { useApi } from '@/hooks/useApi';`.
- Inside the component, add `const { notes, chat } = useApi();` (only the ones it uses).
- Leave the actual `.list()/.get()/.create()/.history()/.send()` calls unchanged — signatures are identical, except any old `notes.create({ ..., content })` for text now still passes `content` (compatible), and any file/photo path is only in AddNoteSheet.

> Do NOT call `useApi()` outside a component/hook body. If a call site is a non-hook module-level helper, lift the call into the component and pass the result down.

- [ ] **Step 3: Full type-check is clean**

Run: `cd apps/nuru && npx tsc --noEmit 2>&1 | tail -20`
Expected: no errors referencing `@/services/notes`, `@/services/chat`, or missing `notes`/`chat`. Fix any stragglers.

- [ ] **Step 4: Commit**

```bash
git add apps/nuru/app apps/nuru/components
git commit -m "refactor(nuru): route all screens through useApi() (real backend)"
```

---

### Task 10: End-to-end verification on device/simulator

**Files:** none (verification only).

- [ ] **Step 1: Start backend + app**

- Web: `cd apps/web && npm run dev`.
- App: `cd apps/nuru && npx expo start`. Confirm `config.apiBaseUrl` points at the running web host (LAN IP for a physical device, `localhost` for simulator). Log in with a magic code.

- [ ] **Step 2: Upload a photo note (the highest-risk path)**

In the app: Add note → Import from photo → pick a photo of some handwritten/printed text → save.
Expected: no "Unsupported FormDataPart" error; the note appears in the list with `status: pending`. Confirm server-side:
```sql
select n.title, n.source, count(c.id) chunks
from nuru_notes n left join nuru_note_chunks c on c.note_id = n.id
where n.source = 'photo' group by n.id order by n.created_at desc limit 1;
```
Expected: `chunks >= 1` (OCR + embed ran).

- [ ] **Step 3: Chat against the uploaded note**

Ask a question answerable from that note's content.
Expected: the assistant answer reflects the note; reopening chat shows persisted history (`GET /chat`).

- [ ] **Step 4: Upload a PDF via file picker**

Add note → Upload a file → pick a PDF → save. Expected: same success path (`source: file`, chunks land).

- [ ] **Step 5: Confirm scoping**

With a second test user (or by checking the query), confirm a user's `GET /notes` returns only their own notes, and chat retrieval only surfaces their notes + `approved` ones. (Flip one note to `approved` via SQL and confirm it becomes reachable in another user's chat — the community-share path.)

- [ ] **Step 6: Final commit / branch status**

No code change expected. If verification surfaced fixes, commit them referencing the task they belong to. Then the slice is complete — `feat/nuru-app` now runs end-to-end.

---

## Self-Review

**1. Spec coverage:**
- `POST /chat` (embed → match RPC → GPT-5 → persist) → Task 3 ✅
- `GET /chat` history → Task 3 ✅
- `GET /notes` (own) → Task 4 ✅
- `GET /notes/[id]` + signed URL → Task 5 ✅
- `chatComplete` isolated GPT-5 unit → Task 2 ✅
- Azure URL-shape blocker → **resolved empirically (v1 shape verified live)**; `embed` fixed Task 1, `chatComplete` uses same shape Task 2 ✅
- Swap `notes.ts`/`chat.ts` mocks → factories → Task 7 ✅
- `useApi()` auth threading (approach A) → Task 7 ✅
- snake→camel mappers, isolated + unit-tested → Task 6 ✅
- `Note` gains `status`/`fileUrl` → Task 6 ✅
- Native deps (document/image/file-system) one pass → Task 8 ✅
- Real file + photo pickers in `AddNoteSheet`, voice disabled → Task 8 ✅
- ExpoFile multipart pattern → Task 7 `create` + Task 8 ✅
- Migrate call sites → Task 9 ✅
- End-to-end device verification (photo→ingest→chat, scoping) → Task 10 ✅
- Out of scope (camera, voice, admin dashboard, EAS build) → not planned ✅

**2. Placeholder scan:** No TBD/TODO. Every code step carries full code. The one open question (Next.js `params` sync-vs-Promise) is resolved by an explicit inspect step (Task 5 Step 2), not left vague. The `@/types` alias under `node --test` risk is handled with a concrete fallback (`npx tsx --test`) in Task 6.

**3. Type consistency:**
- `embed(texts: string[]): Promise<number[][]>` — signature unchanged across Task 1 (def) and Task 3 (use) ✅
- `chatComplete(question, chunks: {content}[]) : Promise<string>` — Task 2 def, Task 3 use ✅
- `NoteRow` fields (`original_content`, `file_url`, `created_at`, `status`) identical across Tasks 4/5 (API) and Task 6 (`mapNote`) ✅
- `mapNote`/`mapMessage` — Task 6 def, Task 7 use ✅
- `AuthedFetch` type defined in `notes.ts` (Task 7 Step 1), imported by `chat.ts` (Step 2) and `useApi` ✅
- `createNotesApi`/`createChatApi`/`useApi` names consistent Tasks 7→8→9 ✅
- `CreateNoteInput` (`content?`, `file?`) — Task 7 def, Task 8 use (`create({..., file})` / `create({..., content})`) ✅
- Chat endpoint returns camelCase `message`/`messages`; `mapMessage` normalizes — Task 3 ↔ Task 6/7 consistent ✅

**Note on TDD:** Only pure logic gets step-per-test TDD — `chunk` (Slice 1) and the `mapNote`/`mapMessage` mappers (Task 6). Vendor I/O (`embed`, `chatComplete`) and the route orchestration are verified by live curl + device runs, matching this repo's documented convention (no mock-only vendor tests). Deliberate, stated deviation.
