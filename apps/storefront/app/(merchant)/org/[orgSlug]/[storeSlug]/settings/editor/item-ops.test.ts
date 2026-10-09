import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyItemOp } from './item-ops.ts'

const progs = () => [{ title: 'A' }, { title: 'B' }, { title: 'C' }]

// Fake seeder — mirrors section-ops.test.ts's convention so this test stays
// bare-node-runnable without importing section-seeds.ts (which would need an
// explicit .ts extension here, but tsc rejects that extension in production
// code — see item-ops.ts's doc comment).
const seed = (list: string) => ({ title: `New ${list.slice(0, -1)}` })

test('move reorders records', () => {
  assert.deepEqual(applyItemOp(progs(), { op: 'move', index: 2, to: 0 }, seed).map((r: any) => r.title), ['C', 'A', 'B'])
})
test('delete removes the record, others intact', () => {
  assert.deepEqual(applyItemOp(progs(), { op: 'delete', index: 1 }, seed).map((r: any) => r.title), ['A', 'C'])
})
test('duplicate is an independent copy', () => {
  const r: any[] = applyItemOp(progs(), { op: 'duplicate', index: 0 }, seed)
  assert.equal(r.length, 4)
  r[1].title = 'Z'
  assert.equal(r[0].title, 'A')
})
test('add seeds a placeholder record for the list', () => {
  const r: any[] = applyItemOp(progs(), { op: 'add', index: 3, list: 'programs' }, seed)
  assert.equal(r.length, 4)
  assert.ok(typeof r[3].title === 'string' && r[3].title.length > 0)
})
test('bad index is a no-op', () => {
  assert.equal(applyItemOp(progs(), { op: 'delete', index: 9 }, seed).length, 3)
})
