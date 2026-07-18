import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Liquid } from 'liquidjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const snippet = readFileSync(join(here, '../themes/classic/snippets/record-anchor.liquid'), 'utf8')
const engine = new Liquid()

test('record-anchor emits attributes when editing', async () => {
  const html = await engine.parseAndRender(snippet, { editing: true, list: 'programs', index: 2 })
  assert.match(html, /data-mcloud-record="1"/)
  assert.match(html, /data-mcloud-list="programs"/)
  assert.match(html, /data-mcloud-index="2"/)
})

test('record-anchor emits nothing when not editing', async () => {
  const html = await engine.parseAndRender(snippet, { editing: false, list: 'programs', index: 2 })
  assert.equal(html.trim(), '')
})
