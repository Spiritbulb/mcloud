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
