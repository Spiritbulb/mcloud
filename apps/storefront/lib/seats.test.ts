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

// Stock is decremented in exactly one place today: reach_settle_payment, when a
// source='reach' order is paid. Every other paid order never touches inventory_quantity.
import { holdsUndecrementedSeat, countTaken } from './seats'

test('pending orders hold a seat whatever their source', () => {
    assert.equal(holdsUndecrementedSeat({ status: 'pending', source: 'reach' }), true)
    assert.equal(holdsUndecrementedSeat({ status: 'pending', source: 'storefront' }), true)
    assert.equal(holdsUndecrementedSeat({ status: 'pending', source: null }), true)
})

test('paid and fulfilled non-reach orders hold a seat (nothing decremented stock)', () => {
    assert.equal(holdsUndecrementedSeat({ status: 'paid', source: 'storefront' }), true)
    assert.equal(holdsUndecrementedSeat({ status: 'fulfilled', source: null }), true)
})

test('paid and fulfilled reach orders do not (reach_settle_payment already decremented)', () => {
    assert.equal(holdsUndecrementedSeat({ status: 'paid', source: 'reach' }), false)
    assert.equal(holdsUndecrementedSeat({ status: 'fulfilled', source: 'reach' }), false)
})

test('cancelled and refunded orders never hold a seat', () => {
    for (const source of ['reach', 'storefront', null]) {
        assert.equal(holdsUndecrementedSeat({ status: 'cancelled', source }), false)
        assert.equal(holdsUndecrementedSeat({ status: 'refunded', source }), false)
    }
})

test('countTaken sums quantities of seat-holding orders only', () => {
    assert.equal(
        countTaken([
            { quantity: 2, order: { status: 'pending', source: 'storefront' } },
            { quantity: 3, order: { status: 'paid', source: 'storefront' } },
            { quantity: 4, order: { status: 'paid', source: 'reach' } },
            { quantity: 5, order: { status: 'cancelled', source: 'storefront' } },
        ]),
        5,
    )
    assert.equal(countTaken([]), 0)
})
