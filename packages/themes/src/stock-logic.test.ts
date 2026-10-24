import assert from 'node:assert/strict'
import { isInStock, maxOrderQuantity, showsStockCount, UNTRACKED_MAX_QUANTITY } from './stock-logic'

// Untracked products are always buyable (munch-hub's whole menu read "Out of stock" because
// the React themes ignored track_inventory and saw inventory_quantity = 0).
assert.equal(isInStock({ track_inventory: false, inventory_quantity: 0 }), true)
assert.equal(isInStock({ track_inventory: false, inventory_quantity: null }), true)
assert.equal(maxOrderQuantity({ track_inventory: false, inventory_quantity: 0 }), UNTRACKED_MAX_QUANTITY)
assert.equal(showsStockCount({ track_inventory: false, inventory_quantity: 0 }), false)

// Tracked products follow the count.
assert.equal(isInStock({ track_inventory: true, inventory_quantity: 22 }), true)
assert.equal(isInStock({ track_inventory: true, inventory_quantity: 0 }), false)
assert.equal(isInStock({ track_inventory: true, inventory_quantity: -3 }), false)
assert.equal(maxOrderQuantity({ track_inventory: true, inventory_quantity: 22 }), 22)
assert.equal(maxOrderQuantity({ track_inventory: true, inventory_quantity: -3 }), 0)
assert.equal(showsStockCount({ track_inventory: true, inventory_quantity: 22 }), true)
assert.equal(showsStockCount({ track_inventory: true, inventory_quantity: 0 }), false)

// A missing flag keeps the old, conservative behaviour: tracked.
assert.equal(isInStock({ inventory_quantity: 0 }), false)
assert.equal(isInStock({ track_inventory: null, inventory_quantity: 5 }), true)
assert.equal(maxOrderQuantity({}), 0)

console.log('stock logic tests passed')
