# Nuru Tool-Calling Retrieval + Live Status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make notes retrieval a tool the model calls only when needed (Azure native function-calling), open the prompt to general knowledge, and stream live status ("thinking / searching notes / writing") to the client over SSE. Token streaming deferred.

**Architecture:** The POST /api/mobile/chat handler becomes a streaming response. A pure tool-calling loop controller drives the Azure model, calling an injected `search` callback (embed + match_nuru_chunks, lifted into its own module) only when the model emits a `search_notes` tool call, up to a cap. Status events are emitted via an injected `emit` callback that writes SSE frames. The Expo client consumes the stream and drives the ThinkingIndicator from real events.

**Tech Stack:** Next.js 16 route handlers (`apps/web`), Azure OpenAI chat-completions (function-calling), Supabase RPC, Expo/React Native client, `node:test` for pure-function tests.

## Global Constraints

- Azure OpenAI call shape (VERIFIED, do not change): `POST {AZURE_OPENAI_ENDPOINT}/chat/completions`, header `api-key`, body `{ model: <deployment>, messages, tools?, tool_choice? }`. **NO** `api-version`, **NO** `temperature`, **NO** `max_tokens` (gpt-5 deployment rejects them). Endpoint already ends in `/openai/v1`.
- User ids are TEXT; every query scoped to `auth.user.id`; RLS off (app-code guards). Reuse `requireMobileUser` from `../_lib`.
- `match_nuru_chunks(p_user_id, p_query_embedding, p_match_count)` enforces "my notes OR approved"; embedding passed as `JSON.stringify(vec)` (3072-dim). Retrieval scope logic stays inside the RPC — do not reimplement it.
- Persisted rows unchanged: `nuru_chat_messages(user_id, session_id, role, text, context_note_ids)`. Sessions slice (session_id, auto-title, updated_at bump) must keep working — do NOT regress it.
- `sessionId` guarded by `isUuid` (from `_sessions.ts`); keep that guard.
- Tests are `node:test` + `node:assert/strict` on PURE functions (no Supabase/network mocking harness exists — inject dependencies and mock them as plain functions).
- Branch off current `main`. Commit frequently. Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Loop cap: **max 3 `search_notes` rounds, max 4 model calls total.**

---

## File Structure

**Backend (`apps/web/app/api/mobile/chat/`):**
- `_stream.ts` (new) — SSE framing helpers (encode an event → wire bytes; build the streaming Response). Pure/isolated.
- `_stream.test.ts` (new) — tests for the framing.
- `_chat/searchNotes.ts` (new) — `searchNotes(supabase, userId, query)` = embed + match_nuru_chunks, lifted from route.ts.
- `_chat/prompt.ts` (new) — notes-as-reference system prompt builder.
- `_chat/prompt.test.ts` (new) — prompt contains-tests.
- `_chat/loop.ts` (new) — the pure tool-calling loop controller (injected `callModel`, `search`, `emit`).
- `_chat/loop.test.ts` (new) — loop behavior tests (mocked model/search/emit).
- `_chat/complete.ts` (modify) — becomes the Azure `callModel` adapter (one model call incl. tools); loop logic moves to loop.ts.
- `route.ts` (modify) — POST wires it all into a streaming response.

**Client (`apps/nuru/`):**
- `services/chat.ts` (modify) — `send()` becomes a streaming consumer with `onStatus`.
- `components/ThinkingIndicator.tsx` (modify) — show a given status label instead of blind-cycling.
- `app/(tabs)/index.tsx` (modify) — hold `status` state, pass to indicator, feed `onStatus`.

---

## Task 1: SSE transport spike (de-risk before building on it)

**Files:**
- Create: `apps/web/app/api/mobile/chat/_stream.ts`
- Test: `apps/web/app/api/mobile/chat/_stream.test.ts`

**Interfaces:**
- Produces: `sseEvent(obj: unknown): string` (one wire frame); `streamingResponse(producer: (emit: (obj: unknown) => void) => Promise<void>): Response`.

- [ ] **Step 1: Write the failing test for framing**

