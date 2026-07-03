# Nuru Vertical Slice — Chat + Notes-Read Endpoints + App Wiring + Native Pickers

**Date:** 2026-07-03
**Status:** Approved (design), pending implementation plan
**Repo:** mcloud-1 — backend in `apps/web`, app in `apps/nuru`, branch `feat/nuru-app`
**Predecessor:** `2026-07-03-nuru-knowledge-base-rag-design.md` (master RAG design) — this covers its **slices 2 + 3 + 4** as one vertical slice.

## Problem

Slice 1 (schema + ingestion, `POST /api/mobile/notes`) is done on `feat/nuru-app`. But
the app is still unusable end-to-end: `apps/nuru/services/notes.ts` and `services/chat.ts`
are in-memory mocks, and there are no chat or notes-read endpoints to wire to. The native
capture surface (document/image pickers) isn't installed, so a student can't actually upload
a real note or chat with it.

This slice makes the app work **end-to-end**: build the missing backend endpoints (chat +
notes-read), swap both mock services for real API calls, and wire the native pickers into the
existing `AddNoteSheet`. Result: upload a real note (text/file/photo) → chat with GPT-5 that
answers **from that note** (RAG).

## Scope

**In:** `POST/GET /api/mobile/chat`, `GET /api/mobile/notes`, `GET /api/mobile/notes/[id]`;
`chatComplete` (GPT-5) isolated vendor function; swap `services/notes.ts` + `services/chat.ts`
to real `authedFetch` calls; `expo-document-picker` + `expo-image-picker` + `expo-file-system`
wired into `AddNoteSheet` (file + photo); `Note` type gains `status` + `fileUrl`.

**Out (deferred, per master spec):** `expo-camera`, voice/transcription (voice button stays a
disabled "coming soon"); admin review dashboard (approve via SQL); EAS build config (master
slice 5).

## Prerequisite state (verified 2026-07-03)

- `POST /api/mobile/notes` exists (ingestion pipeline); `embed.ts`, `extract.ts`, `chunk.ts`
  exist under `app/api/mobile/notes/_ingest/`.
- **No** `chat` route; **no** `GET` on the notes route; `services/*.ts` still mocked.
- **Azure blocker RESOLVED in `.env.local`:** `AZURE_OPENAI_ENDPOINT=https://nuru-ai-project-resource.openai.azure.com/openai/v1`
  (the newer **`/openai/v1`** shape), `AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5`,
  `AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large`, `AZURE_OPENAI_API_VERSION=2025-08-07`.
  > **⚠️ URL-shape mismatch to resolve at plan time:** Slice 1's `embed.ts` builds the URL as
  > `{endpoint}/openai/deployments/{deployment}/embeddings?api-version=…` — the *classic* Azure
  > OpenAI shape. But the endpoint in `.env.local` already ends in `/openai/v1` (the v1 API shape,
  > where the call is `{endpoint}/embeddings` with the deployment as the `model` field and **no**
  > `api-version`). These two forms are mutually exclusive. Determine which one actually returns
  > vectors and align **both** `embed` and the new `chatComplete` to it. This is a live-verify
  > step, not a guess. (It is plausible Slice 1's live verification was never run to green because
  > of this; confirm `embed` works before building chat on top of it.)
- **Client multipart gotcha ALREADY SOLVED in `apps/mobile/src/lib/api.ts`:** Expo's `fetch`
  (WinterCG `expo/fetch`) multipart serializer rejects the RN `{ uri, name, type }` file part
  ("Unsupported FormDataPart implementation") AND rejects ArrayBuffer blobs. The working pattern
  is `new ExpoFile(localUri)` appended as the blob: `form.append('file', file as unknown as Blob, filename)`.
  This slice copies that pattern verbatim. Confirms the SDK-57 `expo-file-system` API question:
  use the **new** `File` class (`import { File as ExpoFile } from 'expo-file-system'`).

