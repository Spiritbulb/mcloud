import test from 'node:test'
import assert from 'node:assert/strict'
import { computeSeats, UNCOUNTED_ORDER_STATUSES } from './seats'

test('untracked product reports no seat limit', () => {
    const s = computeSeats({ trackInventory: false, capacity: 0, taken: 7 })
    assert.equal(s.trackInventory, false)
    assert.equal(s.capacity, null)
    assert.equal(s.seatsLeft, null)
    assert.equal(s.taken, 7)
})

test('tracked product with no bookings has full capacity left', () => {
    const s = computeSeats({ trackInventory: true, capacity: 33, taken: 0 })
    assert.equal(s.seatsLeft, 33)
    assert.equal(s.capacity, 33)
})

test('tracked product subtracts bookings', () => {
    assert.equal(computeSeats({ trackInventory: true, capacity: 33, taken: 10 }).seatsLeft, 23)
})

test('seatsLeft never goes negative when oversold', () => {
    assert.equal(computeSeats({ trackInventory: true, capacity: 33, taken: 40 }).seatsLeft, 0)
})

test('tracked product with null capacity has zero seats left', () => {
    const s = computeSeats({ trackInventory: true, capacity: null, taken: 0 })
    assert.equal(s.capacity, 0)
    assert.equal(s.seatsLeft, 0)
})

test('missing track flag is treated as tracked (matches stock-logic)', () => {
    assert.equal(computeSeats({ trackInventory: undefined, capacity: 5, taken: 1 }).seatsLeft, 4)
})

test('cancelled and refunded orders release their seats', () => {
    assert.ok(UNCOUNTED_ORDER_STATUSES.includes('cancelled'))
    assert.ok(UNCOUNTED_ORDER_STATUSES.includes('refunded'))
    assert.ok(!UNCOUNTED_ORDER_STATUSES.includes('pending'))
    assert.ok(!UNCOUNTED_ORDER_STATUSES.includes('paid'))
})
