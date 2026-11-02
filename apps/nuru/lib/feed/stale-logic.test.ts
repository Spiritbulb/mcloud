import test from 'node:test'
import assert from 'node:assert/strict'
import { isStale } from './stale-logic'

const now = new Date('2026-11-01T12:00:00Z')
const ago = (min: number) => new Date(now.getTime() - min * 60_000)

test('null counts as stale', () => {
  assert.equal(isStale(null, now), true)
})

test('29 minutes old is fresh, 31 is stale', () => {
  assert.equal(isStale(ago(29), now), false)
  assert.equal(isStale(ago(31), now), true)
})

test('maxAgeMin is configurable', () => {
  assert.equal(isStale(ago(10), now, 5), true)
})
