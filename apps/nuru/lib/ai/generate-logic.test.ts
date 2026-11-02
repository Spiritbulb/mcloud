import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { extractPages } from './extract'
import {
  MAX_DOC_CHARS,
  buildDocumentText,
  canRetry,
  cleanOutputs,
  describeFile,
  effectiveStatus,
  errorMessage,
  hasText,
  isEmptyOutput,
  isStaleProcessing,
} from './generate-logic'

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

test('isEmptyOutput is true only when nothing survived cleaning', () => {
  assert.equal(isEmptyOutput({ notes: [], questions: [] }), true)
  assert.equal(isEmptyOutput({ notes: [], questions: [{ question: 'Q', answer: 'A', pages: [1] }] }), false)
  assert.equal(isEmptyOutput({ notes: [{ heading: 'H', points: [{ text: 'p', pages: [1] }] }], questions: [] }), false)
  assert.equal(isEmptyOutput(cleanOutputs({ notes: [{ heading: 'H', points: [{ text: 'p', pages: [9] }] }], questions: [] }, 3)), true)
})

test('a processing claim older than 10 minutes is stale', () => {
  const now = new Date('2026-11-02T12:00:00Z')
  const row = (status: 'uploaded' | 'processing' | 'ready' | 'failed', claimedAt: string | null) => ({ status, error: null, claimedAt })
  assert.equal(isStaleProcessing(row('processing', '2026-11-02T11:55:00Z'), now), false)
  assert.equal(isStaleProcessing(row('processing', '2026-11-02T11:50:00Z'), now), false)
  assert.equal(isStaleProcessing(row('processing', '2026-11-02T11:49:59Z'), now), true)
  assert.equal(isStaleProcessing(row('processing', null), now), true)
  assert.equal(isStaleProcessing(row('ready', '2026-11-01T00:00:00Z'), now), false)
  assert.equal(isStaleProcessing(row('uploaded', null), now), false)
})

test('effectiveStatus and describeFile report a stale claim as a retryable failure', () => {
  const now = new Date('2026-11-02T12:00:00Z')
  const stale = { status: 'processing' as const, error: null, claimedAt: '2026-11-02T11:00:00Z' }
  assert.deepEqual(effectiveStatus(stale, now), { status: 'failed', error: 'generation_failed' })
  assert.deepEqual(describeFile(stale, now), {
    status: 'failed',
    error: 'generation_failed',
    errorMessage: "Nuru couldn't make notes for this file.",
    canRetry: true,
  })
  const fresh = { status: 'processing' as const, error: null, claimedAt: '2026-11-02T11:59:00Z' }
  assert.deepEqual(describeFile(fresh, now), { status: 'processing', error: null, errorMessage: null, canRetry: false })
  const noText = { status: 'failed' as const, error: 'no_text', claimedAt: null }
  assert.equal(describeFile(noText, now).canRetry, false)
  assert.match(describeFile(noText, now).errorMessage!, /no selectable text/)
  assert.deepEqual(describeFile({ status: 'ready', error: null, claimedAt: null }, now), { status: 'ready', error: null, errorMessage: null, canRetry: false })
})
