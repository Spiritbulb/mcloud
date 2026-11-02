import test from 'node:test'
import assert from 'node:assert/strict'
import { formatFeedDate, parseBefore } from './feed-logic'

test('formats an absolute date in Nairobi time', () => {
  assert.equal(formatFeedDate('2026-11-01T22:30:00Z'), '2 Nov 2026')
  assert.equal(formatFeedDate('2026-11-01T10:00:00Z'), '1 Nov 2026')
})

test('parseBefore rejects invalid input', () => {
  assert.equal(parseBefore('x'), null)
  assert.equal(parseBefore(null), null)
  assert.equal(parseBefore(''), null)
})

test('parseBefore parses an ISO timestamp', () => {
  assert.equal(parseBefore('2026-11-01T22:30:00Z')?.toISOString(), '2026-11-01T22:30:00.000Z')
})
