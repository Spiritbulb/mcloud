import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fillDefaults, seedRecord } from './section-seeds.ts'

test('fillDefaults copies declared string defaults', () => {
  const schema = [
    { id: 'heading', type: 'text', label: 'Heading', default: 'Top Picks' },
    { id: 'eyebrow', type: 'text', label: 'Label', default: 'Featured Collection' },
  ] as const
  const s = fillDefaults(schema as any)
  assert.equal(s.heading, 'Top Picks')
  assert.equal(s.eyebrow, 'Featured Collection')
})

test('fillDefaults on undefined schema is empty (e.g. hero has schema [])', () => {
  assert.deepEqual(fillDefaults(undefined), {})
  assert.deepEqual(fillDefaults([]), {})
})

test('seedRecord returns a clickable placeholder for programs', () => {
  const r = seedRecord('programs')
  assert.equal(typeof r.title, 'string')
  assert.ok((r.title as string).length > 0)
})

test('seedRecord for an unknown list is an empty object', () => {
  assert.deepEqual(seedRecord('nope'), {})
})
