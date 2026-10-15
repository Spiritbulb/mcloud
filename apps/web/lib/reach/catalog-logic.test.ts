import assert from 'node:assert/strict'
import { buildVendorIndex, vendorForProduct, type ListedVendor } from './catalog-logic'

const MARKET = 'store-market'
const mk = (id: string, storeId: string | null): ListedVendor => ({
    id,
    name: id,
    storeId,
    storeSlug: storeId,
    storeUrl: storeId ? `https://app.example/${storeId}` : null,
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

console.log('reach catalog logic ok')
