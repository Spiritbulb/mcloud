import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FULFILLMENT_STATUSES, PAYMENT_STATUSES, filterCounts, filterOrders, formatMoney, itemCount, orderStats, statusLabel } from './order-logic.ts'

const ORDERS = [
    { id: 'a', status: 'pending', fulfillment_status: 'unfulfilled', total: 4 },
    { id: 'b', status: 'paid', fulfillment_status: 'fulfilled', total: 141 },
    { id: 'c', status: 'pending', fulfillment_status: 'unfulfilled', total: 56 },
    { id: 'd', status: 'paid', fulfillment_status: 'fulfilled', total: '380' },
    { id: 'e', status: 'cancelled', fulfillment_status: 'unfulfilled', total: 10 },
]

test('filters match payment or fulfilment status; "all" keeps everything', () => {
    assert.equal(filterOrders(ORDERS, 'all').length, 5)
    assert.deepEqual(filterOrders(ORDERS, 'pending').map((o) => o.id), ['a', 'c'])
    assert.deepEqual(filterOrders(ORDERS, 'fulfilled').map((o) => o.id), ['b', 'd'])
    assert.deepEqual(filterOrders(ORDERS, 'cancelled').map((o) => o.id), ['e'])
})

test('revenue counts paid orders only, and copes with totals stored as text', () => {
    assert.deepEqual(orderStats(ORDERS), { total: 5, pending: 2, paid: 2, revenue: 521 })
    assert.deepEqual(orderStats([]), { total: 0, pending: 0, paid: 0, revenue: 0 })
})

test('tab counts line up with the filters', () => {
    assert.deepEqual(filterCounts(ORDERS), { all: 5, pending: 2, paid: 2, fulfilled: 2, cancelled: 1 })
})

test('labels and money', () => {
    assert.equal(statusLabel('partially_paid'), 'Partially paid')
    assert.equal(statusLabel('paid'), 'Paid')
    assert.equal(statusLabel(null), '—')
    assert.equal(itemCount(1), '1 item')
    assert.equal(itemCount(3), '3 items')
    assert.equal(itemCount(undefined), '0 items')
    assert.match(formatMoney('KES', 2795), /^KES 2,795$/)
})

test('settable statuses stay inside the database check constraints', () => {
    // Copied from orders_status_check / orders_fulfillment_status_check (2026-10-23). If a migration
    // widens them, update both: an offered value outside them fails every save.
    const dbStatus = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']
    const dbFulfillment = ['unfulfilled', 'partially_fulfilled', 'fulfilled']
    for (const s of PAYMENT_STATUSES) assert.ok(dbStatus.includes(s), s)
    for (const s of FULFILLMENT_STATUSES) assert.ok(dbFulfillment.includes(s), s)
})