## Architecture

### 1. Backend endpoints (`apps/web`, `/api/mobile/*` pattern)

Style (verbatim from `me/route.ts`): 4-space indent; `import { NextResponse, type NextRequest } from 'next/server'`;
guard `const auth = await requireMobileUser(req); if (auth instanceof NextResponse) return auth`;
DB via `const supabase = await createClient()` from `@mcloud/db/server`; scope every query by
`auth.user.id`.

**`POST /api/mobile/chat`** — RAG core:
1. `requireMobileUser` → `userId`.
2. Parse JSON `{ text: string, contextNoteIds?: string[] }`.
3. `embed([text])` → query vector (reuses `_ingest/embed.ts`).
4. `match_nuru_chunks(userId, queryVec, 8)` RPC — the **single** helper that injects
   `uploader_id = userId OR status = 'approved'`. Retrieval never bypasses it, so the shared-KB
   scoping filter can't be forgotten.
5. `chatComplete(text, chunks)` → GPT-5 via Azure — **new** isolated function.
6. Insert user row + assistant row into `nuru_chat_messages` (`context_note_ids` = the note_ids
   that were retrieved). Return the assistant message (camelCase-mapped).

**`GET /api/mobile/chat`** — history: `select … from nuru_chat_messages where user_id = userId
order by created_at asc`. Returns camelCase `Message[]`.

**`GET /api/mobile/notes`** — the student's own notes: `select … from nuru_notes where
uploader_id = userId order by created_at desc`. (Own notes only — the shared pool surfaces
through chat retrieval, not a browse list, at MVP.)

**`GET /api/mobile/notes/[id]`** — one note, scoped `uploader_id = userId`; if `file_url` set,
attach a **signed URL** (`supabase.storage.from('nuru-notes').createSignedUrl(file_url, ttl)`)
for the private original. 404 if not found / not owned.

**New isolated vendor unit** `app/api/mobile/chat/_chat/complete.ts`:
`export async function chatComplete(question: string, chunks: { content: string }[]): Promise<string>`.
Builds a system+user prompt (answer strictly from provided chunks; say so if the notes don't
cover it), calls GPT-5 via Azure, returns the answer text. One file → GPT-5 swappable in one
place, mirroring `_ingest/`. URL shape aligned with whatever `embed` proves out (see blocker).

### 2. Client wiring (`apps/nuru`)

`authedFetch(path, init)` already exists on `AuthContext` (bearer + one refresh-on-401), exposed
via `useAuth()`. Because it's a hook closure but the services are bare modules, convert the
services to **factories** and thread auth through a tiny hook:

- `services/notes.ts` → `export function createNotesApi(authedFetch)` returning `{ list, get, create }`.
- `services/chat.ts` → `export function createChatApi(authedFetch)` returning `{ history, send }`.
- New `hooks/useApi.ts` → `const { authedFetch } = useAuth(); return useMemo(() => ({ notes: createNotesApi(authedFetch), chat: createChatApi(authedFetch) }), [authedFetch])`.
- Call sites move from `import { notes } from '@/services/notes'` to `const { notes } = useApi()`.

The method **signatures stay identical** (`notes.list()/get(id)/create(input)`, `chat.history()/send(text, ids)`)
so screen logic barely changes.

**`create`** builds `multipart/form-data` (matching `POST /notes`): for text, append
`source=text` + `text`; for file/photo, append `source` + the `ExpoFile` blob (the proven
`apps/mobile` pattern). `list`/`get`/`history` are plain `authedFetch` GETs.

**Mapping (isolated, unit-tested):** a `mapNote(row)` / `mapMessage(row)` at the service boundary
converts snake_case API rows (`uploader_id`, `original_content`, `created_at`, `file_url`,
`context_note_ids`) → camelCase app types. Keeps UI types clean; the only pure logic here, so it
gets `node:test` (or the app's test runner) coverage.

**Types (`types/index.ts`):** `Note` gains `status: 'pending' | 'approved' | 'rejected'` and
`fileUrl: string | null`. `content` ← API `original_content`.

### 3. Native pickers (`AddNoteSheet`)

Install in one pass (native modules can't ship OTA): `expo-document-picker`, `expo-image-picker`,
`expo-file-system` — pinned to SDK 57 versioned docs (https://docs.expo.dev/versions/v57.0.0/).
`AddNoteSheet` already renders all four method buttons:

- **Text** → real `notes.create({ source: 'text', … })`.
- **File** → `DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] })` → `create({ source: 'file', file })`.
- **Photo** → `ImagePicker.launchImageLibraryAsync(...)` → `create({ source: 'photo', file })`.
- **Voice** → disabled "coming soon" affordance.

Upload uses `new ExpoFile(asset.uri)` as the blob part. This is the highest-risk integration
point → explicit real-device verification.

## Data flow (end-to-end demo path)

```
[Photo] AddNoteSheet → ImagePicker → ExpoFile(uri)
  → notes.create → POST /api/mobile/notes (multipart)  [Slice 1, exists]
  → ingest (store→OCR→chunk→embed) → nuru_notes(pending) + nuru_note_chunks

