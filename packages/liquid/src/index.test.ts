import assert from 'node:assert/strict'
import { renderTemplate } from './index'

const ctx = {
    store: { id: 's1', name: 'Test Store', slug: 'test-store', description: 'Hi', currency: 'KES', settings: {} },
    collections: [{ id: 'c1', name: 'Shoes', slug: 'shoes', image_url: null, description: null }],
    featuredProducts: [{ id: 'p1', name: 'Sneaker', slug: 'sneaker', price: 1000, images: [], compare_at_price: null }],
    products: [
        { id: 'p1', name: 'Sneaker', slug: 'sneaker', price: 1000, images: [], compare_at_price: null },
        // XSS probe — must be escaped in output
        { id: 'p2', name: '<script>alert(1)</script>', slug: 'x', price: 500, images: [], compare_at_price: null },
    ],
}

const html = await renderTemplate('classic/templates/index', ctx)

assert.ok(html.includes('Test Store'), 'renders store name in hero')
assert.ok(html.includes('Shoes'), 'renders collection name')
assert.ok(html.includes('Sneaker'), 'renders product name')
assert.ok(html.includes('&lt;script&gt;'), 'escapes XSS in product name')
assert.ok(!html.includes('<script>alert(1)</script>'), 'does not emit raw injected script')

// money filter available
const money = await renderTemplate('classic/sections/product-card', { store: ctx.store, product: ctx.products[0] })
assert.ok(money.includes('1,000') || money.includes('1000'), 'product-card renders a formatted price')

console.log('index.test.ts: all assertions passed')
