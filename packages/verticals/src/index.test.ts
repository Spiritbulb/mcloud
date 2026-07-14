import assert from 'node:assert/strict'
import { VERTICALS, getVertical, isVerticalId } from './index'

// isVerticalId narrows only the two known ids
assert.equal(isVerticalId('shop'), true)
assert.equal(isVerticalId('ngo'), true)
assert.equal(isVerticalId('bogus'), false)
assert.equal(isVerticalId(''), false)

// getVertical: known ids resolve; unknown / null / undefined fall back to shop, never throw
assert.equal(getVertical('shop').id, 'shop')
assert.equal(getVertical('ngo').id, 'ngo')
assert.equal(getVertical('bogus').id, 'shop', 'unknown -> shop')
assert.equal(getVertical(null).id, 'shop', 'null -> shop')
assert.equal(getVertical(undefined).id, 'shop', 'undefined -> shop')

// labels are exact
assert.equal(VERTICALS.shop.label, 'Shop')
assert.equal(VERTICALS.ngo.label, 'NGO')

// shop default pages: one Home page with the four shop sections in order
const shopHome = VERTICALS.shop.defaultPages.find(p => p.slug === '')
assert.ok(shopHome, 'shop has a home page (slug "")')
assert.equal(shopHome.title, 'Home')
assert.equal(shopHome.position, 0)
assert.deepEqual(shopHome.sections.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

// ngo default pages: one Home page with the NGO sections in order. The hero
// leads (mission headline over the site image, with a Donate CTA), so there is
// no separate `mission` section repeating it underneath.
const ngoHome = VERTICALS.ngo.defaultPages.find(p => p.slug === '')
assert.ok(ngoHome, 'ngo has a home page (slug "")')
assert.equal(ngoHome.title, 'Home')
assert.equal(ngoHome.position, 0)
assert.deepEqual(ngoHome.sections.map(s => s.type), ['hero', 'programs', 'impact', 'campaigns', 'contact'])

console.log('verticals/index.test.ts: all assertions passed')
