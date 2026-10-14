import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeOrder, formatAddress, ownsOrder, viewOrder, type OrderRow } from './order-view'

const order: OrderRow = {
    order_number: 'ORD-1-ABC',
    status: 'paid',
    fulfillment_status: 'unfulfilled',
    currency: 'KES',
    total: '1380.00',
    subtotal: '1000',
    shipping: '380',
    created_at: '2026-10-14T10:00:00Z',
    tracking_number: 'TRK123',
    customer_email: 'shopper@example.com',
    customer_phone: '0712345678',
    shipping_address: { street: '1 Moi Ave', city: 'Nairobi' },
    order_items: [{ title: 'Shea butter', variant_title: '200g', quantity: 2, price: '500', total: '1000' }],
}

test('the anonymous view carries no contact, address, tracking, fee or prices', () => {
    const v = viewOrder(order, false)
    assert.equal(v.detail, 'basic')
    assert.deepEqual(v.items, [{ title: 'Shea butter', variantTitle: '200g', quantity: 2 }])
    const serialised = JSON.stringify(v)
    for (const secret of ['shopper@example.com', '0712345678', 'Moi Ave', 'TRK123', 'price', 'subtotal', 'shipping', 'contact']) {
        assert.ok(!serialised.includes(secret), `anonymous view leaked ${secret}`)
    }
    assert.equal(v.total, 1380) // numeric strings from the database are coerced
})

test('the owner view adds the detail the anonymous one withholds', () => {
    const v = viewOrder(order, true)
    assert.equal(v.detail, 'full')
    if (v.detail !== 'full') return
    assert.equal(v.shipping, 380)
    assert.equal(v.subtotal, 1000)
    assert.equal(v.trackingNumber, 'TRK123')
    assert.deepEqual(v.contact, { email: 'shopper@example.com', phone: '0712345678' })
    assert.equal(v.items[0].price, 500)
})

test('ownership: linked orders match by id only; unlinked guest orders match by verified email', () => {
    const me = { id: 'c1', email: 'Shopper@Example.com' }
    assert.equal(ownsOrder({ customer_id: 'c1' }, me), true)
    assert.equal(ownsOrder({ customer_id: 'c2', customer_email: 'shopper@example.com' }, me), false) // linked to someone else
    assert.equal(ownsOrder({ customer_id: null, customer_email: 'shopper@example.com' }, me), true)
    assert.equal(ownsOrder({ customer_id: null, customer_email: 'other@example.com' }, me), false)
    assert.equal(ownsOrder({ customer_id: null, customer_email: null }, me), false)
    assert.equal(ownsOrder({ customer_id: 'c1' }, null), false)
})

test('status wording matches the statuses in use', () => {
    assert.equal(describeOrder('pending', 'unfulfilled').paid, false)
    assert.equal(describeOrder('pending', 'fulfilled').paid, false) // exists in real data: still unpaid
    assert.equal(describeOrder('paid', 'unfulfilled').headline, 'Paid')
    assert.equal(describeOrder('paid', 'fulfilled').headline, 'Paid and fulfilled')
    assert.equal(describeOrder('cancelled', null).paid, false)
})

test('an address is one readable line, or nothing', () => {
    assert.equal(formatAddress({ street: '1 Moi Ave', city: 'Nairobi', zip: '' }), '1 Moi Ave, Nairobi')
    assert.equal(formatAddress({ lat: 1.2, ok: true }), null)
    assert.equal(formatAddress(null), null)
    assert.equal(formatAddress('1 Moi Ave'), null)
    assert.equal(formatAddress(['a']), null)
})
