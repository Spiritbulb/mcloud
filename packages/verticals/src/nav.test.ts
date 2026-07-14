import assert from 'node:assert/strict'
import { VERTICALS } from './index'
import { sectionsFor } from './nav'

const shop = sectionsFor(VERTICALS.shop)
const ngo = sectionsFor(VERTICALS.ngo)

const ids = (secs: ReturnType<typeof sectionsFor>) => secs.map((s) => s.id)
const tabIds = (secs: ReturnType<typeof sectionsFor>) => secs.flatMap((s) => s.tabs.map((t) => t.id))

// Shop keeps the commerce surface.
assert.ok(ids(shop).includes('catalog'), 'shop has catalog')
assert.ok(tabIds(shop).includes('products'), 'shop has products')
assert.ok(tabIds(shop).includes('customers'), 'shop has customers')
assert.ok(!tabIds(shop).includes('content'), 'shop has no content tab')

// NGO hides catalog + customers, gains content.
assert.ok(!ids(ngo).includes('catalog'), 'ngo hides catalog')
assert.ok(!tabIds(ngo).includes('products'), 'ngo hides products')
assert.ok(!tabIds(ngo).includes('services'), 'ngo hides services')
assert.ok(!tabIds(ngo).includes('customers'), 'ngo hides customers')
assert.ok(tabIds(ngo).includes('content'), 'ngo has content')

// NGO keeps orders (donations ARE orders) but under a donations group.
assert.ok(tabIds(ngo).includes('orders'), 'ngo keeps orders')
assert.ok(ids(ngo).includes('donations'), 'ngo groups them under donations')

// Both keep the vertical-neutral groups.
for (const secs of [shop, ngo]) {
  assert.ok(ids(secs).includes('site'), 'has site group')
  assert.ok(ids(secs).includes('advanced'), 'has advanced')
  assert.ok(ids(secs).includes('account'), 'has account')
  assert.ok(tabIds(secs).includes('home'), 'has overview')
  assert.ok(tabIds(secs).includes('general'), 'has general')
  assert.ok(tabIds(secs).includes('appearance'), 'has design')
}

// Copy rule: no merchant-facing label says Store or Shop.
for (const secs of [shop, ngo]) {
  for (const s of secs) {
    assert.ok(!/store|shop/i.test(s.label), `group label "${s.label}" must not say store/shop`)
    for (const t of s.tabs) {
      assert.ok(!/store|shop/i.test(t.label), `tab label "${t.label}" must not say store/shop`)
    }
  }
}

console.log('nav.test.ts OK')
