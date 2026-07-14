import assert from 'node:assert/strict'
import { VERTICALS } from './index'
import { sectionsFor, ALL_TAB_IDS } from './nav'

const shop = sectionsFor(VERTICALS.shop)
const ngo = sectionsFor(VERTICALS.ngo)

const ids = (secs: ReturnType<typeof sectionsFor>) => secs.map((s) => s.id)
const tabIds = (secs: ReturnType<typeof sectionsFor>) => secs.flatMap((s) => s.tabs.map((t) => t.id))

// Shop keeps the commerce surface.
assert.ok(ids(shop).includes('catalog'), 'shop has catalog')
assert.ok(tabIds(shop).includes('products'), 'shop has products')
assert.ok(tabIds(shop).includes('customers'), 'shop has customers')
assert.ok(!tabIds(shop).includes('content'), 'shop has no content tab')

// NGO hides catalog + customers.
assert.ok(!ids(ngo).includes('catalog'), 'ngo hides catalog')
assert.ok(!tabIds(ngo).includes('products'), 'ngo hides products')
assert.ok(!tabIds(ngo).includes('services'), 'ngo hides services')
assert.ok(!tabIds(ngo).includes('customers'), 'ngo hides customers')

// SP6: ONE Editor replaces Design + Content. Content authoring did not go away,
// it became a rail entry inside the Editor, so no vertical shows it as a tab.
assert.ok(tabIds(ngo).includes('editor'), 'ngo has the Editor')
assert.ok(tabIds(shop).includes('editor'), 'shop has the Editor too')
assert.ok(!ids(ngo).includes('content'), 'the separate Content group is gone')
assert.ok(!tabIds(ngo).includes('content'), 'ngo has no separate Content tab')
for (const secs of [shop, ngo]) {
  assert.ok(!tabIds(secs).includes('appearance'), 'the separate Design tab is gone')
}

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
  assert.ok(tabIds(secs).includes('editor'), 'has the editor')
}

// Every tab a vertical shows must be a known tab id, or routing to it 404s.
const KNOWN = new Set<string>(ALL_TAB_IDS)
for (const secs of [shop, ngo]) {
  for (const t of secs.flatMap((s) => s.tabs)) {
    assert.ok(KNOWN.has(t.id), `tab "${t.id}" is in ALL_TAB_IDS`)
  }
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