```ts
// apps/web/app/api/mobile/chat/_stream.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sseEvent } from './_stream.ts'

test('sseEvent serializes an object as one newline-delimited JSON frame', () => {
  assert.equal(sseEvent({ type: 'status', value: 'thinking' }), '{"type":"status","value":"thinking"}\n')
})

test('sseEvent escapes newlines inside payload so frames stay one-per-line', () => {
  const frame = sseEvent({ type: 'done', message: { text: 'a\nb' } })
  // exactly one trailing newline; the inner newline is JSON-escaped, not raw
  assert.equal(frame.endsWith('}\n'), true)
  assert.equal(frame.split('\n').length, 2) // payload + trailing empty
})
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd apps/web && node --test --experimental-strip-types app/api/mobile/chat/_stream.test.ts`
Expected: FAIL — cannot find `./_stream.ts`.

- [ ] **Step 3: Implement framing + response helper**

```ts
// apps/web/app/api/mobile/chat/_stream.ts
// Newline-delimited JSON streaming (SSE-style) for the chat endpoint. One JSON
// object per line; the client splits on '\n'. JSON.stringify escapes any inner
// newlines, so frames never break across lines.
export function sseEvent(obj: unknown): string {
  return JSON.stringify(obj) + '\n'
}

/**
 * Build a streaming Response whose body is produced by `producer`, which is
 * handed an `emit` that writes one JSON frame per call. The stream closes when
 * `producer` resolves; an error inside it emits a final error frame.
 */
export function streamingResponse(
  producer: (emit: (obj: unknown) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) => controller.enqueue(encoder.encode(sseEvent(obj)))
      try {
        await producer(emit)
      } catch (e) {
        emit({ type: 'error', error: (e as Error).message || 'stream_failed' })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `cd apps/web && node --test --experimental-strip-types app/api/mobile/chat/_stream.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Live transport spike — prove streaming passes through the proxy**

Add a TEMPORARY probe route to confirm SSE reaches a client through `apps/web/proxy.ts` (which uses `NextResponse.next()` for `/api/*` — should pass through, but PROVE it). Create `apps/web/app/api/mobile/_streamprobe/route.ts`:

```ts
import { streamingResponse } from '../chat/_stream'
export async function GET() {
  return streamingResponse(async (emit) => {
    emit({ type: 'status', value: 'thinking' })
    await new Promise((r) => setTimeout(r, 300))
    emit({ type: 'status', value: 'writing' })
    emit({ type: 'done', message: { text: 'ok' } })
  })
}
```

Run the web app (`npx turbo run dev --filter=@mcloud/web -- --port 3000`), then:
```bash
curl -N -s http://localhost:3000/api/mobile/_streamprobe
```
Expected: three JSON lines arriving over ~300ms (the `writing`/`done` lines appear AFTER a visible pause — proving incremental flush, not buffered).

**If it buffers** (all three arrive at once) or errors: streaming does not pass the stack. STOP and report — the spec's fallback (buffer events, send one `done`) becomes the path, and later tasks adjust. Do NOT proceed assuming live streaming works.

- [ ] **Step 6: Delete the probe route, commit**

```bash
rm -r apps/web/app/api/mobile/_streamprobe
git add apps/web/app/api/mobile/chat/_stream.ts apps/web/app/api/mobile/chat/_stream.test.ts
git commit -m "feat(nuru): SSE streaming framing helpers (transport spike verified)"
```
Record the spike result (live vs buffered) in the commit body.

---

## Task 2: searchNotes module (lift retrieval out of route.ts)

**Files:**
- Create: `apps/web/app/api/mobile/chat/_chat/searchNotes.ts`

**Interfaces:**
- Consumes: `embed` from `../../notes/_ingest/embed`; a Supabase client.
- Produces: `searchNotes(supabase, userId, query): Promise<{ chunks: {content:string}[]; noteIds: string[] }>`.

- [ ] **Step 1: Write the module**

