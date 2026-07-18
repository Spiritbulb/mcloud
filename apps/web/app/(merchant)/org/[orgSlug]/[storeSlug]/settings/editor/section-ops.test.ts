import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applySectionOp } from './section-ops.ts'

const base = () => [{ type: 'hero' }, { type: 'collections' }, { type: 'featured' }]

// Fake seeder — no SECTION_REGISTRY import, keeps this test bare-node-runnable.
const seed = (t: string) => ({ type: t, settings: {} })

test('move reorders', () => {
  const r = applySectionOp(base(), { op: 'move', index: 0, to: 2 }, seed)
  assert.deepEqual(r.map((s) => s.type), ['collections', 'featured', 'hero'])
})

test('move out of bounds is a no-op (same contents)', () => {
  const r = applySectionOp(base(), { op: 'move', index: 0, to: 9 }, seed)
  assert.deepEqual(r.map((s) => s.type), ['hero', 'collections', 'featured'])
})

test('delete removes the indexed section', () => {
  const r = applySectionOp(base(), { op: 'delete', index: 1 }, seed)
  assert.deepEqual(r.map((s) => s.type), ['hero', 'featured'])
})

test('duplicate inserts an independent copy after the original', () => {
  const src = [{ type: 'featured', settings: { heading: 'X' } }]
  const r = applySectionOp(src, { op: 'duplicate', index: 0 }, seed)
  assert.equal(r.length, 2)
  assert.notEqual(r[0].settings, r[1].settings) // deep clone, not shared ref
  ;(r[1].settings as Record<string, unknown>).heading = 'Y'
  assert.equal((r[0].settings as Record<string, unknown>).heading, 'X')
})

test('add inserts a seeded section at index', () => {
  const r = applySectionOp(base(), { op: 'add', index: 1, sectionType: 'all-products' }, seed)
  assert.equal(r[1].type, 'all-products')
  assert.equal(r.length, 4)
})

test('a bad index leaves the array untouched', () => {
  assert.deepEqual(applySectionOp(base(), { op: 'delete', index: 99 }, seed).length, 3)
})
