import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runChat, type RunDeps, type ModelTurn } from './loop.ts'

function harness(turns: ModelTurn[]) {
  // turns: array of ModelTurn the fake model returns in order
  let i = 0
  const emitted: string[] = []
  let searches = 0
  const deps: RunDeps = {
    userText: 'q',
    callModel: async () => turns[i++],
    search: async () => {
      searches++
      return { chunks: [{ content: 'c' }], noteIds: ['n' + searches] }
    },
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
  const always: ModelTurn = { toolCalls: [{ id: 'x', query: 'q' }] }
  const h = harness([always, always, always, always, always])
  const out = await runChat(h.deps)
  assert.ok(h.searches() <= 3, `searches=${h.searches()}`)
  assert.ok(h.calls() <= 4, `calls=${h.calls()}`)
  assert.equal(typeof out.answer, 'string') // still produced an answer (forced final)
})

test('replayed assistant tool_calls are API-shaped (type/function/arguments)', async () => {
  // Regression: the loop must push the assistant tool-call turn back to the model
  // in the OpenAI wire shape, NOT the loop's normalized {id, query}. A malformed
  // replay makes the next chat-completions call 400 with
  // "Missing required parameter: 'messages[N].tool_calls[0].type'".
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

  // The second model call carries the assistant tool-call turn in its history.
  const secondCallMessages = seen[1]
  const assistant = secondCallMessages.find((m) => m.role === 'assistant')
  assert.ok(assistant, 'assistant tool-call turn must be replayed to the model')
  const calls = assistant!.tool_calls as Record<string, unknown>[]
  assert.equal(calls[0].type, 'function')
  assert.equal(calls[0].id, 't1')
  const fn = calls[0].function as { name: string; arguments: string }
  assert.equal(fn.name, 'search_notes')
  assert.deepEqual(JSON.parse(fn.arguments), { query: 'entropy' })
})

test('retrieval error: model still gets to answer (no throw)', async () => {
  const h = harness([
    { toolCalls: [{ id: 't1', query: 'q' }] },
    { text: 'From what I know, ...' },
  ])
  h.deps.search = async () => {
    throw new Error('match failed')
  }
  const out = await runChat(h.deps)
  assert.equal(out.answer, 'From what I know, ...')
  assert.deepEqual(out.noteIds, [])
})
