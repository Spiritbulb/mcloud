import assert from 'node:assert/strict'
import { decideLegacyLink, membershipActive, mergeOrderHistory, orderVisibleTo, planOneStepSetup, validateShopperProfile } from './shop-logic'

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

// An order is the shopper's through their Reach customer row, or through their linked old account.
const viewer = { customerId: 'c1', legacyUserId: 'u1' }
assert.equal(orderVisibleTo({ customer_id: 'c1', legacy_user_id: null }, viewer), true)
assert.equal(orderVisibleTo({ customer_id: null, legacy_user_id: 'u1' }, viewer), true)
assert.equal(orderVisibleTo({ customer_id: 'c2', legacy_user_id: 'u2' }, viewer), false)
// null never matches null: a shopper with no customer row must not see every guest order.
assert.equal(orderVisibleTo({ customer_id: null, legacy_user_id: null }, { customerId: null, legacyUserId: null }), false)

// Vendor access: a key member lasts as long as the key; an owner-member (no key) as long as they
// can still manage the store.
assert.equal(membershipActive({ keyId: 'k', keyActive: true, hasStoreAccess: false }), true)
assert.equal(membershipActive({ keyId: 'k', keyActive: false, hasStoreAccess: true }), false)
assert.equal(membershipActive({ keyId: null, keyActive: null, hasStoreAccess: true }), true)
assert.equal(membershipActive({ keyId: null, keyActive: null, hasStoreAccess: false }), false)

// One-step setup only does what is missing, so a retry after a partial failure never makes a
// second org or store.
assert.deepEqual(planOneStepSetup({ manageableOrg: null, existingStoreSlug: null }), ['create_org', 'create_store', 'list', 'join'])
assert.deepEqual(planOneStepSetup({ manageableOrg: { id: 'o' }, existingStoreSlug: null }), ['create_store', 'list', 'join'])
assert.deepEqual(planOneStepSetup({ manageableOrg: { id: 'o' }, existingStoreSlug: 'duka' }), ['list', 'join'])

console.log('shop-logic: passed')
