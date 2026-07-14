# Nuru Chat: token streaming + per-request provider toggle (Haiku vs GPT-5) — Design

**Date:** 2026-07-07
**Branch:** feat/nuru-chat-streaming-providers (off main @ 49eae80)
**Status:** Design — awaiting spec review before writing the implementation plan.

## Goal

Three interlocking additions to the Nuru chat backend + client:

1. **Token-by-token streaming** of the final answer, so the reply renders as it generates instead of appearing all at once.
2. **A per-request provider toggle** — the client picks `azure` (GPT-5, current default) or `anthropic` (Claude Haiku 4.5) per message, sent in the POST body.
3. **A/B visibility** — each completed answer shows which model answered and its token usage, so quality *and* cost can be compared. The provider is chosen from a compact `( model · context )` pill in the composer that opens a modal.

The A/B is a temporary/experimental capability (test Haiku over GPT-5, cost included); the design keeps both providers live behind one interface rather than hard-swapping.

## Non-goals (explicitly deferred)

- Streaming the model's *thinking*/reasoning — only the final answer streams. Tool-search phase keeps the existing status pills (`thinking`/`searching_notes`/`writing`).
- Ask-both-and-compare (fan-out to both providers in one turn) — not built; the toggle is one provider per message.
- Persisted per-user provider preference — the client remembers the last pick within a session only (resets on app restart).
- Enabling/disabling tools from the UI — the modal reserves a "Tools — coming soon" row, but no tool control ships this round.
- Building transcription — a disabled mic affordance is shown to imply it exists (mirrors the AttachMenu "Camera — coming soon" pattern); no recording/transcription is wired.

## Global constraints

- **Anthropic Messages API is NOT OpenAI-shaped.** Tool use uses content blocks: the assistant tool call is `{type:'tool_use', id, name:'search_notes', input:{query}}`, and the tool result goes back as a **user** message containing `{type:'tool_result', tool_use_id, content}`. The system prompt is the top-level `system` param, not a message. Tool schema is flat: `{name, description, input_schema}` (no `type:'function'` wrapper).
- **Anthropic model + auth:** `claude-haiku-4-5` (200K context, $1/$5 per MTok), via the official `@anthropic-ai/sdk` with a plain `ANTHROPIC_API_KEY` env var on the web server. Use `client.messages.stream(...)` for the streaming answer call and read text deltas; use `.finalMessage()` / accumulation for usage. Default `max_tokens` for the streaming answer ~4096 (chat answers are short); adaptive thinking is off (Haiku 4.5 does not support the `effort`/adaptive surface — plain messages call, no `thinking` param).
- **Azure GPT-5 stays the default.** Absent/unknown `provider` in the POST body → `'azure'`, so old clients and empty bodies keep working. The existing Azure v1 chat shape is unchanged (`POST {endpoint}/chat/completions`, header `api-key`, `{model, messages}`, no `api-version`/temperature/max_tokens).
- **Provider-neutral loop.** `loop.ts` must NOT bake either provider's wire shape into its `messages` history. It keeps neutral `{id, query}` tool-call turns; each adapter translates the full history to its own wire shape at the boundary. This moves the OpenAI-shape assembly that currently lives at `loop.ts:65` (the fix from commit 9b490ce) *into* the Azure adapter, and the Anthropic adapter does its own translation.
- **Streaming transport is the existing NDJSON channel.** `streamingResponse(emit)` already emits `{type:'status'|'done'|'error'}` frames (one JSON object per line, `\n`-delimited). Add a `{type:'token', value}` frame. The client reader in `services/chat.ts` already buffers and switches on `evt.type`.
- **Persistence is display-independent.** The full accumulated answer text + `noteIds` are persisted exactly as today; streaming only affects display. The `done` frame still carries the saved assistant `message`, now plus `meta:{model, provider, usage:{inputTokens, outputTokens}}`.
- **The composer's standalone scope chip is subsumed** by the new `( model · context )` pill + modal. `ChatInputBar`'s `scopeLabel` prop path is replaced; context state (`contextNoteIds`/`contextLabel` in `index.tsx`) is now driven from the modal. The existing attach flow (pick file → create note → set scope) sets the same state and now surfaces in the pill — nothing should double-render.
- Tests: `node:test` on pure functions (existing repo idiom). Backend tests run via the register hook: `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test <glob>` from `apps/web`. Client changes verified by tsc + `expo export`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Architecture

