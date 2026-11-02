import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeCursor, encodeCursor, formatFeedDate, institutionCardIndex } from './feed-logic'

test('formats an absolute date in Nairobi time', () => {
  assert.equal(formatFeedDate('2026-11-01T22:30:00Z'), '2 Nov 2026')
  assert.equal(formatFeedDate('2026-11-01T10:00:00Z'), '1 Nov 2026')
})

test('cursor round-trips with microsecond precision', () => {
  const c = encodeCursor('2026-11-01T22:30:00.123456Z', 42)
  assert.deepEqual(decodeCursor(c), { at: '2026-11-01T22:30:00.123456Z', id: 42 })
})

test('decodeCursor rejects garbage', () => {
  assert.equal(decodeCursor(null), null)
  assert.equal(decodeCursor(''), null)
  assert.equal(decodeCursor('x'), null)
  assert.equal(decodeCursor('x|1'), null)
  assert.equal(decodeCursor('2026-11-01T22:30:00Z|1|2'), null)
})

test('decodeCursor rejects a non-integer or non-positive id', () => {
  assert.equal(decodeCursor('2026-11-01T22:30:00Z|1.5'), null)
  assert.equal(decodeCursor('2026-11-01T22:30:00Z|abc'), null)
  assert.equal(decodeCursor('2026-11-01T22:30:00Z|0'), null)
  assert.equal(decodeCursor('2026-11-01T22:30:00Z|-3'), null)
})

test('the institution card follows row 5, or the last row on a short list', () => {
  assert.equal(institutionCardIndex(20), 4)
  assert.equal(institutionCardIndex(5), 4)
  assert.equal(institutionCardIndex(3), 2)
  assert.equal(institutionCardIndex(1), 0)
  assert.equal(institutionCardIndex(0), -1)
})
