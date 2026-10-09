import assert from 'node:assert/strict'
import { seedPageRows } from './seed-pages'

// ngo -> the NGO Home page as a pages row
const ngo = seedPageRows('store-1', 'ngo')
assert.equal(ngo.length, 1, 'one seed page for ngo')
assert.equal(ngo[0].store_id, 'store-1')
assert.equal(ngo[0].slug, '')
assert.equal(ngo[0].title, 'Home')
assert.equal(ngo[0].position, 0)
assert.equal(ngo[0].is_published, true)
assert.deepEqual(ngo[0].sections.map(s => s.type), ['mission', 'programs', 'impact', 'contact'])

// shop -> the shop Home page
const shop = seedPageRows('store-2', 'shop')
assert.deepEqual(shop[0].sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.equal(shop[0].store_id, 'store-2')

// unknown / null / undefined -> shop set
assert.deepEqual(seedPageRows('s', 'bogus')[0].sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.deepEqual(seedPageRows('s', null)[0].sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.deepEqual(seedPageRows('s', undefined)[0].sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

console.log('seed-pages.test.ts: all assertions passed')
