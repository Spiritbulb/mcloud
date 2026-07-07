# Nuru Chat: token streaming + per-request provider toggle (Haiku vs GPT-5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream the final chat answer token-by-token, and let the client pick GPT-5 (Azure, default) or Claude Haiku 4.5 (Anthropic) per message, surfacing which model answered and its token usage — chosen from a compact `( model · context )` composer pill.

**Architecture:** The tool-calling loop becomes provider-neutral: it keeps normalized `{id, query}` tool-call turns in history, and each of two adapters (Azure/OpenAI-shaped, Anthropic/content-block-shaped) translates that history to its own wire shape at the boundary. The route selects an adapter from the POST `provider` field, streams the final answer's tokens over the existing NDJSON channel as `{type:'token'}` frames, and returns model+usage in the `done` frame. The client renders the answer as it streams and shows a model/usage footer; the composer replaces its standalone scope chip with a `( model · context )` pill that opens one modal.

**Tech Stack:** Next.js 16 route handler (`apps/web`), Azure OpenAI v1 chat (existing), `@anthropic-ai/sdk` (new, `claude-haiku-4-5`), Expo/React Native (`apps/nuru`), `node:test` for pure functions.

## Global Constraints

- **Anthropic Messages API is NOT OpenAI-shaped.** Assistant tool call = content block `{type:'tool_use', id, name:'search_notes', input:{query}}`. Tool result = a **user** message with `{type:'tool_result', tool_use_id, content}`. System prompt = top-level `system` param (not a message). Tool schema is flat: `{name, description, input_schema}` (no `type:'function'` wrapper).
- **Anthropic model + auth:** `claude-haiku-4-5`, via `@anthropic-ai/sdk` with `ANTHROPIC_API_KEY`. Plain messages call — NO `thinking`/`effort`/`temperature` params (Haiku 4.5 doesn't take them). Answer call `max_tokens: 4096`.
- **Azure GPT-5 stays default.** Absent/unknown `provider` → `'azure'`. Existing Azure v1 shape unchanged: `POST {endpoint}/chat/completions`, header `api-key`, body `{model, messages, tools?, tool_choice?}`, no `api-version`/temperature/max_tokens.
- **Provider-neutral loop.** `loop.ts` history must hold neutral turns only — never a provider's wire shape. Each adapter translates history → wire shape. The OpenAI reconstruction currently at `loop.ts:69-77` moves into the Azure adapter.
- **NDJSON transport unchanged.** `streamingResponse(emit)` emits `{type}`-tagged JSON lines. Add `{type:'token', value:string}`. `done` frame gains `meta:{model:string, provider:string, usage:{inputTokens:number, outputTokens:number}}`.
- **Persistence is display-independent.** Persist the full accumulated answer + noteIds exactly as today; streaming only affects display.
- **Scope chip subsumed.** `ChatInputBar`'s `scopeLabel` chip and the `index.tsx` "Scoped to …" banner are replaced by the `( model · context )` pill + modal. Context state (`contextNoteIds`/`contextLabel`) is unchanged and now surfaces in the pill; the attach flow still sets it.
- **Exact copy:** model labels `'GPT-5'` (azure) and `'Haiku 4.5'` (anthropic). Provider values `'azure'` | `'anthropic'`. Disabled mic accessibilityLabel `'Voice input coming soon'`. Tools row text `'Tools — coming soon'`.
- Backend tests run from `apps/web`: `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test <glob>`. Client verified by `npx tsc --noEmit` + `npx expo export --output-dir dist-verify --platform android`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

**Backend (`apps/web/app/api/mobile/chat/`):**
- `_chat/loop.ts` (modify) — neutral history turns; `ModelTurn` unchanged; add streaming final-answer path + usage accumulation.
- `_chat/adapters.ts` (new) — `Provider` type, `ChatAdapter` interface, `pickAdapter(provider)`.
- `_chat/complete.azure.ts` (new, from `complete.ts`) — Azure `callModel` + `toAzureMessages` + `streamAzure` + usage.
- `_chat/complete.anthropic.ts` (new) — Anthropic `callModel` + `toAnthropicParams` + `streamAnthropic` + usage.
- `_chat/complete.azure.test.ts` (new) — `toAzureMessages` wire-shape test.
- `_chat/complete.anthropic.test.ts` (new) — `toAnthropicParams` wire-shape test.
- `_chat/loop.test.ts` (modify) — update for neutral history; add streaming-accumulation test.
- `_chat/complete.ts` (delete) — replaced by the two adapters.
- `route.ts` (modify) — read `provider`; pick adapter; stream tokens; `done.meta`.
- `apps/web/package.json` — add `@anthropic-ai/sdk`.

**Client (`apps/nuru/`):**
- `types/index.ts` (modify) — `Provider` type; `Message` gains optional `model`/`provider`/`usage`.
- `services/chat.ts` (modify) — `send` takes `provider` + `onToken`; reader handles `token`; `done.meta` → message.
- `services/_map.ts` (modify) — `mapMessage` passes through `model`/`provider`/`usage`.
- `components/ChatOptionsModal.tsx` (new) — Model / Context / Tools-coming-soon modal.
- `components/ChatInputBar.tsx` (modify) — `( model · context )` pill + disabled mic; drop scope chip.
- `components/ChatBubble.tsx` (modify) — assistant footer: model + usage.
- `app/(tabs)/index.tsx` (modify) — provider state; live streaming bubble; wire modal; drop "Scoped to" banner.

---

## Task 1: Install @anthropic-ai/sdk

**Files:**
- Modify: `apps/web/package.json` (add `@anthropic-ai/sdk`)

**Interfaces:**
- Produces: the `@anthropic-ai/sdk` package available to import in later tasks.

- [ ] **Step 1: Install**

Run (from `apps/web`): `npm install @anthropic-ai/sdk`
Expected: `@anthropic-ai/sdk` appears in `apps/web/package.json` dependencies; root `package-lock.json` updated (this is an npm-workspaces monorepo with a single ROOT lockfile — `apps/web` has no own lockfile).

- [ ] **Step 2: Verify import resolves**

Run (from `apps/web`): `node -e "console.log(require('@anthropic-ai/sdk/package.json').version)"`
Expected: prints a version string (no error).

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "chore(nuru): add @anthropic-ai/sdk for Haiku chat provider

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Make the loop provider-neutral

Move the OpenAI-specific tool-call reconstruction out of `loop.ts` so history holds only neutral turns. This is a refactor: same messages reach the model, just shaped by the adapter (Task 3) instead of the loop.

**Files:**
- Modify: `apps/web/app/api/mobile/chat/_chat/loop.ts`
- Modify: `apps/web/app/api/mobile/chat/_chat/loop.test.ts`

**Interfaces:**
- Produces: `runChat` history now contains neutral turns:
  - system: `{ role: 'system', content: string }`
  - user: `{ role: 'user', content: string }`
  - assistant tool call: `{ role: 'assistant', toolCalls: { id: string; query: string }[] }`
  - tool result: `{ role: 'tool', id: string, content: string }`
  `ModelTurn` (`{ toolCalls?: {id,query}[]; text?: string }`) is unchanged. `RunDeps.callModel` signature is unchanged (`(messages: Msg[], opts:{tools:boolean}) => Promise<ModelTurn>`).

- [ ] **Step 1: Update the loop test for neutral history**

In `apps/web/app/api/mobile/chat/_chat/loop.test.ts`, the existing regression test named `'replayed assistant tool_calls are API-shaped (type/function/arguments)'` asserts the OpenAI wire shape — which now lives in the adapter, not the loop. Replace that whole `test(...)` block with a neutral-history assertion:

```ts
test('replayed assistant tool-call turn stays neutral {id, query} in loop history', async () => {
  // The loop must NOT bake any provider wire shape into its history — each
  // adapter translates. Here we capture the messages handed to the second
  // model call and assert the assistant turn is the neutral shape.
  const seen: Record<string, unknown>[][] = []
  const turns: ModelTurn[] = [
    { toolCalls: [{ id: 't1', query: 'entropy' }] },
    { text: 'done' },
  ]
  let i = 0
  const deps: RunDeps = {
    userText: 'q',
    callModel: async (messages) => {
      seen.push(messages)
      return turns[i++]
    },
    search: async () => ({ chunks: [{ content: 'c' }], noteIds: ['n1'] }),
    emit: () => {},
  }
  await runChat(deps)

  const secondCallMessages = seen[1]
  const assistant = secondCallMessages.find((m) => m.role === 'assistant')
  assert.ok(assistant, 'assistant tool-call turn must be in history')
  assert.deepEqual(assistant!.toolCalls, [{ id: 't1', query: 'entropy' }])
  // No provider wire shape leaked in:
  assert.equal('tool_calls' in assistant!, false)
  assert.equal('content' in assistant!, false)

  const toolMsg = secondCallMessages.find((m) => m.role === 'tool')
  assert.ok(toolMsg, 'tool result turn must be in history')
  assert.equal(toolMsg!.id, 't1')
  assert.equal('tool_call_id' in toolMsg!, false)
})
```

- [ ] **Step 2: Run it, expect fail**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test app/api/mobile/chat/_chat/loop.test.ts`
Expected: the new test FAILS (current loop pushes `tool_calls` wire shape + `tool_call_id`), the other 4 pass.

- [ ] **Step 3: Make the loop history neutral**

In `apps/web/app/api/mobile/chat/_chat/loop.ts`, replace the block at lines 64-90 (the comment starting `// Record the assistant tool-call turn...` through the closing `}` of the `for` loop) with:

```ts
    // Record the assistant tool-call turn in the loop's NEUTRAL shape. Each
    // provider adapter (Task 3) translates this to its own wire shape; the loop
    // never bakes in a provider format.
    messages.push({ role: 'assistant', toolCalls: turn.toolCalls! })
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
      messages.push({ role: 'tool', id: call.id, content })
    }
```

- [ ] **Step 4: Run it, expect pass**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test app/api/mobile/chat/_chat/loop.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/mobile/chat/_chat/loop.ts apps/web/app/api/mobile/chat/_chat/loop.test.ts
git commit -m "refactor(nuru): loop keeps neutral tool-call turns; adapters translate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Azure adapter (translate + stream + usage)

Extract the existing Azure logic into `complete.azure.ts`, add the OpenAI-shape translation (moved out of the loop), a streaming answer call, and usage capture.

**Files:**
- Create: `apps/web/app/api/mobile/chat/_chat/complete.azure.ts`
- Create: `apps/web/app/api/mobile/chat/_chat/complete.azure.test.ts`
- Delete: `apps/web/app/api/mobile/chat/_chat/complete.ts`

**Interfaces:**
- Consumes: neutral history turns (Task 2); `SEARCH_NOTES_TOOL`, `buildSystemPrompt` from `./prompt`; `ModelTurn` from `./loop`.
- Produces (all exported from `complete.azure.ts`):
  - `toAzureMessages(history: Record<string, unknown>[]): Record<string, unknown>[]` — neutral → OpenAI wire shape.
  - `callAzure(history, opts:{tools:boolean}): Promise<ModelTurn & { usage?: { inputTokens: number; outputTokens: number } }>`
  - `streamAzure(history): AsyncIterable<{ token?: string; usage?: { inputTokens: number; outputTokens: number } }>` — yields tokens, then a final usage-only value.
  - `AZURE_LABEL = 'GPT-5'`

- [ ] **Step 1: Write the failing translation test**

```ts
// apps/web/app/api/mobile/notes... NO — path below
// apps/web/app/api/mobile/chat/_chat/complete.azure.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toAzureMessages } from './complete.azure.ts'

test('toAzureMessages reconstructs the OpenAI tool-call wire shape', () => {
  const history = [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'q' },
    { role: 'assistant', toolCalls: [{ id: 't1', query: 'entropy' }] },
    { role: 'tool', id: 't1', content: 'chunks' },
  ]
  const out = toAzureMessages(history) as any[]
  // system + user pass through untouched
  assert.deepEqual(out[0], { role: 'system', content: 'sys' })
  assert.deepEqual(out[1], { role: 'user', content: 'q' })
  // assistant tool-call turn → OpenAI wire shape
  assert.equal(out[2].role, 'assistant')
  assert.equal(out[2].content, null)
  assert.equal(out[2].tool_calls[0].id, 't1')
  assert.equal(out[2].tool_calls[0].type, 'function')
  assert.equal(out[2].tool_calls[0].function.name, 'search_notes')
  assert.deepEqual(JSON.parse(out[2].tool_calls[0].function.arguments), { query: 'entropy' })
  // tool result → tool_call_id shape
  assert.equal(out[3].role, 'tool')
  assert.equal(out[3].tool_call_id, 't1')
  assert.equal(out[3].content, 'chunks')
})
```

- [ ] **Step 2: Run it, expect fail**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test app/api/mobile/chat/_chat/complete.azure.test.ts`
Expected: FAIL — cannot find `./complete.azure.ts`.

- [ ] **Step 3: Write the Azure adapter**

```ts
// apps/web/app/api/mobile/chat/_chat/complete.azure.ts
// Azure OpenAI (GPT-5) adapter. Translates the loop's neutral history into the
// OpenAI wire shape, runs one non-streaming call for the tool phase, and a
// streaming call for the final answer. v1 API: POST {endpoint}/chat/completions,
// header api-key, body {model, messages}, no api-version/temperature/max_tokens.
import { SEARCH_NOTES_TOOL } from './prompt'
import type { ModelTurn } from './loop'

export const AZURE_LABEL = 'GPT-5'

type Msg = Record<string, unknown>
type Usage = { inputTokens: number; outputTokens: number }

// Neutral history → OpenAI wire shape. The assistant tool-call turn needs the
// full {id, type:'function', function:{name, arguments}} shape (omitting `type`
// 400s the next completion); the tool result needs `tool_call_id`.
export function toAzureMessages(history: Msg[]): Msg[] {
  return history.map((m) => {
    if (m.role === 'assistant' && Array.isArray(m.toolCalls)) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: (m.toolCalls as { id: string; query: string }[]).map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: 'search_notes', arguments: JSON.stringify({ query: c.query }) },
        })),
      }
    }
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.id, content: m.content }
    }
    return m
  })
}