### Server (`apps/web/app/api/mobile/chat/`)

**Provider adapters, one interface.** Replace the single `_chat/complete.ts` with two adapters implementing the same normalized contract the loop already depends on:

- `_chat/complete.azure.ts` — the existing GPT-5 adapter (behavior unchanged) plus:
  - `toAzureMessages(history)` — translates the loop's neutral history to OpenAI wire shape, including the assistant `tool_calls` reconstruction (`{id, type:'function', function:{name, arguments}}`, `content:null`) that currently lives in `loop.ts`.
  - `streamAzure(messages) → AsyncIterable<string>` — the streaming answer call (Azure SSE `chat/completions` with `stream:true`, yielding `choices[].delta.content`).
- `_chat/complete.anthropic.ts` — new Haiku adapter:
  - `toAnthropicParams(history)` → `{system, messages, tools}` in Anthropic shape (tool_use / tool_result blocks; flat tool schema).
  - `callAnthropic(...)` → normalized `ModelTurn` (non-streaming, for the tool phase).
  - `streamAnthropic(...) → AsyncIterable<string>` — `client.messages.stream(...)` text deltas.

Both adapters export the same shape so the route can pick one:
```
type Provider = 'azure' | 'anthropic'
type ChatAdapter = {
  callModel: (messages, opts) => Promise<ModelTurn>       // tool phase (non-streamed)
  streamAnswer: (messages) => AsyncIterable<string>       // final answer (streamed)
  modelLabel: string                                       // e.g. 'GPT-5' | 'Haiku 4.5'
}
```

**Neutral message shaping.** `loop.ts` change: the assistant tool-call turn it pushes becomes the neutral `{role:'assistant', toolCalls:[{id, query}]}` (its own type), and the tool result becomes neutral `{role:'tool', id, content}`. The provider-specific reconstruction moves into each adapter's `to*Messages`/`to*Params`. This is a refactor of the existing loop, not a behavior change — the same messages reach each provider, just shaped by the adapter.

**Streaming the answer.** `runChat` gains an `emitToken` (or a streaming final-call path): the tool phase is unchanged (`callModel`, status pills), but the final answer uses `streamAnswer`, and each yielded delta is passed out through `emit({type:'token', value})`. The full text is accumulated and returned as today for persistence.

**Route (`route.ts`).** Read `provider` from the POST body (default `'azure'`), select the adapter, inject its `callModel`/`streamAnswer` into `runChat`. On completion, the `done` frame gains `meta:{model:adapter.modelLabel, provider, usage}`. Usage is accumulated across the turn's model calls (both providers report input/output token counts).

### Client (`apps/nuru/`)

- **`services/chat.ts`** — `send(...)` gains a `provider` arg (in the POST body). The stream reader adds a `token` case → appends to a running buffer and invokes a new `onToken(text)` callback. The `done` frame's `meta` flows onto the final `Message` (new optional fields: `model`, `provider`, `usage`).
- **`app/(tabs)/index.tsx`** — holds `provider` state (default `'azure'`, remembered across messages in the session) and passes it to `chat.send`. During streaming, renders the growing answer as a live assistant bubble via `onToken`. Drives `contextNoteIds`/`contextLabel` from the new modal (replacing the old scope-chip path). Shows the model+usage footer on completed assistant bubbles.
- **New `ChatOptionsModal` component** — opened by the composer pill. Sections: **Model** (GPT-5 / Haiku, single-select), **Context** (All notes / this note, reflecting current scope), **Tools — coming soon** (disabled placeholder row). Mirrors the AttachMenu modal/backdrop pattern + theme tokens.
- **`ChatInputBar.tsx`** — composer control row becomes compact: `[+] [( model · context ▾ )] … [mic (disabled)] [send]`. The `( model · context )` pill shows current picks and opens `ChatOptionsModal`. The standalone `scopeLabel` chip is removed (its info now lives in the pill). A disabled mic affordance (no `onPress`, greyed) implies transcription. Not full-width — compact, since notes list + attachments carry weight elsewhere.