```ts
// apps/web/app/api/mobile/chat/_chat/searchNotes.ts
// The retrieval step, lifted from route.ts so the tool-calling loop can invoke it
// on demand (only when the model calls search_notes). Embeds the query, runs the
// "my notes OR approved" RPC, returns the chunks + the note ids actually hit.
//
// The client type is inferred from @mcloud/db/server's createClient (a typed
// SupabaseClient<Database>) rather than a bare @supabase/supabase-js import, so
// the typed .rpc('match_nuru_chunks', ...) signature is preserved.
import type { createClient } from '@mcloud/db/server'
import { embed } from '../../notes/_ingest/embed'

type DbClient = Awaited<ReturnType<typeof createClient>>

export async function searchNotes(
  supabase: DbClient,
  userId: string,
  query: string,
): Promise<{ chunks: { content: string }[]; noteIds: string[] }> {
  const [queryVec] = await embed([query])
  const { data, error } = await supabase.rpc('match_nuru_chunks', {
    p_user_id: userId,
    p_query_embedding: JSON.stringify(queryVec),
    p_match_count: 8,
  })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as { note_id: string; content: string }[]
  const noteIds = [...new Set(rows.map((r) => r.note_id))]
  return { chunks: rows.map((r) => ({ content: r.content })), noteIds }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors from this file. (route.ts still compiles; it will be rewired in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/mobile/chat/_chat/searchNotes.ts
git commit -m "feat(nuru): searchNotes retrieval module lifted from route"
```

---

## Task 3: Notes-as-reference prompt + search_notes tool schema

**Files:**
- Create: `apps/web/app/api/mobile/chat/_chat/prompt.ts`
- Test: `apps/web/app/api/mobile/chat/_chat/prompt.test.ts`

**Interfaces:**
- Produces: `buildSystemPrompt(opts?: { noteInFocus?: string }): string`; `SEARCH_NOTES_TOOL` (the Azure tool schema object).

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/app/api/mobile/chat/_chat/prompt.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSystemPrompt, SEARCH_NOTES_TOOL } from './prompt.ts'

test('system prompt tells the model it may use general knowledge (notes-as-reference)', () => {
  const p = buildSystemPrompt()
  assert.match(p, /Nuru/)
  assert.match(p, /general knowledge/i)
  assert.match(p, /search_notes/)
})

test('system prompt includes the in-focus note hint when provided', () => {
  const p = buildSystemPrompt({ noteInFocus: 'Photosynthesis' })
  assert.match(p, /Photosynthesis/)
})

test('search_notes tool is a valid function tool with a query string param', () => {
  assert.equal(SEARCH_NOTES_TOOL.type, 'function')
  assert.equal(SEARCH_NOTES_TOOL.function.name, 'search_notes')
  assert.equal(SEARCH_NOTES_TOOL.function.parameters.properties.query.type, 'string')
})
```

- [ ] **Step 2: Run, expect fail**

Run: `cd apps/web && node --test --experimental-strip-types app/api/mobile/chat/_chat/prompt.test.ts`
Expected: FAIL — cannot find `./prompt.ts`.

- [ ] **Step 3: Implement**

```ts
// apps/web/app/api/mobile/chat/_chat/prompt.ts
// Notes-as-reference system prompt + the search_notes tool schema. Notes are a
// reference the model MAY consult (via the tool) when a question is about the
// student's coursework — not a cage. General knowledge is allowed when the notes
// don't cover the question. (Guardrails are a separate later pass.)

export function buildSystemPrompt(opts?: { noteInFocus?: string }): string {
  const base =
    'You are Nuru, a warm, concise study companion for students. ' +
    'When a question is about the student’s own coursework or notes, use the ' +
    'search_notes tool to consult their notes, and prefer that material when it is ' +
    'relevant. You may also answer from your general knowledge when their notes do ' +
    'not cover the question. Do not fabricate citations to notes you did not ' +
    'retrieve. Be clear and encouraging.'
  const hint = opts?.noteInFocus
    ? ` The student is currently focused on the note titled “${opts.noteInFocus}”; ` +
      'bias your search toward it when relevant.'
    : ''
  return base + hint
}