function env() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  if (!endpoint || !key || !deployment) throw new Error('chat_failed')
  return { url: `${endpoint.replace(/\/$/, '')}/chat/completions`, key, deployment }
}

export async function callAzure(
  history: Msg[],
  opts: { tools: boolean },
): Promise<ModelTurn & { usage?: Usage }> {
  const { url, key, deployment } = env()
  const body: Record<string, unknown> = { model: deployment, messages: toAzureMessages(history) }
  if (opts.tools) {
    body.tools = [SEARCH_NOTES_TOOL]
    body.tool_choice = 'auto'
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('[nuru chat azure]', res.status, await res.text().catch(() => ''))
    throw new Error('chat_failed')
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const msg = json.choices?.[0]?.message
  const toolCalls = (msg?.tool_calls ?? [])
    .filter((c) => c.function?.name === 'search_notes')
    .map((c) => {
      let query = ''
      try {
        query = (JSON.parse(c.function.arguments) as { query?: string }).query ?? ''
      } catch {}
      return { id: c.id, query }
    })
  return {
    text: msg?.content ?? undefined,
    toolCalls: toolCalls.length ? toolCalls : undefined,
    usage: json.usage
      ? { inputTokens: json.usage.prompt_tokens ?? 0, outputTokens: json.usage.completion_tokens ?? 0 }
      : undefined,
  }
}

// Streaming final answer. Yields { token } for each content delta, then one final
// { usage } value. Azure streams SSE lines "data: {json}\n\n"; the last data line
// before "[DONE]" with stream_options usage carries token counts.
export async function* streamAzure(
  history: Msg[],
): AsyncIterable<{ token?: string; usage?: Usage }> {
  const { url, key, deployment } = env()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: deployment,
      messages: toAzureMessages(history),
      stream: true,
      stream_options: { include_usage: true },
    }),
  })
  if (!res.ok || !res.body) {
    console.error('[nuru chat azure stream]', res.status)
    throw new Error('chat_failed')
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let usage: Usage | undefined
  while (true) {
    const { done, value } = await reader.read()
    if (value) buf += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') continue
      let json: any
      try {
        json = JSON.parse(data)
      } catch {
        continue
      }
      const token = json.choices?.[0]?.delta?.content
      if (token) yield { token }
      if (json.usage) {
        usage = { inputTokens: json.usage.prompt_tokens ?? 0, outputTokens: json.usage.completion_tokens ?? 0 }
      }
    }
    if (done) break
  }
  yield { usage: usage ?? { inputTokens: 0, outputTokens: 0 } }
}
```

- [ ] **Step 4: Delete the old complete.ts**

Run: `git rm apps/web/app/api/mobile/chat/_chat/complete.ts`
(The route import is repointed in Task 5; this leaves the tree temporarily referencing a missing module — tsc for the whole app is run in Task 5 after the route is updated. The Azure test in Step 5 does not import route.ts, so it passes independently.)

- [ ] **Step 5: Run the translation test, expect pass**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test app/api/mobile/chat/_chat/complete.azure.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/mobile/chat/_chat/complete.azure.ts apps/web/app/api/mobile/chat/_chat/complete.azure.test.ts apps/web/app/api/mobile/chat/_chat/complete.ts
git commit -m "feat(nuru): Azure adapter — neutral→OpenAI translate, stream, usage

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Anthropic (Haiku) adapter + adapter registry

**Files:**
- Create: `apps/web/app/api/mobile/chat/_chat/complete.anthropic.ts`
- Create: `apps/web/app/api/mobile/chat/_chat/complete.anthropic.test.ts`
- Create: `apps/web/app/api/mobile/chat/_chat/adapters.ts`

**Interfaces:**
- Consumes: neutral history (Task 2); `buildSystemPrompt` from `./prompt`; `ModelTurn` from `./loop`; `@anthropic-ai/sdk` (Task 1); the Azure adapter (Task 3).
- Produces:
  - From `complete.anthropic.ts`: `toAnthropicParams(history)` → `{ system: string; messages: Msg[]; tools: Msg[] }`; `callAnthropic(history, opts)` → `Promise<ModelTurn & { usage? }>`; `streamAnthropic(history)` → `AsyncIterable<{ token?; usage? }>`; `ANTHROPIC_LABEL = 'Haiku 4.5'`.
  - From `adapters.ts`: `type Provider = 'azure' | 'anthropic'`; `type Usage = { inputTokens: number; outputTokens: number }`; `type ChatAdapter = { callModel: (h, opts) => Promise<ModelTurn & {usage?}>; streamAnswer: (h) => AsyncIterable<{token?; usage?}>; label: string }`; `pickAdapter(provider?: string): { adapter: ChatAdapter; provider: Provider }`.

- [ ] **Step 1: Write the failing Anthropic translation test**

```ts
// apps/web/app/api/mobile/chat/_chat/complete.anthropic.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toAnthropicParams } from './complete.anthropic.ts'