## Data flow (one turn)

```
Client POST { text, sessionId, contextNoteIds?, provider }
  → route: adapter = pick(provider)   (default azure)
  → runChat(tool phase, non-streamed) → emit {status: searching_notes|...} → pills
  → runChat(final answer) → streamAnswer yields deltas → emit {type:'token', value} each
       → client onToken appends → assistant bubble grows live
  → persist accumulated answer + noteIds (unchanged)
  → emit {type:'done', message, meta:{model, provider, usage}}
       → bubble footer shows e.g. "Haiku · 1.2k in / 340 out"
```

## Error handling & edge cases

- **Missing `ANTHROPIC_API_KEY`** with provider=anthropic → adapter throws → existing route `catch` emits `{type:'error'}` → client shows "assistant unavailable" (no new plumbing).
- **Unknown/absent provider** → default `'azure'`; old clients unaffected.
- **Stream interruption** — the `done` frame is the source of truth for the persisted message; a dropped token stream still resolves to the saved answer when `done` arrives. If the connection dies before `done`, the client shows the partial + an error (existing error path).
- **Persistence** is unchanged — full accumulated `answer` + `noteIds` saved; streaming is display-only.
- **The 9b490ce tool_calls fix stays correct** — the Azure adapter now owns that exact reconstruction; the Anthropic adapter owns its own. Neither provider can regress the other, and each is unit-tested.
- **Empty answer** (model returned no text) → `token` frames simply never fire; `done` carries the (possibly empty) saved message, as today.

## Testing

**Unit (node:test, pure functions):**
- `toAzureMessages` — a loop history containing a tool-call turn replays as OpenAI wire shape (`type:'function'`, `function.name`, JSON-string `arguments`, `content:null`). This is the exact class of the production 400 we just fixed (9b490ce) — pinned on the Azure side.
- `toAnthropicParams` — the same history produces Anthropic shape: system as top-level param, assistant `tool_use` block `{type:'tool_use', id, name, input:{query}}`, tool result as a user `tool_result` block `{tool_use_id, content}`, flat tool schema.
- Loop provider-neutrality — `runChat`'s history stays neutral `{id, query}` (no provider wire shape leaks into it); existing loop tests updated for the neutral shape.
- Streaming accumulation — a fake `streamAnswer` yielding known chunks → `token` frames emit in order and the accumulated text equals their concatenation.

**Typecheck / bundle:** `apps/web` tsc; `apps/nuru` tsc + `expo export --platform android`.

**Live smoke (controller/human, device):**
- One GPT-5 turn and one Haiku turn against the real APIs: tokens stream into the bubble, the answer persists, the footer shows model + usage. Anthropic auth verified live (real `ANTHROPIC_API_KEY`).
- The `( model · context )` pill opens the modal; switching model changes which model answers the next question; switching context re-scopes; the disabled mic + "Tools — coming soon" row are visibly present but inert.
- A multi-turn tool call on **both** providers (the scenario that produced the original 400) answers correctly — proving each adapter's tool-call replay shape.

## Self-review

**Spec coverage:** streaming (final answer only) ✓; per-request provider toggle w/ default azure ✓; Anthropic adapter (correct tool_use/tool_result/system/flat-schema shapes) ✓; provider-neutral loop refactor (moves 9b490ce shaping into adapters) ✓; model+usage in `done.meta` + bubble footer ✓; `( model · context )` pill + modal subsuming the scope chip ✓; disabled mic + Tools-coming-soon placeholder ✓; deferred items listed ✓.

**Placeholder scan:** none — every component names its file and interface.

**Internal consistency:** the neutral-loop constraint and the adapter split are stated the same way in Global Constraints, Architecture, and Testing. The scope-chip subsumption is called out in both Global Constraints and Client sections so nothing double-renders.

**Ambiguity check:** provider default is pinned (`azure`); Anthropic model pinned (`claude-haiku-4-5`); auth pinned (`ANTHROPIC_API_KEY`); stream scope pinned (final answer only); toggle persistence pinned (client-remembered, session-scoped). The one intentional latitude left to the plan: exact visual styling of the pill/modal (theme tokens, spacing) — behavior and structure are fixed here.
