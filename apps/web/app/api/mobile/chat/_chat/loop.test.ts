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