test('toAnthropicParams builds system + tool_use/tool_result blocks + flat tool', () => {
  const history = [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'q' },
    { role: 'assistant', toolCalls: [{ id: 't1', query: 'entropy' }] },
    { role: 'tool', id: 't1', content: 'chunks' },
  ]
  const { system, messages, tools } = toAnthropicParams(history) as any

  // system prompt is the top-level param, NOT a message
  assert.equal(system, 'sys')
  assert.equal(messages.find((m: any) => m.role === 'system'), undefined)

  // user turn
  assert.deepEqual(messages[0], { role: 'user', content: 'q' })

  // assistant tool call → tool_use content block
  const asst = messages[1]
  assert.equal(asst.role, 'assistant')
  assert.equal(asst.content[0].type, 'tool_use')
  assert.equal(asst.content[0].id, 't1')
  assert.equal(asst.content[0].name, 'search_notes')
  assert.deepEqual(asst.content[0].input, { query: 'entropy' })

  // tool result → USER message with tool_result block
  const toolMsg = messages[2]
  assert.equal(toolMsg.role, 'user')
  assert.equal(toolMsg.content[0].type, 'tool_result')
  assert.equal(toolMsg.content[0].tool_use_id, 't1')
  assert.equal(toolMsg.content[0].content, 'chunks')

  // flat tool schema (no type:'function' wrapper)
  assert.equal(tools[0].name, 'search_notes')
  assert.equal(tools[0].type, undefined)
  assert.equal(tools[0].input_schema.type, 'object')
  assert.deepEqual(tools[0].input_schema.required, ['query'])
})
```

- [ ] **Step 2: Run it, expect fail**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test app/api/mobile/chat/_chat/complete.anthropic.test.ts`
Expected: FAIL — cannot find `./complete.anthropic.ts`.

