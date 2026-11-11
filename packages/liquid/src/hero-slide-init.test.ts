import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Liquid } from 'liquidjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { themeIds } from './index'

// Every theme must honour the same contract, so the whole suite runs once per theme.
for (const theme of themeIds()) {
  const here = dirname(fileURLToPath(import.meta.url))
  const themesRoot = join(here, '../themes')
  const src = readFileSync(join(themesRoot, `${theme}/sections/hero.liquid`), 'utf8')
  // Point the engine at the themes root, as the app does. Templates are referenced without extension.
  const engine = new Liquid({ root: [themesRoot], extname: '.liquid' })
  const ctx = {
    store: { name: 'S', settings: {}, commerce: true },
    slides: [
      { title: 'A', image: 'x', subtitle: '', accent: '', buttonText: 'Shop' },
      { title: 'B', image: 'y', subtitle: '', accent: '', buttonText: 'Shop' },
    ],
    campaigns: [],
  }

  test(`${theme}: multi-slide hero init reads #slide=N from the hash`, async () => {
    const html = await engine.parseAndRender(src, ctx)
    assert.match(html, /location\.hash/) // reads the hash
    assert.match(html, /slide=/) // parses slide=N
    assert.match(html, /goTo\(/) // navigates to it
  })
}