[Chat] ChatInputBar → chat.send(text)
  → POST /api/mobile/chat
  → embed(text) → match_nuru_chunks(me OR approved) → chatComplete(GPT-5)
  → persist 2 rows → return assistant msg  → ChatBubble renders answer from the note
```

## Security / correctness

- **Service-role bypasses RLS — app-code scoping is the only backstop.** Every read filters by
  `auth.user.id`; retrieval goes exclusively through `match_nuru_chunks` (the `me OR approved`
  filter can't be forgotten). A scoping bug on a *shared* KB leaks the whole pool.
- **Private bucket + signed URL** for note originals (never public).
- **Chat persistence + history** always `.eq('user_id', userId)`.
- `chatComplete` prompt constrains GPT-5 to answer from provided chunks (reduce hallucination),
  and to say when the notes don't cover the question.

## Isolation / units

| Unit | Responsibility | Interface | Depends on |
|---|---|---|---|
| `chat/_chat/complete.ts` | GPT-5 call | `chatComplete(q, chunks) → string` | Azure env |
| `chat/route.ts` | RAG orchestration | `POST`/`GET` | embed, match RPC, chatComplete, db |
| `notes/route.ts` GET | list own notes | `GET` | db |
| `notes/[id]/route.ts` | one note + signed url | `GET` | db, storage |
| `services/notes.ts` factory | client notes API | `createNotesApi(fetch)` | authedFetch |
| `services/chat.ts` factory | client chat API | `createChatApi(fetch)` | authedFetch |
| `services/_map.ts` | snake→camel mappers | `mapNote`, `mapMessage` | none (pure) |
| `hooks/useApi.ts` | thread auth into services | `useApi()` | useAuth |

## Testing

- Pure mappers (`mapNote`/`mapMessage`) → unit tests.
- Vendor I/O (`chatComplete`) + all routes → live curl verification (repo convention).
- **Resolve the Azure URL-shape blocker first**: verify `embed` returns a 3072-dim vector against
  the `/openai/v1` endpoint before building chat on it.
- End-to-end on device/simulator: upload a photo note → confirm chunks land → chat → confirm
  GPT-5 answers from that note.

## Open items to resolve at plan time

1. **Azure URL shape** (`/openai/v1` vs classic `deployments/…?api-version`) — align `embed` +
   `chatComplete`; live-verify `embed` first. (Highest risk.)
2. GPT-5 request params via the v1 API (max tokens / temperature field names for the `gpt-5`
   deployment) — confirm against a live call.
3. Signed-URL TTL for note originals (default 1 h).
4. `expo-image-picker` / `expo-document-picker` exact SDK-57 option shapes — pin to versioned docs.