- [ ] **Step 3: Write the Anthropic adapter**

```ts
// apps/web/app/api/mobile/chat/_chat/complete.anthropic.ts
// Anthropic (Claude Haiku 4.5) adapter. Translates the loop's neutral history
// into the Messages-API shape: system is a top-level param; the assistant tool
// call is a tool_use content block; the tool result is a USER message with a
// tool_result block; the tool schema is flat {name, description, input_schema}.
// Plain messages call — Haiku 4.5 takes no thinking/effort/temperature params.
import Anthropic from '@anthropic-ai/sdk'
import type { ModelTurn } from './loop'

export const ANTHROPIC_LABEL = 'Haiku 4.5'
const MODEL = 'claude-haiku-4-5'
const MAX_TOKENS = 4096

type Msg = Record<string, unknown>
type Usage = { inputTokens: number; outputTokens: number }

const ANTHROPIC_TOOL = {
  name: 'search_notes',
  description:
    "Search the student's own study notes (and the approved community pool) for " +
    'passages relevant to a query. Call this only when the question is about their ' +
    'coursework/notes; skip it for greetings, small talk, or general questions you ' +
    'can answer directly.',
  input_schema: {
    type: 'object',
    properties: { query: { type: 'string', description: 'What to look for in the notes.' } },
    required: ['query'],
  },
}

export function toAnthropicParams(history: Msg[]): { system: string; messages: Msg[]; tools: Msg[] } {
  let system = ''
  const messages: Msg[] = []
  for (const m of history) {
    if (m.role === 'system') {
      system = m.content as string
    } else if (m.role === 'user') {
      messages.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant' && Array.isArray(m.toolCalls)) {
      messages.push({
        role: 'assistant',
        content: (m.toolCalls as { id: string; query: string }[]).map((c) => ({
          type: 'tool_use',
          id: c.id,
          name: 'search_notes',
          input: { query: c.query },
        })),
      })
    } else if (m.role === 'tool') {
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: m.id, content: m.content }],
      })
    }
  }
  return { system, messages, tools: [ANTHROPIC_TOOL] }
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('chat_failed')
  return new Anthropic({ apiKey })
}

export async function callAnthropic(
  history: Msg[],
  opts: { tools: boolean },
): Promise<ModelTurn & { usage?: Usage }> {
  const { system, messages, tools } = toAnthropicParams(history)
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: messages as Anthropic.MessageParam[],
    ...(opts.tools ? { tools: tools as Anthropic.Tool[] } : {}),
  })
  let text: string | undefined
  const toolCalls: { id: string; query: string }[] = []
  for (const block of res.content) {
    if (block.type === 'text') text = (text ?? '') + block.text
    else if (block.type === 'tool_use' && block.name === 'search_notes') {
      const q = (block.input as { query?: string })?.query ?? ''
      toolCalls.push({ id: block.id, query: q })
    }
  }
  return {
    text,
    toolCalls: toolCalls.length ? toolCalls : undefined,
    usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
  }
}

// Streaming final answer. The final call never offers tools (the loop only
// streams the answer), so we stream text deltas and read usage from the final
// message. Yields { token } per delta, then one final { usage }.
export async function* streamAnthropic(
  history: Msg[],
): AsyncIterable<{ token?: string; usage?: Usage }> {
  const { system, messages } = toAnthropicParams(history)
  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: messages as Anthropic.MessageParam[],
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { token: event.delta.text }
    }
  }
  const final = await stream.finalMessage()
  yield { usage: { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens } }
}
```

- [ ] **Step 4: Write the adapter registry**

```ts
// apps/web/app/api/mobile/chat/_chat/adapters.ts
// Provider selection. Both adapters implement the same ChatAdapter contract over
// the loop's neutral history, so runChat is provider-agnostic. Unknown/absent
// provider falls back to Azure (GPT-5), keeping old clients working.
import type { ModelTurn } from './loop'
import { AZURE_LABEL, callAzure, streamAzure } from './complete.azure'
import { ANTHROPIC_LABEL, callAnthropic, streamAnthropic } from './complete.anthropic'

export type Provider = 'azure' | 'anthropic'
export type Usage = { inputTokens: number; outputTokens: number }
type Msg = Record<string, unknown>

export type ChatAdapter = {
  callModel: (history: Msg[], opts: { tools: boolean }) => Promise<ModelTurn & { usage?: Usage }>
  streamAnswer: (history: Msg[]) => AsyncIterable<{ token?: string; usage?: Usage }>
  label: string
}

const AZURE: ChatAdapter = { callModel: callAzure, streamAnswer: streamAzure, label: AZURE_LABEL }
const ANTHROPIC: ChatAdapter = { callModel: callAnthropic, streamAnswer: streamAnthropic, label: ANTHROPIC_LABEL }

export function pickAdapter(provider?: string): { adapter: ChatAdapter; provider: Provider } {
  return provider === 'anthropic'
    ? { adapter: ANTHROPIC, provider: 'anthropic' }
    : { adapter: AZURE, provider: 'azure' }
}
```

