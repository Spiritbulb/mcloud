import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_BYTES, checkUploadedObject, isFileId, isPdfContentType, isPdfFile, objectKey, safeFilename, validateUploadRequest } from './upload-logic'

test('safeFilename strips paths and unsafe characters', () => {
  assert.equal(safeFilename('../../etc/x.pdf'), 'x.pdf')
  assert.equal(safeFilename('résumé notes (1).PDF'), 'r-sum-notes-1-.pdf')
  assert.equal(safeFilename(''), 'document.pdf')
})

test('safeFilename always ends in .pdf and caps the stem', () => {
  assert.equal(safeFilename('notes'), 'notes.pdf')
  assert.equal(safeFilename('x.exe'), 'x.pdf')
  assert.equal(safeFilename('a.b.PDF'), 'a.b.pdf')
  const long = safeFilename('a'.repeat(2000) + '.pdf')
  assert.ok(long.length <= 124, String(long.length))
  assert.ok(long.endsWith('.pdf'))
  assert.equal(safeFilename('a'.repeat(2000)).length, 124)
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

test('isPdfContentType accepts only application/pdf', () => {
  assert.equal(isPdfContentType('application/pdf'), true)
  assert.equal(isPdfContentType('Application/PDF; charset=binary'), true)
  assert.equal(isPdfContentType('text/html'), false)
  assert.equal(isPdfContentType('application/pdfx'), false)
  assert.equal(isPdfContentType(undefined), false)
})

test('isFileId accepts only uuids', () => {
  assert.equal(isFileId('3f1c2a9e-8b7d-4c6e-9a1b-2c3d4e5f6a7b'), true)
  assert.equal(isFileId('not-a-uuid'), false)
  assert.equal(isFileId("3f1c2a9e-8b7d-4c6e-9a1b-2c3d4e5f6a7b' or 1=1"), false)
})

test('isPdfFile accepts a pdf type, or no type with a .pdf name', () => {
  assert.equal(isPdfFile({ type: 'application/pdf', name: 'a' }), true)
  assert.equal(isPdfFile({ type: '', name: 'Notes.PDF' }), true)
  assert.equal(isPdfFile({ type: '', name: 'notes.txt' }), false)
  assert.equal(isPdfFile({ type: 'text/plain', name: 'notes.pdf' }), false)
})
