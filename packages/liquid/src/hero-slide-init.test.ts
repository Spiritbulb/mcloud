import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Liquid } from 'liquidjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const themesRoot = join(here, '../themes')
const src = readFileSync(join(themesRoot, 'classic/sections/hero.liquid'), 'utf8')
// Point the engine at the themes root so `{% render 'classic/snippets/...' %}`
// inside the hero resolves. Snippets are referenced without extension.
const engine = new Liquid({ root: [themesRoot], extname: '.liquid' })
const ctx = {
  store: { name: 'S', settings: {}, editing: true, commerce: true },
  slides: [
    { title: 'A', image: 'x', subtitle: '', accent: '', buttonText: 'Shop' },
    { title: 'B', image: 'y', subtitle: '', accent: '', buttonText: 'Shop' },
  ],
  authored: [{ title: 'A' }, { title: 'B' }],
  campaigns: [],
}

test('multi-slide hero init reads #slide=N from the hash', async () => {
  const html = await engine.parseAndRender(src, ctx)
  assert.match(html, /location\.hash/) // reads the hash
  assert.match(html, /slide=/) // parses slide=N
  assert.match(html, /goTo\(/) // navigates to it
})