- [ ] **Step 5: Run the Anthropic translation test, expect pass**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test app/api/mobile/chat/_chat/complete.anthropic.test.ts`
Expected: PASS (1 test). (The test imports only `toAnthropicParams`, a pure function — no network, no SDK client constructed.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/mobile/chat/_chat/complete.anthropic.ts apps/web/app/api/mobile/chat/_chat/complete.anthropic.test.ts apps/web/app/api/mobile/chat/_chat/adapters.ts
git commit -m "feat(nuru): Anthropic Haiku adapter + provider registry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Stream the final answer in the loop; wire adapter + tokens + meta into the route

**Files:**
- Modify: `apps/web/app/api/mobile/chat/_chat/loop.ts`
- Modify: `apps/web/app/api/mobile/chat/_chat/loop.test.ts`
- Modify: `apps/web/app/api/mobile/chat/route.ts`

**Interfaces:**
- Consumes: `pickAdapter` (Task 4); the neutral loop (Task 2).
- Produces: `RunDeps` gains `streamAnswer` + `onToken`; `runChat` returns `{ answer, noteIds, usage? }`. The route reads `provider`, injects the adapter, emits `{type:'token'}` frames, and adds `meta` to `done`.

- [ ] **Step 1: Write the failing streaming-accumulation test**

Add to `apps/web/app/api/mobile/chat/_chat/loop.test.ts`:

```ts
test('final answer streams tokens in order and accumulates to the full text', async () => {
  const tokens: string[] = []
  const deps: RunDeps = {
    userText: 'q',
    // No tool call → straight to the streamed final answer.
    callModel: async () => ({ text: null as unknown as undefined }), // force the stream path
    search: async () => ({ chunks: [], noteIds: [] }),
    emit: () => {},
    streamAnswer: async function* () {
      yield { token: 'Hel' }
      yield { token: 'lo ' }
      yield { token: 'Nuru' }
      yield { usage: { inputTokens: 3, outputTokens: 2 } }
    },
    onToken: (t) => tokens.push(t),
  }
  const out = await runChat(deps)
  assert.deepEqual(tokens, ['Hel', 'lo ', 'Nuru'])
  assert.equal(out.answer, 'Hello Nuru')
  assert.deepEqual(out.usage, { inputTokens: 3, outputTokens: 2 })
})
```

- [ ] **Step 2: Run it, expect fail**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test app/api/mobile/chat/_chat/loop.test.ts`
Expected: FAIL — `streamAnswer`/`onToken` not in `RunDeps`; `runChat` doesn't stream or return `usage`.

- [ ] **Step 3: Add streaming to the loop**

In `apps/web/app/api/mobile/chat/_chat/loop.ts`:

Replace the `ModelTurn`/`RunDeps` block (lines 8-21) with:

```ts
export type Usage = { inputTokens: number; outputTokens: number }

export type ModelTurn = {
  toolCalls?: { id: string; query: string }[]
  text?: string
  usage?: Usage
}

type Msg = Record<string, unknown>

export type RunDeps = {
  userText: string
  noteInFocus?: string
  callModel: (messages: Msg[], opts: { tools: boolean }) => Promise<ModelTurn>
  search: (query: string) => Promise<{ chunks: { content: string }[]; noteIds: string[] }>
  emit: (value: 'thinking' | 'searching_notes' | 'writing') => void
  // Final-answer streaming: yields { token } deltas then a final { usage }.
  streamAnswer: (messages: Msg[]) => AsyncIterable<{ token?: string; usage?: Usage }>
  onToken: (token: string) => void
}
```

Update the `runChat` return type and the final-answer branch. Change the signature line (currently line 26):

```ts
export async function runChat(deps: RunDeps): Promise<{ answer: string; noteIds: string[]; usage?: Usage }> {
  const { userText, noteInFocus, callModel, search, emit, streamAnswer, onToken } = deps
```

Add a helper just above the `while (true)` loop (after `let calls = 0`):

```ts
  // Stream the final answer from the adapter, forwarding tokens to onToken and
  // accumulating the full text (for persistence) + usage (for the done frame).
  async function streamFinal(): Promise<{ answer: string; usage?: Usage }> {
    emit('writing')
    let answer = ''
    let usage: Usage | undefined
    for await (const part of streamAnswer(messages)) {
      if (part.token) {
        answer += part.token
        onToken(part.token)
      }
      if (part.usage) usage = part.usage
    }
    return { answer, usage }
  }
```

Replace the final-answer branch (the `if (!wantsSearch) { ... }` body, currently lines 46-62) with:

```ts
    if (!wantsSearch) {
      // Final answer is always streamed. Whether the last non-streamed call
      // returned text or not, we stream a fresh answer-only completion so the
      // user sees tokens arrive. (The prior turn's text, if any, was a signal
      // the model is done searching, not the answer to render.)
      const { answer, usage } = await streamFinal()
      return { answer, noteIds: [...noteIds], usage }
    }
```

- [ ] **Step 4: Run the loop tests, expect pass**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test app/api/mobile/chat/_chat/loop.test.ts`
Expected: PASS. Note: the pre-existing tests that used `{ text: '...' }` as the final turn now reach `streamFinal`, so they MUST supply `streamAnswer`/`onToken`. Update the shared `harness` in this file (the `deps` object it builds) to include:

```ts
    streamAnswer: async function* () {
      yield { token: turns[i - 1]?.text ?? '' }
      yield { usage: { inputTokens: 0, outputTokens: 0 } }
    },
    onToken: () => {},
```

and update the three existing assertions that read `out.answer` to expect the streamed text (`'hi there'`, `'Plants make food from light.'`, `'From what I know, ...'`) — since the harness now streams `turns[i-1].text` as the answer, those values are unchanged. Re-run; expected PASS (all tests).

- [ ] **Step 5: Wire the route**

In `apps/web/app/api/mobile/chat/route.ts`:

Replace the import `import { callModel } from './_chat/complete'` with:
```ts
import { pickAdapter } from './_chat/adapters'
```

In the POST body type, add `provider`:
```ts
    let body: { text?: string; contextNoteIds?: string[]; sessionId?: string; provider?: string }
```

Just before `return streamingResponse(...)`, add:
```ts
    const { adapter, provider } = pickAdapter(body.provider)
```

Replace the `runChat({...})` call inside `streamingResponse` (currently passing `callModel`) with:
```ts
        const out = await runChat({
            userText: text,
            noteInFocus,
            callModel: adapter.callModel,
            search: (q) => searchNotes(supabase, userId, q),
            emit: (value) => emit({ type: 'status', value }),
            streamAnswer: adapter.streamAnswer,
            onToken: (token) => emit({ type: 'token', value: token }),
        })
        answer = out.answer
        noteIds = out.noteIds
        var usage = out.usage
