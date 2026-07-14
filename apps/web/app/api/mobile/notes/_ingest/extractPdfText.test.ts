import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extractPdfText } from './extractPdfText.ts'

async function fixture(name: string): Promise<ArrayBuffer> {
  const url = new URL(`./__fixtures__/${name}`, import.meta.url)
  const buf = await readFile(fileURLToPath(url))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

test('extracts text from a text-layer PDF', async () => {
  const out = await extractPdfText(await fixture('hello.pdf'))
  assert.match(out, /Hello Nuru/)
})

test('returns empty string for a PDF with no text layer (scanned)', async () => {
  const out = await extractPdfText(await fixture('notext.pdf'))
  assert.equal(out, '')
})
