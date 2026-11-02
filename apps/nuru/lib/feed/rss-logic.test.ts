import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseFeed } from './rss-logic'

const dir = join(import.meta.dirname, '__fixtures__')

for (const f of readdirSync(dir).filter((n) => n.endsWith('.xml'))) {
  test(`fixture ${f}`, () => {
    const items = parseFeed(readFileSync(join(dir, f), 'utf8'))
    assert.ok(items.length >= 1)
    for (const i of items) {
      assert.ok(i.title)
      assert.ok(i.link)
    }
  })
}

test('RSS with CDATA', () => {
  const items = parseFeed(`<rss><channel><item><title><![CDATA[Hi & bye]]></title><link>https://x.ke/a</link>
    <description><![CDATA[<p>Body</p>]]></description><pubDate>Sat, 31 Oct 2026 08:54:56 +0300</pubDate></item></channel></rss>`)
  assert.deepEqual(items, [{ title: 'Hi & bye', link: 'https://x.ke/a', description: '<p>Body</p>', published: 'Sat, 31 Oct 2026 08:54:56 +0300' }])
})

test('RSS with a single item is still an array', () => {
  assert.equal(parseFeed('<rss><channel><item><title>A</title><link>https://x.ke/a</link></item></channel></rss>').length, 1)
})

test('Atom prefers rel=alternate', () => {
  const items = parseFeed(`<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>A</title>
    <link rel="self" href="https://x.ke/self"/><link rel="alternate" href="https://x.ke/a"/>
    <summary>S</summary><updated>2026-10-01T00:00:00Z</updated><published>2026-10-02T00:00:00Z</published></entry>
    <entry><title>B</title><link href="https://x.ke/b"/><content type="html">C</content><updated>2026-10-03T00:00:00Z</updated></entry></feed>`)
  assert.equal(items[0].link, 'https://x.ke/a')
  assert.equal(items[0].description, 'S')
  assert.equal(items[0].published, '2026-10-02T00:00:00Z')
  assert.equal(items[1].link, 'https://x.ke/b')
  assert.equal(items[1].description, 'C')
  assert.equal(items[1].published, '2026-10-03T00:00:00Z')
})

test('unparseable XML returns []', () => {
  assert.deepEqual(parseFeed('<not xml'), [])
  assert.deepEqual(parseFeed(''), [])
})
