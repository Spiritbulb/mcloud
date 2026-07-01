import assert from 'node:assert/strict'
import { buildHomeContext } from './liquid-context'

const ctx = buildHomeContext({
    store: { id: 's1', name: 'S', slug: 's', description: 'd', currency: 'KES', logo_url: null, settings: { heroTitle: 'Hi' } },
    products: [{ id: 'p1', name: 'A', slug: 'a', price: 100, images: [], compare_at_price: null }],
    collections: [{ id: 'c1', name: 'C', slug: 'c', image_url: null, description: null }],
    featuredProducts: [{ id: 'p1', name: 'A', slug: 'a', price: 100, images: [], compare_at_price: null }],
})

assert.equal(ctx.store.slug, 's')
assert.equal(ctx.store.settings.heroTitle, 'Hi')
assert.equal(ctx.products.length, 1)
assert.equal(ctx.collections.length, 1)
assert.equal(ctx.featuredProducts.length, 1)

console.log('liquid-context.test.ts: all assertions passed')