export const SEARCH_NOTES_TOOL = {
  type: 'function',
  function: {
    name: 'search_notes',
    description:
      "Search the student's own study notes (and the approved community pool) for " +
      'passages relevant to a query. Call this only when the question is about their ' +
      'coursework/notes; skip it for greetings, small talk, or general questions you ' +
      'can answer directly.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for in the notes.' },
      },
      required: ['query'],
    },
  },
} as const
```

- [ ] **Step 4: Run, expect pass**

Run: `cd apps/web && node --test --experimental-strip-types app/api/mobile/chat/_chat/prompt.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/mobile/chat/_chat/prompt.ts apps/web/app/api/mobile/chat/_chat/prompt.test.ts
git commit -m "feat(nuru): notes-as-reference prompt + search_notes tool schema"
```

---

## Task 4: Pure tool-calling loop controller

**Files:**
- Create: `apps/web/app/api/mobile/chat/_chat/loop.ts`
- Test: `apps/web/app/api/mobile/chat/_chat/loop.test.ts`
- Modify: `apps/web/app/api/mobile/chat/_chat/complete.ts`

**Interfaces:**
- Consumes: `buildSystemPrompt`, `SEARCH_NOTES_TOOL` (Task 3).
- Produces:
  - `type ModelTurn = { toolCalls?: { id: string; query: string }[]; text?: string }`
  - `type ChatEvent = { type: 'status'; value: 'thinking'|'searching_notes'|'writing' } | { type: 'done'; ... } | { type: 'error'; error: string }`
  - `runChat(deps): Promise<{ answer: string; noteIds: string[] }>` where
    `deps = { userText, noteInFocus?, callModel, search, emit }`,
    `callModel(messages, opts:{tools:boolean}) => Promise<ModelTurn>`,
    `search(query) => Promise<{ chunks:{content:string}[]; noteIds:string[] }>`,
    `emit(value) => void`.
- `complete.ts` provides the real `callModel` (Azure adapter).

- [ ] **Step 1: Write failing tests (the heart of this feature)**

```ts
// apps/web/app/api/mobile/chat/_chat/loop.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runChat } from './loop.ts'

function harness(turns) {
  // turns: array of ModelTurn the fake model returns in order
  let i = 0
  const emitted = []
  let searches = 0
  const deps = {
    userText: 'q',
    callModel: async () => turns[i++],
    search: async (query) => { searches++; return { chunks: [{ content: 'c' }], noteIds: ['n' + searches] } },
    emit: (v) => emitted.push(v),
  }
  return { deps, emitted: () => emitted, searches: () => searches, calls: () => i }
}

test('no tool call: one model call, no retrieval, emits thinking then writing', async () => {
  const h = harness([{ text: 'hi there' }])
  const out = await runChat(h.deps)
  assert.equal(out.answer, 'hi there')
  assert.deepEqual(out.noteIds, [])
  assert.equal(h.searches(), 0)
  assert.equal(h.calls(), 1)
  assert.deepEqual(h.emitted(), ['thinking', 'writing'])
  // never emitted searching_notes
  assert.equal(h.emitted().includes('searching_notes'), false)
})

test('one search: retrieval runs once, second call answers, emits searching_notes', async () => {
  const h = harness([
    { toolCalls: [{ id: 't1', query: 'photosynthesis' }] },
    { text: 'Plants make food from light.' },
  ])
  const out = await runChat(h.deps)
  assert.equal(out.answer, 'Plants make food from light.')
  assert.deepEqual(out.noteIds, ['n1'])
  assert.equal(h.searches(), 1)
  assert.equal(h.emitted().filter((e) => e === 'searching_notes').length, 1)
})

test('cap enforced: never exceeds 3 searches / 4 model calls', async () => {
  // model keeps asking to search forever
  const always = { toolCalls: [{ id: 'x', query: 'q' }] }
  const h = harness([always, always, always, always, always])
  const out = await runChat(h.deps)
  assert.ok(h.searches() <= 3, `searches=${h.searches()}`)
  assert.ok(h.calls() <= 4, `calls=${h.calls()}`)
  assert.equal(typeof out.answer, 'string') // still produced an answer (forced final)
})

