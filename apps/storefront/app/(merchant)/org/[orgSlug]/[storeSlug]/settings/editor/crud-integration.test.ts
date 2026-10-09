import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyItemOp } from './item-ops.ts'
import { applySectionOp } from './section-ops.ts'
import { seedRecord } from './section-seeds.ts'

const seedItem = (list: string) => seedRecord(list)
const seedSec = (type: string) => ({ type, settings: {} })

test('default-trap: a cleared seeded field is saved as empty, not the placeholder', () => {
  // Add a record (seeded), then the merchant clears the title in the preview.
  const arr = applyItemOp([], { op: 'add', index: 0, list: 'programs' }, seedItem) as any[]
  assert.ok(arr[0].title.length > 0, 'seed provides a starting title')
  arr[0].title = '' // merchant cleared it
  // The stored value must be '' (the template re-defaults on render); it must
  // NEVER silently become the placeholder again. Nothing here should re-seed it.
  assert.equal(arr[0].title, '')
})

test('delete integrity: the correct record is removed, the rest survive intact', () => {
  const arr = [{ title: 'A' }, { title: 'B' }, { title: 'C' }]
  const r = applyItemOp(arr, { op: 'delete', index: 1 }, seedItem) as any[]
  assert.deepEqual(r.map((x) => x.title), ['A', 'C'])
  assert.equal(arr.length, 3, 'original array not mutated (pure)')
})

test('record duplicate is an independent deep copy', () => {
  const arr: any[] = [{ title: 'A', nested: { x: 1 } }]
  const r = applyItemOp(arr, { op: 'duplicate', index: 0 }, seedItem) as any[]
  assert.equal(r.length, 2)
  r[1].title = 'Z'; r[1].nested.x = 99
  assert.equal(r[0].title, 'A')
  assert.equal(r[0].nested.x, 1, 'deep clone, not a shared nested ref')
})

test('section duplicate is an independent deep copy', () => {
  const secs = [{ type: 'featured', settings: { heading: 'X' } }]
  const r = applySectionOp(secs, { op: 'duplicate', index: 0 }, seedSec) as any[]
  assert.equal(r.length, 2)
  ;(r[1].settings as any).heading = 'Y'
  assert.equal((r[0].settings as any).heading, 'X')
})

test('section reorder is order-correct and pure', () => {
  const secs = [{ type: 'hero' }, { type: 'collections' }, { type: 'featured' }]
  const r = applySectionOp(secs, { op: 'move', index: 0, to: 2 }, seedSec) as any[]
  assert.deepEqual(r.map((s) => s.type), ['collections', 'featured', 'hero'])
  assert.deepEqual(secs.map((s) => s.type), ['hero', 'collections', 'featured'], 'input unchanged')
})
