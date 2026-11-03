import assert from 'node:assert/strict'
import {
    decideLegacyLink,
    findPreviousSetupStore,
    membershipActive,
    mergeOrderHistory,
    orderVisibleTo,
    planOneStepSetup,
    sellingBlockedFor,
    shouldRequestListing,
    shopperAccess,
    validateShopperProfile,
} from './shop-logic'

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

// A retry finds the store an earlier attempt made, even when that attempt had to suffix the slug.
const mine = [
    { slug: 'other', name: 'Other' },
    { slug: 'duka-4821', name: 'Duka' },
]
assert.equal(findPreviousSetupStore(mine, 'Duka', 'duka'), 'duka-4821')
assert.equal(findPreviousSetupStore([{ slug: 'duka', name: 'Duka' }], ' Duka ', 'duka'), 'duka')
assert.equal(findPreviousSetupStore([{ slug: 'dukani', name: 'Dukani' }], 'Duka', 'duka'), null) // another store, not a retry
assert.equal(findPreviousSetupStore([{ slug: 'duka-12', name: 'Different' }], 'Duka', 'duka'), null)

// Shopper routes need a confirmed email: history is matched by email, so an unconfirmed sign-up
// must not read the real owner's orders (whatever the Supabase project setting).
assert.equal(shopperAccess({ emailConfirmed: true }), 'ok')
assert.equal(shopperAccess({ emailConfirmed: false }), 'unconfirmed')

// A Reach buyer account can't sell: refuse before creating anything.
assert.equal(sellingBlockedFor('buyer'), true)
assert.equal(sellingBlockedFor('vendor'), false)
assert.equal(sellingBlockedFor(null), false)

// Joining (or switching to) a store only asks for a listing when it never asked; a store the
// owner switched off stays off, and nothing is re-sent for review.
assert.equal(shouldRequestListing(null), true)
assert.equal(shouldRequestListing({ listed: false, approval_status: 'draft' }), true)
assert.equal(shouldRequestListing({ listed: false, approval_status: 'rejected' }), true)
assert.equal(shouldRequestListing({ listed: false, approval_status: 'approved' }), false)
assert.equal(shouldRequestListing({ listed: true, approval_status: 'pending' }), false)
assert.equal(shouldRequestListing({ listed: true, approval_status: 'approved' }), false)

console.log('shop-logic: passed')
