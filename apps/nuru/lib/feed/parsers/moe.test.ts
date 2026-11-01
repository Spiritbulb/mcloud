import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PARSERS } from './index'

test('moe parser reads the news teasers', () => {
  const html = readFileSync(join(import.meta.dirname, '../__fixtures__/moe-news.html'), 'utf8')
  const items = PARSERS.moe(html, 'https://www.education.go.ke')
  assert.ok(items.length >= 3)
  assert.equal(items[0].link, '/basic-education-ps-john-ololtuaa-oversee-exams-distribution-langata-nairobi-county')
  assert.match(items[0].title ?? '', /Exams distribution/)
  assert.equal(items[0].published, '2026-10-26T21:00:00.000Z')
  assert.deepEqual(PARSERS.moe('<html></html>', 'https://x.ke'), [])
})
