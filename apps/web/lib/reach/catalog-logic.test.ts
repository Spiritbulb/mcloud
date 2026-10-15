import assert from 'node:assert/strict'
import { buildVendorIndex, vendorDelivers, vendorForProduct, type ListedVendor } from './catalog-logic'

const MARKET = 'store-market'
const mk = (id: string, storeId: string | null, areaIds: string[] = []): ListedVendor => ({
    id,
    name: id,
    storeId,
    storeSlug: storeId,
    storeUrl: storeId ? `https://app.example/${storeId}` : null,
    areaIds,
    legacy: !storeId,
})

const shop = mk('v-shop', 'store-a')
const legacy = mk('v-legacy', null)
const index = buildVendorIndex([shop, legacy], [{ product_id: 'p-legacy', vendor_id: 'v-legacy' }], MARKET)

// A store-backed vendor sells every product of its store.
assert.equal(vendorForProduct({ id: 'anything', store_id: 'store-a' }, index)?.id, 'v-shop')

// A store that is not listed sells nothing.
assert.equal(vendorForProduct({ id: 'p', store_id: 'store-unlisted' }, index), null)

// Legacy: products in the marketplace store go to their assigned vendor...
assert.equal(vendorForProduct({ id: 'p-legacy', store_id: MARKET }, index)?.id, 'v-legacy')
// ...and an unassigned one is not sold at all.
assert.equal(vendorForProduct({ id: 'p-orphan', store_id: MARKET }, index), null)

// A legacy link to a vendor that is no longer listed does not resolve.
const delisted = buildVendorIndex([shop], [{ product_id: 'p-legacy', vendor_id: 'v-legacy' }], MARKET)
assert.equal(vendorForProduct({ id: 'p-legacy', store_id: MARKET }, delisted), null)

// A legacy link cannot be used to sell a product that lives in another store.
assert.equal(vendorForProduct({ id: 'p-legacy', store_id: 'store-b' }, index), null)

// Delivery areas: a vendor delivers where its home or extra areas reach; a legacy vendor with no
// area delivers everywhere until an admin places it.
const area = (id: string, parent: string | null) => ({ id, parent_id: parent, name: id, slug: id, lat: null, lng: null })
const areas = [area('nbi', null), area('wl', 'nbi'), area('kl', 'nbi'), area('nku', null)]
assert.equal(vendorDelivers(mk('a', 's', ['wl']), areas, 'wl'), true)
assert.equal(vendorDelivers(mk('a', 's', ['wl', 'kl']), areas, 'kl'), true)
assert.equal(vendorDelivers(mk('a', 's', ['wl']), areas, 'kl'), false)
assert.equal(vendorDelivers(mk('a', 's', ['wl']), areas, 'nku'), false)
assert.equal(vendorDelivers(mk('old', null, []), areas, 'nku'), true)
assert.equal(vendorDelivers(mk('s', 's', []), areas, 'wl'), false) // store-backed with no area never delivers

console.log('reach catalog logic ok')
