import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cartShippingLabel, initialZoneId, zoneProblem } from './delivery-zones-logic'

test('initialZoneId preselects only when there is nothing to choose between', () => {
    assert.equal(initialZoneId([]), null)
    assert.equal(initialZoneId([{ id: 'a', available: true }]), 'a')
    assert.equal(initialZoneId([{ id: 'a', available: true }, { id: 'b', available: false }]), 'a')
    // several available zones: the shopper must choose, nothing is picked for them
    assert.equal(initialZoneId([{ id: 'a', available: true }, { id: 'b', available: true }]), null)
    assert.equal(initialZoneId([{ id: 'a', available: false }]), null)
})

test('the cart only says Free when the store has no delivery zones', () => {
    assert.equal(cartShippingLabel(true), 'Calculated at checkout')
    assert.equal(cartShippingLabel(false), 'Free')
    assert.equal(cartShippingLabel(undefined), 'Free')
})

test('a blank or invalid rate is rejected, an explicit 0 is free on purpose', () => {
    assert.equal(zoneProblem([{ location_name: 'Nairobi', rate: 0, available: true }]), null)
    assert.equal(zoneProblem([{ location_name: 'Nairobi', rate: '380', available: true }]), null)
    assert.match(zoneProblem([{ location_name: 'Nairobi', rate: null, available: true }]) ?? '', /Set a rate for Nairobi/)
    assert.match(zoneProblem([{ location_name: 'Nairobi', rate: '', available: true }]) ?? '', /Set a rate/)
    assert.match(zoneProblem([{ location_name: 'Nairobi', rate: undefined }]) ?? '', /Set a rate/)
    assert.match(zoneProblem([{ location_name: 'Nairobi', rate: -5, available: true }]) ?? '', /Set a rate/)
    assert.match(zoneProblem([{ location_name: 'Nairobi', rate: Number.NaN, available: true }]) ?? '', /Set a rate/)
})

test('a zone that is switched off needs no rate, but every zone needs a name', () => {
    assert.equal(zoneProblem([{ location_name: 'Mombasa', rate: null, available: false }]), null)
    assert.match(zoneProblem([{ location_name: '  ', rate: 100, available: true }]) ?? '', /location name/)
    assert.match(zoneProblem([{ rate: 100, available: true }]) ?? '', /location name/)
})
