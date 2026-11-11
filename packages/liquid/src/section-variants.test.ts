// Layout variants a merchant picks per section (section.layout, section.columns,
// section.card_style ...). Every default equals what the template rendered before
// the option existed, so an untouched store is unchanged.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderTemplate } from './index'
import { themeIds } from './index'

// Every theme must honour the same contract, so the whole suite runs once per theme.
for (const theme of themeIds()) {
  const store = { id: 's', name: 'S', slug: 's', currency: 'KES', settings: {}, commerce: true }
  const products = [{ id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null }]
  const collections = [{ id: 'c1', name: 'Coll', slug: 'coll', image_url: null, description: null }]
  const slides = [{ title: 'A', image: 'https://x/a.jpg', subtitle: 'sub', accent: '', buttonText: 'Shop' }]

  test(`${theme}: hero defaults to the full-bleed layout at standard height`, async () => {
    const html = await renderTemplate(`${theme}/sections/hero`, { store, slides, campaigns: [], section: {} })
    assert.match(html, /sf-hero--full/)
    assert.match(html, /sf-hero--h-standard/)
    assert.match(html, /<img[^>]+a\.jpg/, 'the image renders as the background')
  })

  test(`${theme}: hero split layout keeps the image beside the copy`, async () => {
    const html = await renderTemplate(`${theme}/sections/hero`, { store, slides, campaigns: [], section: { layout: 'split', height: 'tall' } })
    assert.match(html, /sf-hero--split/)
    assert.match(html, /sf-hero--h-tall/)
    assert.match(html, /<img[^>]+a\.jpg/)
    assert.doesNotMatch(html, /sf-hero--full/)
  })

  test(`${theme}: hero minimal layout drops the image and keeps the copy and CTA`, async () => {
    const html = await renderTemplate(`${theme}/sections/hero`, { store, slides, campaigns: [], section: { layout: 'minimal', height: 'short' } })
    assert.match(html, /sf-hero--minimal/)
    assert.match(html, /sf-hero--h-short/)
    assert.doesNotMatch(html, /<img/, 'no image in the minimal layout')
    assert.match(html, />A</, 'title still renders')
    assert.match(html, /Shop/, 'CTA still renders')
  })

  test(`${theme}: an unknown hero layout falls back to full`, async () => {
    const html = await renderTemplate(`${theme}/sections/hero`, { store, slides, campaigns: [], section: { layout: 'bogus' } })
    assert.match(html, /sf-hero--full/)
  })

  for (const key of ['all-products', 'featured-products'] as const) {
    test(`${theme}: ${key} defaults to the auto grid with flat cards`, async () => {
      const html = await renderTemplate(`${theme}/sections/${key}`, { store, products, section: {} })
      assert.match(html, /sf-grid--auto/)
      assert.match(html, /sf-product-card--flat/)
    })
    test(`${theme}: ${key} honours columns and card style`, async () => {
      const html = await renderTemplate(`${theme}/sections/${key}`, { store, products, section: { columns: '3', card_style: 'bordered' } })
      assert.match(html, /sf-grid--3/)
      assert.match(html, /sf-product-card--bordered/)
      assert.doesNotMatch(html, /sf-product-card--flat/)
    })
  }

  test(`${theme}: collections grid honours columns`, async () => {
    const dflt = await renderTemplate(`${theme}/sections/collections-grid`, { store, collections, section: {} })
    assert.match(dflt, /sf-grid--auto/)
    const two = await renderTemplate(`${theme}/sections/collections-grid`, { store, collections, section: { columns: '2' } })
    assert.match(two, /sf-grid--2/)
  })
}

// A slide with a photo is marked, so a theme can style text "on the image" without
// guessing (Studio draws white type there). Classic's markup is left untouched.
for (const theme of themeIds().filter((t) => t !== 'classic')) {
  test(`${theme}: hero marks slides that have an image`, async () => {
    const store = { name: 'S', slug: 's', settings: {}, commerce: true }
    const withImg = await renderTemplate(`${theme}/sections/hero`, { store, campaigns: [], section: {}, slides: [{ title: 'A', image: 'https://x/a.jpg', buttonText: 'Go' }] })
    const noImg = await renderTemplate(`${theme}/sections/hero`, { store, campaigns: [], section: {}, slides: [{ title: 'A', image: '', buttonText: 'Go' }] })
    assert.match(withImg, /sf-hero__slide--image/)
    assert.doesNotMatch(noImg, /sf-hero__slide--image/)
  })
}
