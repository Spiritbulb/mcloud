import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveMobileRole, toAppRole } from './reach-role'

test('maps Reach roles to the strings the mobile app expects', () => {
    assert.equal(toAppRole('buyer'), 'rch-customer')
    assert.equal(toAppRole('vendor'), 'rch-vendor')
})

test('a Reach profile wins over the platform role, which stays untouched', () => {
    assert.equal(resolveMobileRole('admin', 'vendor'), 'rch-vendor')
    assert.equal(resolveMobileRole('customer', 'buyer'), 'rch-customer')
})

test('without a Reach profile the platform role is reported, defaulting to user', () => {
    assert.equal(resolveMobileRole('customer', null), 'customer')
    assert.equal(resolveMobileRole('admin', undefined), 'admin')
    assert.equal(resolveMobileRole(null, null), 'user')
    // an unknown value is not a Reach role
    assert.equal(resolveMobileRole('customer', 'something-else'), 'customer')
})
