import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunk } from './chunk.ts'

test('short text returns a single chunk', () => {
  const out = chunk('hello world')
  assert.deepEqual(out, ['hello world'])
})

test('empty / whitespace-only text returns no chunks', () => {
  assert.deepEqual(chunk(''), [])
  assert.deepEqual(chunk('   \n  '), [])
})

test('long text splits into multiple overlapping chunks', () => {
  const text = 'a'.repeat(3000)
  const out = chunk(text, { size: 1000, overlap: 100 })
  assert.ok(out.length >= 3, `expected >=3 chunks, got ${out.length}`)
  for (const c of out) assert.ok(c.length <= 1000, `chunk too long: ${c.length}`)
  assert.ok(out.length < 3000 / 1000 + 3, 'overlap should not explode chunk count')
})

test('does not split a word across a boundary when whitespace exists', () => {
  const words = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ')
  const out = chunk(words, { size: 500, overlap: 50 })
  for (const c of out) assert.ok(!c.startsWith('ord'), `mid-word split: ${c.slice(0, 6)}`)
})
