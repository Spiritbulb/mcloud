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
