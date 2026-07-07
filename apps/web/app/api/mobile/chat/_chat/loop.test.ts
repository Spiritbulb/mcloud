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
    streamAnswer: async function* () {
      yield { token: turns[i - 1]?.text ?? '' }
      yield { usage: { inputTokens: 0, outputTokens: 0 } }
    },
    onToken: () => {},
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
    streamAnswer: async function* () {
      yield { token: 'done' }
      yield { usage: { inputTokens: 0, outputTokens: 0 } }
    },
    onToken: () => {},
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

test('whole-turn usage: tool-phase callModel usage is accumulated with the streamed final usage', async () => {
  const h = harness([
    { toolCalls: [{ id: 't1', query: 'q' }], usage: { inputTokens: 10, outputTokens: 2 } },
    { text: null as unknown as undefined, usage: { inputTokens: 20, outputTokens: 3 } },
  ])
  h.deps.streamAnswer = async function* () {
    yield { token: 'ok' }
    yield { usage: { inputTokens: 5, outputTokens: 8 } }
  }
  const out = await runChat(h.deps)
  // Expected total: tool-phase (10+20 input, 2+3 output) + streamed (5 input, 8 output)
  assert.deepEqual(out.usage, { inputTokens: 35, outputTokens: 13 })
})
