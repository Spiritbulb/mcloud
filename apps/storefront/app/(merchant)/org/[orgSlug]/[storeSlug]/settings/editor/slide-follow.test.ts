import { test } from 'node:test'
import assert from 'node:assert/strict'
import { followSlideIndex } from './slide-follow.ts'

test('move follows to the destination', () => {
  assert.equal(followSlideIndex({ op: 'move', index: 0, to: 2 }, 3), 2)
})
test('duplicate follows the copy', () => {
  assert.equal(followSlideIndex({ op: 'duplicate', index: 0 }, 3), 1)
})
test('add follows the new slide', () => {
  assert.equal(followSlideIndex({ op: 'add', index: 2, list: 'heroSlides' }, 3), 2)
})
test('delete shows the neighbour, clamped', () => {
  assert.equal(followSlideIndex({ op: 'delete', index: 2 }, 2), 1)
})
test('delete of first shows new first', () => {
  assert.equal(followSlideIndex({ op: 'delete', index: 0 }, 2), 0)
})
test('empty list clamps to 0', () => {
  assert.equal(followSlideIndex({ op: 'delete', index: 0 }, 0), 0)
})
