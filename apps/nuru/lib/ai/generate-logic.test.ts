import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { extractPages } from './extract'
import { MAX_DOC_CHARS, buildDocumentText, canRetry, cleanOutputs, errorMessage, hasText } from './generate-logic'

async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path.join(import.meta.dirname, '__fixtures__', name)))
}

test('hasText needs 200 non-whitespace characters', () => {
  assert.equal(hasText(['', '  ', '\n']), false)
  assert.equal(hasText(['a '.repeat(199)]), false)
  assert.equal(hasText(['a'.repeat(100), ' \n' + 'b'.repeat(100)]), true)
})

test('buildDocumentText wraps pages and refuses oversize documents', () => {
  assert.equal(buildDocumentText(['x'.repeat(MAX_DOC_CHARS + 1)]), null)
  assert.match(buildDocumentText(['a', 'b'])!, /<page n="1">a<\/page>/)
  assert.match(buildDocumentText(['a', 'b'])!, /<page n="2">b<\/page>/)
})

test('cleanOutputs keeps only valid, sorted, unique page refs', () => {
  const o = { notes: [{ heading: 'H', points: [{ text: 'p', pages: [0, 2, 2, 9] }, { text: 'q', pages: [7] }] }], questions: [{ question: 'Q', answer: 'A', pages: [5] }] }
  assert.deepEqual(cleanOutputs(o, 3), { notes: [{ heading: 'H', points: [{ text: 'p', pages: [2] }] }], questions: [] })
  const o2 = { notes: [{ heading: 'Gone', points: [{ text: 'x', pages: [4] }] }], questions: [{ question: 'Q', answer: 'A', pages: [3, 1, 3] }] }
  assert.deepEqual(cleanOutputs(o2, 3), { notes: [], questions: [{ question: 'Q', answer: 'A', pages: [1, 3] }] })
})

test('canRetry and errorMessage', () => {
  assert.equal(canRetry('no_text'), false)
  assert.equal(canRetry('too_long'), false)
  assert.equal(canRetry(null), false)
  assert.equal(canRetry('generation_failed'), true)
  assert.match(errorMessage('no_text'), /no selectable text/)
  assert.equal(errorMessage('too_long'), 'This file is too long for notes right now.')
  assert.equal(errorMessage(null), "Nuru couldn't make notes for this file.")
})

test('extractPages reads a text PDF per page', async () => {
  const pages = await extractPages(await fixture('hello.pdf'))
  assert.ok(pages.length >= 1)
  assert.ok(pages.some((p) => /Hello Nuru/.test(p)))
  assert.equal(pages[0], pages[0].trim())
})

test('a scanned PDF has no text', async () => {
  assert.equal(hasText(await extractPages(await fixture('notext.pdf'))), false)
})
