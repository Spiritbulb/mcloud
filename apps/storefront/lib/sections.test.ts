import assert from 'node:assert/strict'
import { SECTION_REGISTRY, DEFAULT_HOME_SECTIONS, defaultHomeSections } from './sections'

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

// NGO section types map to their templates and pick only { store }
assert.equal(SECTION_REGISTRY.mission.templateKey, 'classic/sections/mission')
assert.equal(SECTION_REGISTRY.programs.templateKey, 'classic/sections/programs')
assert.equal(SECTION_REGISTRY.impact.templateKey, 'classic/sections/impact')
assert.equal(SECTION_REGISTRY.contact.templateKey, 'classic/sections/contact')
for (const t of ['mission', 'programs', 'impact', 'contact'] as const) {
  assert.deepEqual(Object.keys(SECTION_REGISTRY[t].pickContext(ctx)), ['store'], `${t} picks only store`)
}

// pickContext returns the right keys for commerce sections
assert.deepEqual(Object.keys(SECTION_REGISTRY.hero.pickContext(ctx)), ['store'])
assert.deepEqual(Object.keys(SECTION_REGISTRY.collections.pickContext(ctx)).sort(), ['collections', 'store'])
const feat = SECTION_REGISTRY.featured.pickContext(ctx)
assert.deepEqual((feat as any).products, ctx.featuredProducts, 'featured maps featuredProducts -> products')
const all = SECTION_REGISTRY['all-products'].pickContext(ctx)
assert.deepEqual((all as any).products, ctx.products, 'all-products maps products -> products')

// defaultHomeSections is vertical-aware
assert.deepEqual(defaultHomeSections('shop').map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.deepEqual(defaultHomeSections('ngo').map(s => s.type), ['mission', 'programs', 'impact', 'contact'])
assert.deepEqual(defaultHomeSections('bogus').map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'unknown -> shop')
assert.deepEqual(defaultHomeSections(null).map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'null -> shop')
assert.deepEqual(defaultHomeSections(undefined).map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'undefined -> shop')

// back-compat constant still equals the shop set
assert.deepEqual(DEFAULT_HOME_SECTIONS.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

console.log('sections.test.ts: all assertions passed')
