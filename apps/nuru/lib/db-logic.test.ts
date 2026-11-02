import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isDbUnavailable } from './db-logic'

function neonError(fields: Record<string, unknown>) {
  return Object.assign(new Error('Error connecting to database: TypeError: fetch failed'), { name: 'NeonDbError', code: undefined }, fields)
}

test('the logged Neon fetch timeout is db-unavailable', () => {
  assert.equal(
    isDbUnavailable({ name: 'NeonDbError', code: undefined, sourceError: { message: 'fetch failed', cause: { code: 'ETIMEDOUT' } } }),
    true,
  )
})

test('a real TypeError with an AggregateError cause is db-unavailable', () => {
  const cause = Object.assign(new AggregateError([Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' })]), { code: 'ETIMEDOUT' })
  assert.equal(isDbUnavailable(neonError({ sourceError: new TypeError('fetch failed', { cause }) })), true)
})

test('network codes on the cause, or inside an AggregateError, are db-unavailable', () => {
  for (const code of ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN']) {
    assert.equal(isDbUnavailable(neonError({ sourceError: { message: 'other', cause: { code } } })), true, code)
    assert.equal(isDbUnavailable(neonError({ sourceError: { message: 'other', cause: { errors: [{ code }] } } })), true, code)
    assert.equal(isDbUnavailable(neonError({ sourceError: { message: 'other', code } })), true, code)
  }
})

test('SQL errors are not db-unavailable', () => {
  assert.equal(isDbUnavailable({ name: 'NeonDbError', code: '42703' }), false)
  assert.equal(isDbUnavailable(neonError({ code: '42703', sourceError: undefined })), false)
  assert.equal(isDbUnavailable(neonError({ code: '23505', sourceError: { message: 'fetch failed' } })), false)
})

test('other errors are not db-unavailable', () => {
  assert.equal(isDbUnavailable(undefined), false)
  assert.equal(isDbUnavailable(null), false)
  assert.equal(isDbUnavailable('fetch failed'), false)
  assert.equal(isDbUnavailable(new TypeError('fetch failed')), false)
  assert.equal(isDbUnavailable({ name: 'NeonDbError', code: undefined }), false)
  assert.equal(isDbUnavailable(neonError({ sourceError: { message: 'something else', cause: { code: 'EACCES' } } })), false)
})
