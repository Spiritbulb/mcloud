import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_BYTES, checkUploadedObject, objectKey, safeFilename, validateUploadRequest } from './upload-logic'

test('safeFilename strips paths and unsafe characters', () => {
  assert.equal(safeFilename('../../etc/x.pdf'), 'x.pdf')
  assert.equal(safeFilename('résumé notes (1).PDF'), 'r-sum-notes-1-.pdf')
  assert.equal(safeFilename(''), 'document.pdf')
})

test('objectKey is scoped by owner and file id', () => {
  assert.match(objectKey('user_1', 'f', '../a.pdf'), /^files\/user_1\/f\/[A-Za-z0-9._-]+\.pdf$/)
})

test('validateUploadRequest enforces pdf, size and filename', () => {
  assert.equal(validateUploadRequest({ filename: 'a.pdf', mime: 'image/png', bytes: 10 }).ok, false)
  assert.equal(validateUploadRequest({ filename: 'a.pdf', mime: 'application/pdf', bytes: MAX_BYTES + 1 }).ok, false)
  assert.equal(validateUploadRequest({ filename: 'a.pdf', mime: 'application/pdf', bytes: 0 }).ok, false)
  assert.equal(validateUploadRequest({ filename: 'a.pdf', mime: 'application/pdf', bytes: 1.5 }).ok, false)
  assert.equal(validateUploadRequest({ filename: ' ', mime: 'application/pdf', bytes: 5 }).ok, false)
  assert.equal(validateUploadRequest(null).ok, false)
  assert.deepEqual(validateUploadRequest({ filename: 'a.pdf', mime: 'application/pdf', bytes: 5 }), {
    ok: true,
    value: { filename: 'a.pdf', bytes: 5 },
  })
})

test('checkUploadedObject checks size and magic bytes', () => {
  const pdf = new TextEncoder().encode('%PDF-')
  assert.equal(checkUploadedObject({ declared: 5, actual: 5, head: pdf }).ok, true)
  assert.equal(checkUploadedObject({ declared: 5, actual: 6, head: pdf }).ok, false)
  assert.equal(checkUploadedObject({ declared: 5, actual: null, head: pdf }).ok, false)
  assert.equal(checkUploadedObject({ declared: 5, actual: 5, head: new TextEncoder().encode('<html') }).ok, false)
})