test('retrieval error: model still gets to answer (no throw)', async () => {
  const h = harness([
    { toolCalls: [{ id: 't1', query: 'q' }] },
    { text: 'From what I know, ...' },
  ])
  h.deps.search = async () => { throw new Error('match failed') }
  const out = await runChat(h.deps)
  assert.equal(out.answer, 'From what I know, ...')
  assert.deepEqual(out.noteIds, [])
})
```

- [ ] **Step 2: Run, expect fail**

Run: `cd apps/web && node --test --experimental-strip-types app/api/mobile/chat/_chat/loop.test.ts`
Expected: FAIL — cannot find `./loop.ts`.

- [ ] **Step 3: Implement the loop**

```ts
// apps/web/app/api/mobile/chat/_chat/loop.ts
// Pure tool-calling loop. Drives an injected model; when the model calls
// search_notes, runs the injected search and feeds results back, up to a cap.
// Emits status values via the injected emit. No I/O of its own — fully testable.
// (The SEARCH_NOTES_TOOL schema is consumed by complete.ts, not here — the loop
// only assembles messages and reacts to normalized ModelTurns.)
import { buildSystemPrompt } from './prompt'

export type ModelTurn = {
  toolCalls?: { id: string; query: string }[]
  text?: string
}

type Msg = Record<string, unknown>

export type RunDeps = {
  userText: string
  noteInFocus?: string
  callModel: (messages: Msg[], opts: { tools: boolean }) => Promise<ModelTurn>
  search: (query: string) => Promise<{ chunks: { content: string }[]; noteIds: string[] }>
  emit: (value: 'thinking' | 'searching_notes' | 'writing') => void
}

const MAX_SEARCHES = 3
const MAX_CALLS = 4

export async function runChat(deps: RunDeps): Promise<{ answer: string; noteIds: string[] }> {
  const { userText, noteInFocus, callModel, search, emit } = deps
  const messages: Msg[] = [
    { role: 'system', content: buildSystemPrompt(noteInFocus ? { noteInFocus } : undefined) },
    { role: 'user', content: userText },
  ]
  const noteIds = new Set<string>()
  let searches = 0
  let calls = 0

  while (true) {
    const toolsAllowed = searches < MAX_SEARCHES && calls < MAX_CALLS - 1
    emit(searches === 0 && calls === 0 ? 'thinking' : 'writing')
    const turn = await callModel(messages, { tools: toolsAllowed })
    calls++

    const wantsSearch = toolsAllowed && turn.toolCalls && turn.toolCalls.length > 0
    if (!wantsSearch) {
      // final answer (or forced text because tools were exhausted)
      if (turn.text != null) return { answer: turn.text, noteIds: [...noteIds] }
      // model returned no text and no allowed tool — force one last text-only call
      emit('writing')
      const forced = await callModel(messages, { tools: false })
      return { answer: forced.text ?? '', noteIds: [...noteIds] }
    }

    // record the assistant tool-call turn, then run each search and append results
    messages.push({ role: 'assistant', tool_calls: turn.toolCalls })
    for (const call of turn.toolCalls!) {
      emit('searching_notes')
      searches++
      let content = ''
      try {
        const { chunks, noteIds: got } = await search(call.query)
        got.forEach((id) => noteIds.add(id))
        content = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n') || '(no matching notes)'
      } catch {
        content = '(notes unavailable — answer from general knowledge)'
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content })
    }
  }
}
```

- [ ] **Step 4: Run, expect pass**

Run: `cd apps/web && node --test --experimental-strip-types app/api/mobile/chat/_chat/loop.test.ts`
Expected: PASS (4 tests). If the cap test loops, the guard is wrong — fix before moving on.

- [ ] **Step 5: Rework complete.ts into the Azure callModel adapter**

Replace `complete.ts` with an adapter that makes ONE Azure call (with or without tools) and normalizes the response into `ModelTurn`:

```ts
// apps/web/app/api/mobile/chat/_chat/complete.ts
// Azure OpenAI adapter: one chat-completions call, normalized to ModelTurn for
// the loop. v1 API (VERIFIED): POST {endpoint}/chat/completions, header api-key,
// NO api-version, NO temperature/max_tokens. Passes tools when allowed.
import { SEARCH_NOTES_TOOL } from './prompt'
import type { ModelTurn } from './loop'

