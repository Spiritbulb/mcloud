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
