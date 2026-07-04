import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveTitle, toSessionDTO } from './_sessions.ts'

test('deriveTitle trims and passes short messages through', () => {
  assert.equal(deriveTitle('  What is photosynthesis?  '), 'What is photosynthesis?')
})

test('deriveTitle truncates long messages to 40 chars with an ellipsis', () => {
  const long = 'Explain the causes of the French Revolution in detail please'
  const out = deriveTitle(long)
  assert.ok(out.length <= 41, `too long: ${out.length}`) // 40 + ellipsis
  assert.ok(out.endsWith('…'))
  assert.ok(out.startsWith('Explain the causes'))
})

test('deriveTitle falls back to "New chat" for empty input', () => {
  assert.equal(deriveTitle('   '), 'New chat')
})

test('toSessionDTO maps snake_case row to camelCase DTO', () => {
  const dto = toSessionDTO({ id: 's1', title: 'Chat', updated_at: '2026-07-04T00:00:00.000Z' })
  assert.deepEqual(dto, { id: 's1', title: 'Chat', updatedAt: '2026-07-04T00:00:00.000Z' })
})