export async function callModel(
  messages: Record<string, unknown>[],
  opts: { tools: boolean },
): Promise<ModelTurn> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  if (!endpoint || !key || !deployment) throw new Error('chat_failed')

  const body: Record<string, unknown> = { model: deployment, messages }
  if (opts.tools) {
    body.tools = [SEARCH_NOTES_TOOL]
    body.tool_choice = 'auto'
  }

  const res = await fetch(`${endpoint.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('[nuru chat]', res.status, await res.text().catch(() => ''))
    throw new Error('chat_failed')
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[]
  }
  const msg = json.choices?.[0]?.message
  const rawCalls = msg?.tool_calls ?? []
  const toolCalls = rawCalls
    .filter((c) => c.function?.name === 'search_notes')
    .map((c) => {
      let query = ''
      try { query = (JSON.parse(c.function.arguments) as { query?: string }).query ?? '' } catch {}
      return { id: c.id, query }
    })
  return {
    text: msg?.content ?? undefined,
    toolCalls: toolCalls.length ? toolCalls : undefined,
  }
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `cd apps/web && npx tsc --noEmit` (route.ts still imports the old `chatComplete` — expected to break; fixed in Task 5. Confirm the ONLY errors are in route.ts.)

```bash
git add apps/web/app/api/mobile/chat/_chat/loop.ts apps/web/app/api/mobile/chat/_chat/loop.test.ts apps/web/app/api/mobile/chat/_chat/complete.ts
git commit -m "feat(nuru): pure tool-calling loop + Azure callModel adapter"
```

---

## Task 5: Wire the streaming route

**Files:**
- Modify: `apps/web/app/api/mobile/chat/route.ts`

**Interfaces:**
- Consumes: `streamingResponse` (Task 1), `runChat` (Task 4), `callModel` (Task 4), `searchNotes` (Task 2), `isUuid` (`_sessions`).

- [ ] **Step 1: Rewrite the POST body assembly + persistence around a stream**

Keep the top of POST unchanged through the session-ownership check (auth, body parse, `isUuid` guard, `sess` lookup, 404). Replace the retrieval + answer + persist block (old steps 1–4 and the return) with:

```ts
import { streamingResponse } from './_stream'
import { runChat } from './_chat/loop'
import { callModel } from './_chat/complete'
import { searchNotes } from './_chat/searchNotes'
import { deriveTitle, isUuid } from './_sessions'
// (drop the old `embed` + `chatComplete` imports)

// ...unchanged: auth, body parse, text/sessionId validation, sess ownership 404...

  const noteInFocus =
    Array.isArray(body.contextNoteIds) && body.contextNoteIds.length
      ? (await supabase.from('nuru_notes').select('title').eq('id', body.contextNoteIds[0]).eq('uploader_id', userId).maybeSingle()).data?.title ?? undefined
      : undefined

  return streamingResponse(async (emit) => {
    let answer: string
    let noteIds: string[]
    try {
      const out = await runChat({
        userText: text,
        noteInFocus,
        callModel,
        search: (q) => searchNotes(supabase, userId, q),
        emit: (value) => emit({ type: 'status', value }),
      })
      answer = out.answer
      noteIds = out.noteIds
    } catch {
      emit({ type: 'error', error: 'The assistant is unavailable' })
      return
    }

    // Persist user + assistant rows (unchanged shape; sessions slice preserved).
    const { error: insErr } = await supabase.from('nuru_chat_messages').insert([
      { user_id: userId, session_id: sessionId, role: 'user', text, context_note_ids: [] },
      { user_id: userId, session_id: sessionId, role: 'assistant', text: answer, context_note_ids: noteIds },
    ])
    if (insErr) {
      console.error('[nuru chat insert]', insErr.message)
      emit({ type: 'error', error: 'Answered but could not save history' })
      return
    }

    // Auto-title on first message + bump updated_at (sessions slice — keep working).
    const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() }
    if (!sess.title) patch.title = deriveTitle(text)
    await supabase.from('nuru_chat_sessions').update(patch).eq('id', sessionId).eq('user_id', userId)

    // Re-read the saved assistant row for its server id/timestamp.
    const { data: saved } = await supabase
      .from('nuru_chat_messages')
      .select('id, role, text, context_note_ids, created_at')
      .eq('user_id', userId).eq('session_id', sessionId).eq('role', 'assistant')
      .order('created_at', { ascending: false }).limit(1).single()

    emit({
      type: 'done',
      message: saved
        ? { id: saved.id, role: 'assistant', text: saved.text, contextNoteIds: saved.context_note_ids ?? [], createdAt: saved.created_at }
        : { id: '', role: 'assistant', text: answer, contextNoteIds: noteIds, createdAt: new Date().toISOString() },
    })
  })
