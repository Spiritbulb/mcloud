import assert from 'node:assert/strict'
import { decideLegacyLink, mergeOrderHistory, validateShopperProfile } from './shop-logic'

const buyer = { userId: 'u1', platformRole: 'customer', reachRole: 'buyer', alreadyLinked: false }

// Only a confirmed email may claim an old account: otherwise anyone could sign up with a victim's
// address and inherit their orders and M-Pesa number.
assert.equal(decideLegacyLink({ emailConfirmed: false, candidate: buyer }), null)
assert.equal(decideLegacyLink({ emailConfirmed: true, candidate: buyer }), 'u1')

// Only buyers are shoppers: never a vendor, never a platform admin, never twice.
assert.equal(decideLegacyLink({ emailConfirmed: true, candidate: { ...buyer, reachRole: 'vendor' } }), null)
assert.equal(decideLegacyLink({ emailConfirmed: true, candidate: { ...buyer, reachRole: null } }), null)
assert.equal(decideLegacyLink({ emailConfirmed: true, candidate: { ...buyer, platformRole: 'admin' } }), null)
assert.equal(decideLegacyLink({ emailConfirmed: true, candidate: { ...buyer, alreadyLinked: true } }), null)
assert.equal(decideLegacyLink({ emailConfirmed: true, candidate: null }), null)

// Profile input.
assert.equal(validateShopperProfile({ name: 'A' }).ok, false)
assert.deepEqual(validateShopperProfile({ name: ' Ann ', mpesaPhone: '+254 712 345 678' }), {
    ok: true,
    name: 'Ann',
    mpesaPhone: '0712345678',
})
assert.equal(validateShopperProfile({ mpesaPhone: '12' }).ok, false)
assert.equal(validateShopperProfile(null).ok, false)
assert.deepEqual(validateShopperProfile({}), { ok: true })

// History: de-duplicated by id, newest first.
const merged = mergeOrderHistory(
    [{ id: 'a', created_at: '2026-01-01T00:00:00Z' }, { id: 'b', created_at: '2026-03-01T00:00:00Z' }],
    [{ id: 'a', created_at: '2026-01-01T00:00:00Z' }, { id: 'c', created_at: '2026-02-01T00:00:00Z' }],
)
assert.deepEqual(merged.map((o) => o.id), ['b', 'c', 'a'])

console.log('shop-logic: passed')
