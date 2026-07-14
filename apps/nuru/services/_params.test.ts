import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanParam } from './_params.ts'

test('cleanParam returns a real value unchanged', () => {
  assert.equal(cleanParam('9f8b1a2c-0000-4444-8888-abcdef012345'), '9f8b1a2c-0000-4444-8888-abcdef012345')
})

test('cleanParam treats JS undefined/null as absent', () => {
  assert.equal(cleanParam(undefined), null)
  assert.equal(cleanParam(null), null)
})

test('cleanParam treats the literal string "undefined" as absent (expo-router quirk)', () => {
  assert.equal(cleanParam('undefined'), null)
})

test('cleanParam treats the literal string "null" and empty/whitespace as absent', () => {
  assert.equal(cleanParam('null'), null)
  assert.equal(cleanParam(''), null)
  assert.equal(cleanParam('   '), null)
})

test('cleanParam takes the first element of an array param', () => {
  assert.equal(cleanParam(['abc']), 'abc')
  assert.equal(cleanParam(['undefined']), null)
  assert.equal(cleanParam([]), null)
})