```

GET is unchanged.

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit 0 (route.ts now uses the new modules; old imports removed).

- [ ] **Step 3: Live smoke against the running server**

Start web (`npx turbo run dev --filter=@mcloud/web -- --port 3000`). Unauthenticated POST must still 401 (auth precedes streaming):
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/mobile/chat -H 'Content-Type: application/json' -d '{"text":"hi","sessionId":"x"}'
```
Expected: `401`. (Full authed streaming is verified on device in Task 8.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/mobile/chat/route.ts
git commit -m "feat(nuru): stream chat via tool-calling loop with live status events"
```

---

## Task 6: Client streaming consumer

**Files:**
- Modify: `apps/nuru/services/chat.ts`

**Interfaces:**
- Produces: `send(text, contextNoteIds, sessionId, opts?: { onStatus?: (s: string) => void }): Promise<Message>`.

- [ ] **Step 1: Rewrite send() to consume the stream**

```ts
// in apps/nuru/services/chat.ts — replace the send() method
    async send(
      text: string,
      contextNoteIds: string[],
      sessionId: string,
      opts?: { onStatus?: (status: string) => void },
    ): Promise<Message> {
      const res = await authedFetch('/api/mobile/chat', {
        method: 'POST',
        body: JSON.stringify({ text, contextNoteIds, sessionId }),
      });
      if (!res.ok || !res.body) throw new Error('Could not send message');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let message: Message | null = null;

      // Parse newline-delimited JSON frames as they arrive.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const evt = JSON.parse(line) as
            | { type: 'status'; value: string }
            | { type: 'done'; message: Message }
            | { type: 'error'; error: string };
          if (evt.type === 'status') opts?.onStatus?.(evt.value);
          else if (evt.type === 'done') message = mapMessage(evt.message);
          else if (evt.type === 'error') throw new Error(evt.error);
        }
        if (done) break;
      }
      if (!message) throw new Error('Could not send message');
      return message;
    },
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: FAIL only at `app/(tabs)/index.tsx` (send call site — the extra opts arg is optional so this may pass; if index.tsx passes no opts it still compiles). Confirm any error is only in index.tsx (fixed Task 7).

- [ ] **Step 3: Commit**

```bash
git add apps/nuru/services/chat.ts
git commit -m "feat(nuru): client consumes streamed chat status + final message"
```

---

## Task 7: Indicator + chat screen show live status

**Files:**
- Modify: `apps/nuru/components/ThinkingIndicator.tsx`
- Modify: `apps/nuru/app/(tabs)/index.tsx`

**Interfaces:**
- `ThinkingIndicator` accepts `status?: string` and shows a mapped label instead of blind-cycling.

- [ ] **Step 1: Map status → label in ThinkingIndicator**

Replace the blind phrase-cycling. Keep the sunburst animation + reduce-motion. New label logic:

```tsx
// apps/nuru/components/ThinkingIndicator.tsx — replace the PHRASES cycling
const LABELS: Record<string, string> = {
  thinking: 'Thinking…',
  searching_notes: 'Searching your notes…',
  writing: 'Writing…',
};

export function ThinkingIndicator({ size = 40, status }: { size?: number; status?: string }) {
  // ...keep the spin animation + reduceMotion effect exactly as-is...
  const label = (status && LABELS[status]) || 'Thinking…';
  return (
    <View style={styles.wrap} accessibilityLabel={`Nuru is ${label}`}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Logo size={size} />
      </Animated.View>
      <Text style={styles.phrase}>{label}</Text>
    </View>
  );
}
```
Remove the `PHRASES` array and the `setInterval` phrase-cycling effect (no longer blind-cycling). Keep everything else.

