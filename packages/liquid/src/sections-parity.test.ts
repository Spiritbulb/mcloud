import assert from 'node:assert/strict'
import { renderTemplate } from './index'
import { themeIds } from './index'

// Every theme must honour the same contract, so the whole suite runs once per theme.
for (const theme of themeIds()) {
  const store = { id: 's', name: 'S', slug: 's', currency: 'KES', settings: {} }
  const products = [
    { id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null },
    { id: 'p2', name: 'Beta', slug: 'beta', price: 200, images: [], compare_at_price: null },
  ]
  const collections = [{ id: 'c1', name: 'Coll', slug: 'coll', image_url: null, description: null }]

  // all-products: grid + both product names + section id
  const ap = await renderTemplate(`${theme}/sections/all-products`, { store, products })
  assert.ok(ap.includes('id="products"'), 'all-products has #products section')
  assert.ok(ap.includes('Browse Everything'), 'all-products heading present')
  assert.ok(ap.includes('Alpha') && ap.includes('Beta'), 'all-products renders product cards')

  // all-products empty state
  const apEmpty = await renderTemplate(`${theme}/sections/all-products`, { store, products: [] })
  assert.ok(!apEmpty.includes('id="products"'), 'all-products renders no section when there are no products')

  // collections + featured are now self-contained (own max-w-6xl)
  const coll = await renderTemplate(`${theme}/sections/collections-grid`, { store, collections })
  assert.match(coll, /container mx-auto max-w-\dxl/, 'collections-grid carries its own centred container')
  const feat = await renderTemplate(`${theme}/sections/featured-products`, { store, products })
  assert.match(feat, /container mx-auto max-w-\dxl/, 'featured-products carries its own centred container')

  // empty-list guards: sections must render nothing when list is empty
  const collEmpty = await renderTemplate(`${theme}/sections/collections-grid`, { store, collections: [] })
  assert.ok(!collEmpty.includes('Shop by Category'), 'collections-grid with empty list renders nothing (no heading)')
  const featEmpty = await renderTemplate(`${theme}/sections/featured-products`, { store, products: [] })
  assert.ok(!featEmpty.includes('Top Picks'), 'featured-products with empty list renders nothing (no heading)')

  // A theme marks its own markup, so theme CSS can scope to it; Classic stays untouched.
  if (theme === 'classic') assert.ok(!/sf-t-/.test(ap), 'classic carries no theme class')
  else assert.ok(ap.includes(`sf-t-${theme}`), `${theme} marks its sections`)

  console.log('sections-parity.test.ts: all assertions passed')
}
