import assert from 'node:assert/strict'
import { buildLineTotals } from './orders'

// computes per-line total (price*qty) and subtotal (sum of line totals)
const { items, subtotal } = buildLineTotals([
  { product_id: 'p1', quantity: 2, price: 150, title: 'A' },
  { product_id: null, quantity: 1, price: 500, title: 'Donation' },
])
assert.equal(items[0].total, 300, 'line 1 total = price*qty')
assert.equal(items[1].total, 500, 'line 2 total = price*1')
assert.equal(subtotal, 800, 'subtotal = sum of line totals')

// quantity is floored to an integer >= 1 (mirrors checkout: Math.max(1, Math.floor(...)))
const clamped = buildLineTotals([{ product_id: 'p1', quantity: 2.9, price: 100, title: 'A' }])
assert.equal(clamped.items[0].quantity, 2, 'qty floored')
assert.equal(clamped.items[0].total, 200, 'total uses floored qty')
const zero = buildLineTotals([{ product_id: 'p1', quantity: 0, price: 100, title: 'A' }])
assert.equal(zero.items[0].quantity, 1, 'qty clamped up to 1')

console.log('orders.test.ts: all assertions passed')
