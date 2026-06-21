import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeReturnTo } from './_return-to.ts'

test('accepts a same-origin relative path', () => {
  assert.equal(sanitizeReturnTo('/org/acme/store'), '/org/acme/store')
})

test('rejects protocol-relative urls', () => {
  assert.equal(sanitizeReturnTo('//evil.com'), '/auth/post-login')
})

test('rejects absolute urls with a scheme', () => {
  assert.equal(sanitizeReturnTo('https://evil.com/x'), '/auth/post-login')
})

test('rejects values that do not start with a slash', () => {
  assert.equal(sanitizeReturnTo('org/acme'), '/auth/post-login')
})

test('rejects non-strings and uses the provided fallback', () => {
  assert.equal(sanitizeReturnTo(undefined, '/home'), '/home')
  assert.equal(sanitizeReturnTo(42, '/home'), '/home')
})

test('rejects backslash-escaped tricks', () => {
  assert.equal(sanitizeReturnTo('/\\evil.com'), '/auth/post-login')
})

test('rejects URL-encoded backslash host', () => {
  assert.equal(sanitizeReturnTo('/%5Cevil.com'), '/auth/post-login')
})

test('rejects URL-encoded protocol-relative host', () => {
  assert.equal(sanitizeReturnTo('/%2Fevil.com'), '/auth/post-login')
})

test('rejects malformed percent-encoding', () => {
  assert.equal(sanitizeReturnTo('/%E0%A4%A'), '/auth/post-login')
})

test('rejects null (non-string)', () => {
  assert.equal(sanitizeReturnTo(null, '/home'), '/home')
})
