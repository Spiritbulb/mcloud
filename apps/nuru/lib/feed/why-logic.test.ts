import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanWhy, whyUpdates } from './why-logic'

test('empty, whitespace and null give null', () => {
  assert.equal(cleanWhy(''), null)
  assert.equal(cleanWhy('   '), null)
  assert.equal(cleanWhy(null), null)
})

test('201 characters gives null, 200 passes', () => {
  assert.equal(cleanWhy('a'.repeat(201)), null)
  assert.equal(cleanWhy('a'.repeat(200)), 'a'.repeat(200))
})

test('prediction markers give null', () => {
  assert.equal(cleanWhy('Fees will likely rise'), null)
  assert.equal(cleanWhy('HELB is expected to change rules'), null)
  assert.equal(cleanWhy('Prices could soon double'), null)
  assert.equal(cleanWhy('Analysts predict a drop'), null)
})

test('a normal sentence passes through trimmed', () => {
  assert.equal(cleanWhy('  HELB loans now cover TVET students.  '), 'HELB loans now cover TVET students.')
})

test('whyUpdates drops invented ids, duplicates and unusable text', () => {
  const out = whyUpdates(
    [1, 2, 3],
    [
      { id: 1, why: ' Fees changed. ' },
      { id: 99, why: 'Invented.' },
      { id: 2, why: 'Fees will likely rise' },
      { id: 3, why: null },
      { id: 1, why: 'Second try.' },
    ],
  )
  assert.deepEqual(out, [{ id: 1, why: 'Fees changed.' }])
})
