import assert from 'node:assert/strict'
import { adminDecide, isSellable, ownerRequestListing } from './reach-approval'

const base = { approval_status: 'approved' as const, listed: true, active: true, area_id: 'wl' }
assert.equal(isSellable(base), true)
assert.equal(isSellable({ ...base, listed: false }), false)
assert.equal(isSellable({ ...base, active: false }), false)
assert.equal(isSellable({ ...base, approval_status: 'pending' }), false)
assert.equal(isSellable({ ...base, approval_status: 'suspended' }), false)
assert.equal(isSellable({ ...base, area_id: null }), false)
assert.equal(isSellable({ ...base, area_id: null, legacy: true }), true) // grandfathered, sells everywhere

// Owner asks to list.
assert.deepEqual(ownerRequestListing({ approval_status: 'draft', area_id: 'wl' }), { ok: true, status: 'pending' })
assert.deepEqual(ownerRequestListing({ approval_status: 'rejected', area_id: 'wl' }), { ok: true, status: 'pending' })
assert.deepEqual(ownerRequestListing({ approval_status: 'approved', area_id: 'wl' }), { ok: true, status: 'approved' })
assert.deepEqual(ownerRequestListing({ approval_status: 'pending', area_id: 'wl' }), { ok: true, status: 'pending' })
assert.equal(ownerRequestListing({ approval_status: 'draft', area_id: null }).ok, false)
assert.equal(ownerRequestListing({ approval_status: 'suspended', area_id: 'wl' }).ok, false) // cannot bypass a suspension

// Admin decisions.
const pending = { approval_status: 'pending' as const, area_id: 'wl' }
assert.deepEqual(adminDecide(pending, 'approve'), { ok: true, status: 'approved' })
assert.equal(adminDecide({ ...pending, area_id: null }, 'approve').ok, false)
assert.equal(adminDecide({ approval_status: 'approved', area_id: 'wl' }, 'approve').ok, false)
assert.equal(adminDecide(pending, 'reject').ok, false) // needs a reason
assert.equal(adminDecide(pending, 'reject', 'no').ok, false)
assert.deepEqual(adminDecide(pending, 'reject', 'Photos are missing'), { ok: true, status: 'rejected' })
assert.deepEqual(adminDecide({ approval_status: 'rejected', area_id: 'wl' }, 'approve'), { ok: true, status: 'approved' })
assert.equal(adminDecide({ approval_status: 'approved', area_id: 'wl' }, 'suspend').ok, false) // needs a reason
assert.deepEqual(adminDecide({ approval_status: 'approved', area_id: 'wl' }, 'suspend', 'Complaints'), { ok: true, status: 'suspended' })
assert.equal(adminDecide(pending, 'suspend', 'x reason').ok, false)
assert.deepEqual(adminDecide({ approval_status: 'suspended', area_id: 'wl' }, 'reinstate'), { ok: true, status: 'approved' })
assert.equal(adminDecide(pending, 'reinstate').ok, false)

console.log('reach approval ok')