```
(Declare `usage` alongside `answer`/`noteIds` at the top of the producer instead of `var` if the surrounding code uses `let` — match the existing `let answer: string` style: add `let usage: { inputTokens: number; outputTokens: number } | undefined` near `let answer`.)

Finally, extend the `done` emit (currently emits `{ type: 'done', message: ... }`) to include `meta`:
```ts
        emit({
            type: 'done',
            message: saved
                ? toMessage(saved as ChatRow)
                : { id: '', role: 'assistant', text: answer, contextNoteIds: noteIds, createdAt: new Date().toISOString() },
            meta: { model: adapter.label, provider, usage: usage ?? { inputTokens: 0, outputTokens: 0 } },
        })
```

- [ ] **Step 6: Typecheck**

Run (from `apps/web`): `npx tsc --noEmit`
Expected: exit 0. (Confirms the deleted `complete.ts` has no remaining importers and the route compiles against the adapter.)

- [ ] **Step 7: Live smoke — route still serves**

Start web if not running: `npx turbo run dev --filter=@mcloud/web -- --port 3000`. Then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/mobile/chat
```
Expected: `401` (auth precedes body parsing — confirms the route compiles/serves).

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/api/mobile/chat/_chat/loop.ts apps/web/app/api/mobile/chat/_chat/loop.test.ts apps/web/app/api/mobile/chat/route.ts
git commit -m "feat(nuru): stream final answer; route picks provider, emits tokens + meta

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Client — types, mapper, and streaming send with provider

**Files:**
- Modify: `apps/nuru/types/index.ts`
- Modify: `apps/nuru/services/_map.ts`
- Modify: `apps/nuru/services/chat.ts`

**Interfaces:**
- Consumes: the `{type:'token'}` + `done.meta` frames (Task 5).
- Produces: `Provider` type; `Message` with optional `model`/`provider`/`usage`; `chat.send(text, contextNoteIds, sessionId, provider, opts?)` where `opts` gains `onToken?: (text: string) => void`.

- [ ] **Step 1: Extend the Message type + add Provider**

In `apps/nuru/types/index.ts`, replace the `Message` interface (the block `export interface Message { ... }`) with:

```ts
export type Provider = 'azure' | 'anthropic';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  contextNoteIds: string[];
  createdAt: string; // ISO
  // Present on assistant messages returned from a live send (A/B visibility).
  model?: string;
  provider?: Provider;
  usage?: { inputTokens: number; outputTokens: number };
}
```

- [ ] **Step 2: Pass the meta through the mapper**

In `apps/nuru/services/_map.ts`, replace the `mapMessage` function body's return with:

```ts
export function mapMessage(m: Message): Message {
  return {
    id: m.id,
    role: m.role,
    text: m.text,
    contextNoteIds: m.contextNoteIds ?? [],
    createdAt: m.createdAt,
    model: m.model,
    provider: m.provider,
    usage: m.usage,
  };
}
```

- [ ] **Step 3: Add provider + onToken + token frame to send**

In `apps/nuru/services/chat.ts`, replace the entire `send(...)` method with:

```ts
    async send(
      text: string,
      contextNoteIds: string[],
      sessionId: string,
      provider: 'azure' | 'anthropic',
      opts?: { onStatus?: (status: string) => void; onToken?: (text: string) => void },
    ): Promise<Message> {
      const res = await streamingFetch('/api/mobile/chat', {
        method: 'POST',
        body: JSON.stringify({ text, contextNoteIds, sessionId, provider }),
      });
      if (!res.ok || !res.body) throw new Error('Could not send message');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let message: Message | null = null;

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
            | { type: 'token'; value: string }
            | { type: 'done'; message: Message; meta?: { model: string; provider: 'azure' | 'anthropic'; usage: { inputTokens: number; outputTokens: number } } }
            | { type: 'error'; error: string };
          if (evt.type === 'status') opts?.onStatus?.(evt.value);
          else if (evt.type === 'token') opts?.onToken?.(evt.value);
          else if (evt.type === 'done') {
            message = mapMessage({
              ...evt.message,
              model: evt.meta?.model,
              provider: evt.meta?.provider,
              usage: evt.meta?.usage,
            });
          } else if (evt.type === 'error') throw new Error(evt.error);
        }
        if (done) break;
      }
      if (!message) throw new Error('Could not send message');
      return message;
    },
```

- [ ] **Step 4: Typecheck**

Run (from `apps/nuru`): `npx tsc --noEmit`
Expected: FAILS only at the `index.tsx` call site `chat.send(text, contextNoteIds, sessionId, { onStatus: setStatus })` — it now needs the `provider` arg. That call site is fixed in Task 8. No other errors.

- [ ] **Step 5: Commit**

```bash
git add apps/nuru/types/index.ts apps/nuru/services/_map.ts apps/nuru/services/chat.ts
git commit -m "feat(nuru): client send takes provider + streams tokens; message carries meta

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: ChatOptionsModal + ChatInputBar pill + disabled mic

**Files:**
- Create: `apps/nuru/components/ChatOptionsModal.tsx`
- Modify: `apps/nuru/components/ChatInputBar.tsx`

**Interfaces:**
- Consumes: `Provider` type (Task 6); `theme`.
- Produces:
  - `ChatOptionsModal({ visible, onClose, provider, onSelectProvider, contextLabel, onClearContext })` where `onSelectProvider: (p: Provider) => void`, `contextLabel: string | null`, `onClearContext: () => void`.
  - `ChatInputBar` new props: `provider: Provider`, `modelLabel: string`, `contextLabel?: string`, `onOpenOptions: () => void`. Drops `scopeLabel`.

- [ ] **Step 1: Write the modal**

```tsx
// apps/nuru/components/ChatOptionsModal.tsx
// Chat options sheet opened by the composer's ( model · context ) pill. Sections:
// Model (GPT-5 / Haiku, single-select), Context (current scope, clearable), and a
// disabled "Tools — coming soon" row for future tool toggles. Mirrors AttachMenu's
// transparent Modal + tap-to-dismiss backdrop.
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import type { Provider } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  provider: Provider;
  onSelectProvider: (p: Provider) => void;
  contextLabel: string | null;
  onClearContext: () => void;
};

const MODELS: { id: Provider; label: string }[] = [
  { id: 'azure', label: 'GPT-5' },
  { id: 'anthropic', label: 'Haiku 4.5' },
];

