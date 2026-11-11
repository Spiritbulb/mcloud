// Layout variants a merchant picks per section (section.layout, section.columns,
// section.card_style ...). Every default equals what the template rendered before
// the option existed, so an untouched store is unchanged.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderTemplate } from './index'

const store = { id: 's', name: 'S', slug: 's', currency: 'KES', settings: {}, commerce: true }
const products = [{ id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null }]
const collections = [{ id: 'c1', name: 'Coll', slug: 'coll', image_url: null, description: null }]
const slides = [{ title: 'A', image: 'https://x/a.jpg', subtitle: 'sub', accent: '', buttonText: 'Shop' }]

test('hero defaults to the full-bleed layout at standard height', async () => {
  const html = await renderTemplate('classic/sections/hero', { store, slides, campaigns: [], section: {} })
  assert.match(html, /sf-hero--full/)
  assert.match(html, /sf-hero--h-standard/)
  assert.match(html, /<img[^>]+a\.jpg/, 'the image renders as the background')
})

test('hero split layout keeps the image beside the copy', async () => {
  const html = await renderTemplate('classic/sections/hero', { store, slides, campaigns: [], section: { layout: 'split', height: 'tall' } })
  assert.match(html, /sf-hero--split/)
  assert.match(html, /sf-hero--h-tall/)
  assert.match(html, /<img[^>]+a\.jpg/)
  assert.doesNotMatch(html, /sf-hero--full/)
})

test('hero minimal layout drops the image and keeps the copy and CTA', async () => {
  const html = await renderTemplate('classic/sections/hero', { store, slides, campaigns: [], section: { layout: 'minimal', height: 'short' } })
  assert.match(html, /sf-hero--minimal/)
  assert.match(html, /sf-hero--h-short/)
  assert.doesNotMatch(html, /<img/, 'no image in the minimal layout')
  assert.match(html, />A</, 'title still renders')
  assert.match(html, /Shop/, 'CTA still renders')
})

test('an unknown hero layout falls back to full', async () => {
  const html = await renderTemplate('classic/sections/hero', { store, slides, campaigns: [], section: { layout: 'bogus' } })
  assert.match(html, /sf-hero--full/)
})

for (const key of ['all-products', 'featured-products'] as const) {
  test(`${key} defaults to the auto grid with flat cards`, async () => {
    const html = await renderTemplate(`classic/sections/${key}`, { store, products, section: {} })
    assert.match(html, /sf-grid--auto/)
    assert.match(html, /sf-product-card--flat/)
  })
  test(`${key} honours columns and card style`, async () => {
    const html = await renderTemplate(`classic/sections/${key}`, { store, products, section: { columns: '3', card_style: 'bordered' } })
    assert.match(html, /sf-grid--3/)
    assert.match(html, /sf-product-card--bordered/)
    assert.doesNotMatch(html, /sf-product-card--flat/)
  })
}

test('collections grid honours columns', async () => {
  const dflt = await renderTemplate('classic/sections/collections-grid', { store, collections, section: {} })
  assert.match(dflt, /sf-grid--auto/)
  const two = await renderTemplate('classic/sections/collections-grid', { store, collections, section: { columns: '2' } })
  assert.match(two, /sf-grid--2/)
})
