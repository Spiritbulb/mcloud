import assert from 'node:assert/strict'
import { renderTemplate } from './index'

const store = { id: 's', name: 'S', slug: 's', currency: 'KES', settings: {} }
const products = [
  { id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null },
  { id: 'p2', name: 'Beta', slug: 'beta', price: 200, images: [], compare_at_price: null },
]
const collections = [{ id: 'c1', name: 'Coll', slug: 'coll', image_url: null, description: null }]

// all-products: grid + both product names + section id
const ap = await renderTemplate('classic/sections/all-products', { store, products })
assert.ok(ap.includes('id="products"'), 'all-products has #products section')
assert.ok(ap.includes('Browse Everything'), 'all-products heading present')
assert.ok(ap.includes('Alpha') && ap.includes('Beta'), 'all-products renders product cards')

// all-products empty state
const apEmpty = await renderTemplate('classic/sections/all-products', { store, products: [] })
assert.ok(apEmpty.includes('No products yet'), 'all-products empty state')

// collections + featured are now self-contained (own max-w-6xl)
const coll = await renderTemplate('classic/sections/collections-grid', { store, collections })
assert.ok(coll.includes('max-w-6xl'), 'collections-grid carries its own max-w-6xl container')
const feat = await renderTemplate('classic/sections/featured-products', { store, products })
assert.ok(feat.includes('max-w-6xl'), 'featured-products carries its own max-w-6xl container')

console.log('sections-parity.test.ts: all assertions passed')
