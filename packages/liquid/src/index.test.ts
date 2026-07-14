import assert from 'node:assert/strict'
import { renderTemplate } from './index'

// The composite `classic/templates/index` template was removed when the
// storefront moved to a section-list render model (sub-project 2). This test now
// exercises the individual section templates the package ships, which is what
// `renderTemplate` is actually used with.

const store = { id: 's1', name: 'Test Store', slug: 'test-store', description: 'Hi', currency: 'KES', settings: {} }
const collections = [{ id: 'c1', name: 'Shoes', slug: 'shoes', image_url: null, description: null }]
const products = [
    { id: 'p1', name: 'Sneaker', slug: 'sneaker', price: 1000, images: [], compare_at_price: null },
    // XSS probe — must be escaped in output
    { id: 'p2', name: '<script>alert(1)</script>', slug: 'x', price: 500, images: [], compare_at_price: null },
]

// The hero renders a LIST of slides. It has one shape now (a single-image hero is a
// list of one), and the storefront's lib/hero.ts normalises whatever a store has —
// including the legacy flat heroTitle/heroImage keys — into that list. This package
// is a dumb renderer, so the caller supplies them.
const hero = await renderTemplate('classic/sections/hero', {
    store,
    slides: [{ title: 'Test Store', subtitle: '', image: '', accent: '', buttonText: 'Shop now' }],
    authored: [{ title: '', subtitle: '', image: '', accent: '', buttonText: '' }],
})
assert.ok(hero.includes('Test Store'), 'hero renders its slide')

// collections-grid renders the collection name
const coll = await renderTemplate('classic/sections/collections-grid', { store, collections })
assert.ok(coll.includes('Shoes'), 'renders collection name')

// all-products renders product names AND escapes an XSS attempt in a name
const all = await renderTemplate('classic/sections/all-products', { store, products })
assert.ok(all.includes('Sneaker'), 'renders product name')
assert.ok(all.includes('&lt;script&gt;'), 'escapes XSS in product name')
assert.ok(!all.includes('<script>alert(1)</script>'), 'does not emit raw injected script')

// money filter available in product-card
const money = await renderTemplate('classic/sections/product-card', { store, product: products[0] })
assert.ok(money.includes('1,000') || money.includes('1000'), 'product-card renders a formatted price')

console.log('index.test.ts: all assertions passed')
