import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ASK_LIMIT_PER_DAY, parseAsk } from './ask-logic'

test('the daily limit is 50', () => {
  assert.equal(ASK_LIMIT_PER_DAY, 50)
})

test('parseAsk rejects pages outside 1..pageCount and fractional pages', () => {
  assert.equal(parseAsk({ page: 0, question: 'why?' }, 3).ok, false)
  assert.equal(parseAsk({ page: 4, question: 'why?' }, 3).ok, false)
  assert.equal(parseAsk({ page: 1.5, question: 'why?' }, 3).ok, false)
  assert.equal(parseAsk({ page: '2', question: 'why?' }, 3).ok, false)
})

test('parseAsk rejects empty and over-long questions', () => {
  assert.equal(parseAsk({ page: 1, question: '   ' }, 3).ok, false)
  assert.equal(parseAsk({ page: 1, question: 'a'.repeat(501) }, 3).ok, false)
  assert.equal(parseAsk({ page: 1 }, 3).ok, false)
  assert.equal(parseAsk(null, 3).ok, false)
  assert.equal(parseAsk({ page: 1, question: 'a'.repeat(500) }, 3).ok, true)
})

test('parseAsk trims the question', () => {
  assert.deepEqual(parseAsk({ page: 2, question: ' why? ' }, 3), { ok: true, value: { page: 2, question: 'why?' } })
})