- [ ] **Step 2: Drive status from the send stream in index.tsx**

Add `const [status, setStatus] = useState<string | undefined>();` Update `onSend`:

```tsx
  async function onSend(text: string) {
    if (!sessionId) return;
    setSending(true);
    setStatus('thinking');
    const optimistic: Message = { id: 'tmp', role: 'user', text, contextNoteIds, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      await chat.send(text, contextNoteIds, sessionId, { onStatus: setStatus });
      setMessages(await chat.history(sessionId));
    } catch {
      setMessages((m) => m.filter((msg) => msg.id !== 'tmp'));
      setLoadError(true);
    } finally {
      setSending(false);
      setStatus(undefined);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }
```

And pass it to the indicator (find the existing `{sending && (...<ThinkingIndicator .../>...)}` block):

```tsx
      {sending && (
        <View style={styles.thinking}>
          <ThinkingIndicator size={28} status={status} />
        </View>
      )}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Verify the build exports (SDK-56 import guard)**

Run: `cd apps/nuru && npx expo export --output-dir dist-verify --platform android 2>&1 | tail -3 && rm -rf dist-verify`
Expected: `Exported`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/nuru/components/ThinkingIndicator.tsx apps/nuru/app/(tabs)/index.tsx
git commit -m "feat(nuru): show live model status (thinking/searching/writing)"
```

---

## Task 8: End-to-end device verification (controller-run)

**Files:** none.

- [ ] **Step 1: On-device E2E**

`cd apps/nuru && npm start`, sign in, then verify:
- "hi" → indicator shows "Thinking…" then "Writing…", **no** "Searching your notes…", answers fast (no retrieval).
- A general-knowledge question ("what is the capital of Kenya?") → answers **without** a search status (proves notes-as-reference: didn't need notes).
- A notes question (about content the demo user has notes on) → "Searching your notes…" appears, answer reflects the notes.
- "Chat about this note" → note is in focus; a related question searches and uses it.
- A failed send (kill network mid-send) → "Couldn't load / retry" state, optimistic bubble rolled back.
- Sessions still work: title auto-set, Recents ordering, reopen loads history (no regression).

- [ ] **Step 2: Confirm perf win**

Time a greeting vs. a notes question — the greeting should visibly return faster (one model call, no embed/RPC). Note timings.

---

## Self-Review

**Spec coverage:**
- Model-driven `search_notes` routing → Task 3 (schema) + Task 4 (loop) ✓
- Notes-as-reference prompt → Task 3 ✓
- Multi-round cap (3 searches / 4 calls) → Task 4 loop + tests ✓
- Retrieval lifted so it's called on demand → Task 2 ✓
- Graceful retrieval-failure degrade → Task 4 (test d) + loop catch ✓
- Live status events (thinking/searching_notes/writing) → Task 1 (transport) + Task 4 (emit) + Task 5 (wire) + Task 6/7 (client) ✓
- SSE transport de-risked first → Task 1 spike ✓
- Persist unchanged + sessions preserved → Task 5 (explicit) ✓
- Client stream consumer + indicator → Tasks 6, 7 ✓
- Token streaming deferred → not built; channel carries it later ✓

**Placeholder scan:** none — every code step is complete; commands have expected output.

**Type consistency:** `ModelTurn`, `RunDeps`, `runChat` signatures consistent across Task 4 (def), Task 5 (use). `callModel` returns `ModelTurn` (complete.ts) matching what `runChat` expects. `emit(value)` in loop maps to `emit({type:'status',value})` in route. Client `send(...opts)` (Task 6) matches the call site update (Task 7). Event types (`status`/`done`/`error`) consistent between `_stream` framing, route emits, and client parsing.

**Note on tests:** loop, prompt, and stream-framing are pure and unit-tested. Route-level streaming + Azure function-calling behavior are verified by the Task 1 transport spike (live) + Task 8 device E2E — consistent with this repo's pure-function-test idiom (no network/Supabase mock harness). The Azure `tool_calls` response shape in complete.ts is the one spot that must be confirmed against a real call — flagged for Task 8 (if the model never triggers a search when it should, inspect the raw Azure response shape in complete.ts).
