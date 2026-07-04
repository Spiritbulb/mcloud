# Nuru Spec 1: Tool-Calling Retrieval + Live Status — Design

**Date:** 2026-07-04
**Status:** Pre-approved by user; ready for implementation plan
**Follows:** chat sessions slice (shipped to main). **Precedes:** Spec 2 (guardrails).

## Goal

Two coupled improvements to the Nuru chat backend + client:

1. **Retrieval only when needed.** Today every message pays the notes round-trip
   (embed → `match_nuru_chunks` → GPT-5). Make retrieval a **tool the model calls
   only when it judges the question needs the student's notes**, via Azure
   OpenAI's native function-calling. Many messages (greetings, general-knowledge
   questions) then skip retrieval entirely.
2. **Notes as reference, not a cage.** The current prompt boxes the model to
   answer *only* from note excerpts. Open it up: notes are context when relevant;
   the model may also answer from general knowledge. (Web browsing is a future
   pass — the tool-calling shape set up here extends to it.)

Plus a UX catch-up so the client reflects the new variable work:

3. **Live status events.** Because a message now does 0–3 searches and may or may
   not use notes, the client must show honest activity ("Thinking…", "Searching
   your notes…", "Writing…") driven by **real server events**, not blind canned
   phrases. Delivered over a streaming (SSE) response. Token-by-token answer
   streaming is deferred to a later pass on the same channel.

## Context (current state)

- `apps/web/app/api/mobile/chat/route.ts` — POST always: embed → `match_nuru_chunks`
  → `chatComplete` → persist user+assistant rows → return one JSON blob. GET is
  session-scoped history (from the sessions slice).
- `apps/web/app/api/mobile/chat/_chat/complete.ts` — one-shot Azure OpenAI call.
  Prompt: *"answer using ONLY the note excerpts… if the notes do not contain the
  answer, say so plainly and do not invent facts."* GPT-5, no temperature.
- Retrieval RPC `match_nuru_chunks(user_id, embedding, count)` enforces
  "my notes OR approved" scope.
- Client `services/chat.ts` `send()` returns a single `Message`; chat screen shows
  a `ThinkingIndicator` that blind-cycles canned phrases while `sending`.
- Model call is via Azure OpenAI `POST {endpoint}/chat/completions` with `api-key`
  header, no `api-version`, no temperature/max_tokens (gpt-5 deployment
  constraints — see complete.ts comment).

## Architecture: the request path changes

**Old:** always embed → match → answer → return blob.

**New (streaming, tool-driven):**
1. Assemble messages with a **notes-as-reference** system prompt + a declared
   `search_notes` tool.
2. Open an SSE response. Emit `{type:'status', value:'thinking'}`.
3. Call the model. It returns **either** a final answer **or** a `search_notes`
   tool call.
4. On a tool call: emit `{type:'status', value:'searching_notes'}`, run
   `searchNotes(userId, query)` (the lifted embed + `match_nuru_chunks`), feed
   chunks back as the tool result, call the model again.
5. Loop up to **3 search rounds** (hard ceiling **4 model calls** total as a
   runaway guard). Before the final answer call, emit `{type:'status',
   value:'writing'}`.
6. Persist user + assistant rows (unchanged DB shape; sessions untouched). Emit
   `{type:'done', message:{…}}` with the same message shape returned today. On
   failure emit `{type:'error', error}`.

## SSE event protocol

Newline-delimited JSON events over `text/event-stream` (or newline-delimited JSON
if plain streaming is simpler through the proxy — decided in the plan's Task 1
transport spike):

- `{type:'status', value:'thinking'|'searching_notes'|'writing'}`
- `{type:'done', message:{ id, role, text, contextNoteIds, createdAt }}`
- `{type:'error', error:string}`

`contextNoteIds` on the persisted assistant row = the union of note_ids actually
retrieved across all tool rounds (empty if the model never searched) — preserves
the existing "scoped to these notes" UI signal.

Token streaming (`{type:'delta', text}`) is explicitly **out of scope** here;
the channel is designed to carry it later without a redesign.

## Components (small, focused, testable)

- **`_chat/prompt.ts`** (new) — the notes-as-reference system prompt as a tested
  string/builder. Content: *"You are Nuru, a study companion. Use the
  `search_notes` tool to consult the student's own notes when their question is
  about their coursework; prefer their notes when relevant. You may also answer
  from general knowledge when the notes don't cover it. Do not fabricate
  citations to notes you did not retrieve."* Takes the optional in-focus note
  hint (see below).
- **`_chat/searchNotes.ts`** (new) — `searchNotes(userId, query) → {chunks,
  noteIds}`. The current step-1/step-2 code from route.ts (embed + RPC), lifted so
  the loop calls it on demand. Owns the only Supabase/embed dependency in the
  retrieval path.
- **`_chat/complete.ts`** (reworked) — the **tool-calling loop controller**. Owns:
  message assembly, the `search_notes` tool schema, the call/loop/cap logic, and
  an injected `emit(event)` callback for status. Retrieval is injected (a
  `search` callback), so this file has **no Supabase dependency** and is fully
  unit-testable with a mocked model + mocked search + emit spy.
- **`route.ts`** (slimmed) — auth → assemble → open SSE → run the loop (injecting
  `searchNotes` + `emit` that writes SSE events) → persist → emit `done`. The
  always-embed code is gone (moved to searchNotes.ts).

## Client

- **`services/chat.ts`** — `send()` becomes a streaming consumer:
  `send(text, contextNoteIds, sessionId, { onStatus })` reads the SSE events,
  calls `onStatus(value)` on each status, and resolves with the message on `done`
  (throws on `error`/stream break). Uses `fetch` + `response.body` stream reader
  (works in Expo RN and react-native-web).
- **`ThinkingIndicator`** — stops blind-cycling; shows the **current status** it's
  given: "Thinking…", "Searching your notes…", "Writing…". Keeps the sunburst
  animation + reduce-motion support. Accepts a `status` prop mapping to a label.
- **chat screen (`index.tsx`)** — holds `status` state, updates from `onStatus`,
  clears on resolve. Optimistic user bubble unchanged; assistant message lands on
  resolve. The "Couldn't load / retry" + optimistic-rollback error handling
  (added in the session-undefined fix) covers stream breaks.

## Note-scope hint

Per-message note scoping ("Chat about this note" → `contextNoteIds`) becomes a
**hint**: when the user scoped to a note, the system prompt tells the model a
specific note is in focus so it biases toward searching. v1 does NOT force
retrieval — forcing is a later refinement.

## Error handling

- Loop hits the cap without a final answer → force one last no-tools call to get
  text (never return empty).
- Retrieval fails inside a round → feed the model a "notes unavailable" tool
  result so it answers from general knowledge (improvement over today, where a
  match failure 500s).
- Model/API failure → `{type:'error'}` (client shows retry state, rolls back
  optimistic bubble).
- SSE undeliverable through the proxy → **Task 1 transport spike verifies this
  first**; if streaming can't pass, fall back to buffering events and sending a
  final `done` (still correct, just no live status). This risk is retired before
  the loop is built on top.

## Testing

- **Pure loop tests (`node:test`, mocked model + search + emit spy):**
  (a) no tool call → one model call, `search` never invoked, events
  `thinking→writing→done`, never `searching_notes`;
  (b) one search → `search` invoked once, second call answers, emits
  `searching_notes` once;
  (c) cap enforced → never exceeds 3 searches / 4 model calls;
  (d) retrieval error → model still gets to answer (no throw).
- **Prompt builder:** contains-tests (mentions search_notes, notes-as-reference,
  the note hint when provided).
- **Manual on device:** "hi" → "Thinking…"→"Writing…", no "Searching", instant;
  a notes question → "Searching your notes…" appears; a general-knowledge
  question answers with no search.

## Explicitly deferred

- Guardrails (Spec 2 — on-topic, safety/abuse, prompt-injection).
- Token-by-token answer streaming (`delta` events on this same channel).
- Web-browse tool (future pass).
- Forcing retrieval on note-scoped chats.
- Mobile drawer session-list refetch (small pending fix, tracked separately).

## Decisions locked during brainstorming

- Routing = **model-driven `search_notes` tool** (Azure native function-calling),
  not a heuristic pre-classifier and not always-retrieve.
- Notes are **reference, not a cage** — model may use general knowledge.
- Tool loop = **multi-round, cap 3 searches / 4 model calls**.
- Status = **live SSE events** now; **token streaming deferred** to the same
  channel later (chosen to keep error surface low).
- Retrieval failure **degrades gracefully** (answer anyway) instead of 500.