export function ChatOptionsModal({
  visible, onClose, provider, onSelectProvider, contextLabel, onClearContext,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.section}>Model</Text>
          <View style={styles.rowGroup}>
            {MODELS.map((m) => {
              const active = provider === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.choice, active && styles.choiceActive]}
                  onPress={() => { onSelectProvider(m.id); }}
                  accessibilityLabel={`Use ${m.label}`}
                >
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>Context</Text>
          <View style={styles.contextRow}>
            <Text style={styles.contextText} numberOfLines={1}>
              {contextLabel ?? 'All notes'}
            </Text>
            {contextLabel && (
              <Pressable onPress={onClearContext} hitSlop={8} accessibilityLabel="Clear context">
                <Text style={styles.clear}>✕</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.divider} />
          <View style={styles.toolsRow} accessibilityLabel="Tools coming soon">
            <Text style={styles.toolsText}>Tools — coming soon</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
    marginBottom: 96,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  section: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  rowGroup: { flexDirection: 'row', gap: theme.spacing.sm },
  choice: {
    flex: 1, alignItems: 'center', paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill, backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  choiceActive: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  choiceText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  choiceTextActive: { color: theme.colors.text },
  contextRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  contextText: { color: theme.colors.text, fontSize: 14, flex: 1 },
  clear: { color: theme.colors.textMuted, fontSize: 14, paddingHorizontal: theme.spacing.xs },
  divider: { height: 1, backgroundColor: theme.colors.border, marginTop: theme.spacing.xs },
  toolsRow: { opacity: 0.4, paddingVertical: theme.spacing.xs },
  toolsText: { color: theme.colors.textMuted, fontSize: 14 },
});
```

- [ ] **Step 2: Rework ChatInputBar — pill + disabled mic, drop scope chip**

In `apps/nuru/components/ChatInputBar.tsx`, replace the prop list (lines 14-26) with:

```tsx
export function ChatInputBar({
  onSend,
  disabled,
  modelLabel,
  contextLabel,
  onAttach,
  attaching,
  onOpenOptions,
}: {
  onSend: (t: string) => void;
  disabled?: boolean;
  modelLabel: string;
  contextLabel?: string;
  onAttach?: () => void;
  attaching?: boolean;
  onOpenOptions: () => void;
}) {
```

Replace the `<View style={styles.controls}>` block (lines 47-74) with:

```tsx
      <View style={styles.controls}>
        <Pressable
          style={styles.attach}
          onPress={onAttach}
          disabled={!onAttach || attaching}
          accessibilityLabel="Attach a file"
        >
          {attaching ? (
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
          ) : (
            <Text style={styles.attachGlyph}>＋</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.pill}
          onPress={onOpenOptions}
          accessibilityLabel="Chat options"
        >
          <View style={styles.pillDot} />
          <Text style={styles.pillText} numberOfLines={1}>
            {modelLabel} · {contextLabel ?? 'All notes'} ▾
          </Text>
        </Pressable>
        <View style={styles.mic} accessibilityLabel="Voice input coming soon">
          <Text style={styles.micGlyph}>🎙</Text>
        </View>
        <Pressable
          onPress={submit}
          disabled={!canSend}
          style={[styles.send, !canSend && styles.sendDisabled]}
          accessibilityLabel="Send message"
        >
          <Text style={styles.sendGlyph}>↑</Text>
        </Pressable>
      </View>
```

In the `StyleSheet.create({...})`, remove the `scope`, `scopeDot`, and `scopeText` entries and add:

```tsx
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary },
  pillText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  mic: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.4,
  },
  micGlyph: { fontSize: 16 },
```

- [ ] **Step 3: Typecheck**

Run (from `apps/nuru`): `npx tsc --noEmit`
Expected: FAILS only at the `index.tsx` `<ChatInputBar .../>` call site (still passes `scopeLabel`, missing `modelLabel`/`onOpenOptions`) — fixed in Task 8. No other errors.

- [ ] **Step 4: Commit**

```bash
git add apps/nuru/components/ChatOptionsModal.tsx apps/nuru/components/ChatInputBar.tsx
git commit -m "feat(nuru): ( model · context ) pill + options modal + disabled mic

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Wire the chat screen — provider state, live streaming bubble, options modal, footer

**Files:**
- Modify: `apps/nuru/app/(tabs)/index.tsx`
- Modify: `apps/nuru/components/ChatBubble.tsx`

**Interfaces:**
- Consumes: `chat.send(...provider, {onToken})` (Task 6); `ChatOptionsModal`, `ChatInputBar` new props (Task 7); `Message.model`/`usage` (Task 6).

- [ ] **Step 1: Assistant footer in ChatBubble**

Read `apps/nuru/components/ChatBubble.tsx` first to match its structure. Add a footer under the assistant bubble text that renders only when `message.model` is present:

```tsx
{message.role === 'assistant' && message.model && (
  <Text style={styles.meta}>
    {message.model}
    {message.usage ? ` · ${message.usage.inputTokens} in / ${message.usage.outputTokens} out` : ''}
  </Text>
)}
```

Add to that file's `StyleSheet`:
```tsx
  meta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
```
(If the assistant bubble text is inside a nested `View`, place the footer as a sibling of the text within the same bubble container. Adapt to the real structure; the footer must sit inside the assistant bubble, below its text.)

- [ ] **Step 2: Provider state + streaming bubble + modal wiring in index.tsx**

In `apps/nuru/app/(tabs)/index.tsx`:

Add imports:
```tsx
import { ChatOptionsModal } from '@/components/ChatOptionsModal';
import type { Provider } from '@/types';
```

Add state near the other hooks (after `const [attaching, setAttaching] = useState(false);`):
```tsx
  const [provider, setProvider] = useState<Provider>('azure');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const modelLabel = provider === 'anthropic' ? 'Haiku 4.5' : 'GPT-5';
```

Replace the `onSend` function (lines 72-93) with a version that streams into a live bubble:
```tsx
  async function onSend(text: string) {
    if (!sessionId) return;
    setSending(true);
    setStatus('thinking');
    setStreamingText(null);
    const optimistic: Message = {
      id: 'tmp', role: 'user', text, contextNoteIds, createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      await chat.send(text, contextNoteIds, sessionId, provider, {
        onStatus: setStatus,
        onToken: (t) => setStreamingText((prev) => (prev ?? '') + t),
      });
      setMessages(await chat.history(sessionId));
    } catch {
      setMessages((m) => m.filter((msg) => msg.id !== 'tmp'));
      setLoadError(true);
    } finally {
      setSending(false);
      setStatus(undefined);
      setStreamingText(null);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }
```

Remove the `contextLabel` banner block (lines 119-128, the `{contextLabel && (<View style={styles.ctx}>...)}`) — context now lives in the pill/modal. (Leave `clearContext` in place; the modal calls it.)

Render the streaming bubble: just before the `{sending && (...)}` thinking block, add a live assistant bubble while tokens arrive:
```tsx
      {streamingText != null && (
        <View style={{ paddingHorizontal: theme.spacing.md }}>
          <ChatBubble
            message={{
              id: 'streaming', role: 'assistant', text: streamingText,
              contextNoteIds: [], createdAt: new Date().toISOString(),
            }}
          />
        </View>
      )}
```
(Keep the existing `{sending && <ThinkingIndicator .../>}` — it shows during the pre-answer tool phase; once tokens start, `streamingText` renders alongside/after it. Acceptable overlap; the final `chat.history` replaces both.)

Replace the `<ChatInputBar .../>` element (lines 156-162) with:
```tsx
      <ChatInputBar
        onSend={onSend}
        disabled={sending}
        modelLabel={modelLabel}
        contextLabel={contextLabel ?? undefined}
        onAttach={() => setAttachOpen(true)}
        attaching={attaching}
        onOpenOptions={() => setOptionsOpen(true)}
      />
```

After the `<AttachMenu .../>` element, add:
```tsx
      <ChatOptionsModal
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        provider={provider}
        onSelectProvider={setProvider}
        contextLabel={contextLabel}
        onClearContext={clearContext}
      />
```

Remove the now-unused `ctx*` style entries (`ctx`, `ctxText`, `ctxTitle`, `ctxClear`) from the `StyleSheet` at the bottom (the banner that used them was removed).

- [ ] **Step 3: Typecheck**

Run (from `apps/nuru`): `npx tsc --noEmit`
Expected: exit 0 (all call sites now satisfied).

- [ ] **Step 4: Bundle guard**

Run (from `apps/nuru`): `npx expo export --output-dir dist-verify --platform android 2>&1 | tail -3 && rm -rf dist-verify`
Expected: `Exported`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add "apps/nuru/app/(tabs)/index.tsx" apps/nuru/components/ChatBubble.tsx
git commit -m "feat(nuru): provider state, live streaming bubble, options modal, model footer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: End-to-end verification (controller/human-run)

**Files:** none.

- [ ] **Step 1: Backend suite green**

Run (from `apps/web`): `node --experimental-strip-types --import ./app/api/mobile/chat/_chat/_test-register.mjs --test "app/api/mobile/chat/_chat/*.test.ts"`
Expected: all tests pass (loop neutral-history + streaming-accumulation, azure translation, anthropic translation).

- [ ] **Step 2: Full typecheck both apps**

Run (from `apps/web`): `npx tsc --noEmit` → exit 0.
Run (from `apps/nuru`): `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: On-device E2E** (needs a signed-in device + real `AZURE_*` and `ANTHROPIC_API_KEY` env on the web server)

Start `apps/nuru` (`npm start`), sign in, then verify:
- **Token streaming (GPT-5, default):** ask a question → the answer bubble fills in token-by-token (not all at once) → on completion the bubble footer shows `GPT-5 · <n> in / <n> out`.
- **Provider switch:** tap the `( GPT-5 · All notes ▾ )` pill → modal opens → pick **Haiku 4.5** → ask another question → it streams and the footer shows `Haiku 4.5 · …`.
- **Multi-turn tool call on BOTH providers:** ask something that forces a notes search (e.g. about an ingested note) on GPT-5, then on Haiku → each answers correctly (no 400 / no "assistant unavailable") — proves each adapter's tool-call replay shape (`tool_calls` for Azure, `tool_use`/`tool_result` for Anthropic).
- **Context in the modal:** attach a file (via `+`) or open a note → the pill shows `… · <note title>` → the modal's Context section shows it and Clear resets to `All notes`.
- **Coming-soon affordances:** the mic is visibly present but inert; the modal's `Tools — coming soon` row is greyed.
- **Missing-key fallback:** (optional) temporarily unset `ANTHROPIC_API_KEY`, pick Haiku, send → "assistant unavailable" surfaces cleanly (no crash); GPT-5 still works.

---

## Self-Review

**Spec coverage:**
- Token streaming (final answer only) → Task 5 (loop `streamFinal`) + Task 6 (client `onToken`) + Task 8 (live bubble) ✓
- Per-request provider toggle, default azure → Task 4 (`pickAdapter`) + Task 5 (route reads `provider`) + Task 6 (send arg) + Task 7/8 (modal) ✓
- Anthropic adapter, correct tool_use/tool_result/system/flat-schema → Task 4 + test ✓
- Provider-neutral loop (moves 9b490ce shaping into adapters) → Task 2 + Task 3 ✓
- Model + usage in `done.meta` + bubble footer → Task 5 (meta) + Task 6 (mapper) + Task 8 (footer) ✓
- `( model · context )` pill + one modal subsuming scope chip → Task 7 + Task 8 (banner + styles removed) ✓
- Disabled mic + Tools-coming-soon → Task 7 (mic) + Task 7 modal (tools row) ✓
- Deferred (thinking-stream, ask-both, persisted pref, real tool toggle, real transcription) → not built ✓
- Device E2E → Task 9 ✓

**Placeholder scan:** none — every code step carries full content; commands have expected output. The one adaptive instruction (ChatBubble footer placement, Task 8 Step 1) is explicit about the invariant (footer inside the assistant bubble below its text) because the exact JSX structure must be read from the real file.

**Type consistency:** `Provider = 'azure'|'anthropic'` defined in adapters.ts (Task 4) and types/index.ts (Task 6), same literals. `Usage = {inputTokens, outputTokens}` consistent server (Task 3/4/5) ↔ client (Task 6). `ChatAdapter.callModel/streamAnswer/label` (Task 4) consumed in route (Task 5). Neutral history shape (Task 2) consumed identically by `toAzureMessages` (Task 3) and `toAnthropicParams` (Task 4). `chat.send(text, contextNoteIds, sessionId, provider, opts)` signature (Task 6) matches the call site (Task 8). `ChatInputBar` props `modelLabel`/`contextLabel`/`onOpenOptions` (Task 7) match the call site (Task 8). `ChatOptionsModal` props (Task 7) match the render (Task 8). `done.meta.{model,provider,usage}` emitted (Task 5) ↔ read (Task 6).

**Note on tests:** the two translators and the loop's streaming accumulation carry the pure logic worth unit-testing (real-shape assertions, exactly the class of the production 400 fixed in 9b490ce). Adapters' network/SDK calls, the modal, the pill, and the screen wiring are verified by typecheck + `expo export` + device E2E — consistent with this repo's pure-function-test idiom.
