import assert from 'node:assert/strict'
import { SECTION_REGISTRY, DEFAULT_HOME_SECTIONS } from './sections'

const ctx = {
  store: { slug: 's' },
  products: [{ id: 'p1' }],
  collections: [{ id: 'c1' }],
  featuredProducts: [{ id: 'p1' }],
}

// every known type maps to an existing classic section template key
for (const [type, def] of Object.entries(SECTION_REGISTRY)) {
  assert.ok(def.templateKey.startsWith('classic/sections/'), `${type} maps to a classic section`)
}
assert.equal(SECTION_REGISTRY.hero.templateKey, 'classic/sections/hero')
assert.equal(SECTION_REGISTRY.collections.templateKey, 'classic/sections/collections-grid')
assert.equal(SECTION_REGISTRY.featured.templateKey, 'classic/sections/featured-products')
assert.equal(SECTION_REGISTRY['all-products'].templateKey, 'classic/sections/all-products')

// pickContext returns the right keys
assert.deepEqual(Object.keys(SECTION_REGISTRY.hero.pickContext(ctx)), ['store'])
assert.deepEqual(Object.keys(SECTION_REGISTRY.collections.pickContext(ctx)).sort(), ['collections', 'store'])
const feat = SECTION_REGISTRY.featured.pickContext(ctx)
assert.deepEqual((feat as any).products, ctx.featuredProducts, 'featured maps featuredProducts -> products')
const all = SECTION_REGISTRY['all-products'].pickContext(ctx)
assert.deepEqual((all as any).products, ctx.products, 'all-products maps products -> products')

// default home = the four sections in order
assert.deepEqual(DEFAULT_HOME_SECTIONS.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

console.log('sections.test.ts: all assertions passed')
