import test from 'node:test'
import assert from 'node:assert/strict'
import { stripHtml, clampSummary, canonicalUrl, titleKey, normalizeItem } from './normalize-logic'

test('stripHtml removes tags and decodes entities', () => {
  assert.equal(stripHtml('<p>KUCCPS&#8217;s <b>portal</b>&nbsp;opens</p>'), 'KUCCPS’s portal opens')
  assert.equal(stripHtml('A &amp; B &lt;c&gt; &#x41;'), 'A & B <c> A')
  assert.equal(stripHtml('a\n\n  b\t c'), 'a b c')
})

test('clampSummary cuts at a word boundary', () => {
  const out = clampSummary('word '.repeat(100))
  assert.ok(out.length <= 280)
  assert.ok(out.endsWith('…'))
  assert.equal(clampSummary('short'), 'short')
})

test('canonicalUrl', () => {
  assert.equal(canonicalUrl('/news/a?utm_source=x&id=2#top', 'https://www.cue.or.ke'), 'https://www.cue.or.ke/news/a?id=2')
  assert.equal(canonicalUrl('javascript:alert(1)', 'https://x.ke'), null)
  assert.equal(canonicalUrl('HTTPS://WWW.X.KE/a?fbclid=1&gclid=2', 'https://x.ke'), 'https://www.x.ke/a')
  assert.equal(canonicalUrl('http://[bad', 'not a base'), null)
})

test('titleKey', () => {
  assert.equal(titleKey('HELB: Loans, Now Open!'), titleKey('helb loans now open'))
  assert.equal(titleKey('x'.repeat(200)).length, 80)
})

test('normalizeItem', () => {
  const now = new Date('2026-11-02T00:00:00Z')
  assert.equal(normalizeItem({ title: 'T', link: '/a', published: '2027-01-01' }, 'https://x.ke', now)?.publishedAt, null)
  assert.equal(normalizeItem({ title: 'T', link: '/a', published: 'not a date' }, 'https://x.ke', now)?.publishedAt, null)
  assert.equal(normalizeItem({ link: '/a' }, 'https://x.ke', now), null)
  assert.equal(normalizeItem({ title: 'T' }, 'https://x.ke', now), null)
  const ok = normalizeItem({ title: ' <b>T</b> ', link: '/a', description: '<p>Hi</p>', published: '2026-11-01T00:00:00Z' }, 'https://x.ke', now)
  assert.equal(ok?.url, 'https://x.ke/a')
  assert.equal(ok?.title, 'T')
  assert.equal(ok?.summary, 'Hi')
  assert.equal(ok?.publishedAt?.toISOString(), '2026-11-01T00:00:00.000Z')
})
