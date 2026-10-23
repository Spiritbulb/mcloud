import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canManageMember, daysUntil, roleLabel } from './members-logic.ts'

test('owners manage admins and staff, never other owners', () => {
    assert.equal(canManageMember('owner', 'admin'), true)
    assert.equal(canManageMember('owner', 'staff'), true)
    assert.equal(canManageMember('owner', 'owner'), false)
})

test('admins manage staff only; staff and outsiders manage no one', () => {
    assert.equal(canManageMember('admin', 'staff'), true)
    assert.equal(canManageMember('admin', 'admin'), false)
    assert.equal(canManageMember('admin', 'owner'), false)
    assert.equal(canManageMember('staff', 'staff'), false)
    assert.equal(canManageMember(null, 'staff'), false)
})

test('daysUntil rounds up, floors at zero, and gives null instead of NaN', () => {
    const now = Date.parse('2026-10-23T12:00:00Z')
    assert.equal(daysUntil('2026-10-30T12:00:00Z', now), 7)
    assert.equal(daysUntil('2026-10-01T00:00:00Z', now), 0)
    assert.equal(daysUntil(null, now), null)
    assert.equal(daysUntil('-', now), null)
})

test('role labels', () => {
    assert.equal(roleLabel('staff'), 'Staff')
    assert.equal(roleLabel(null), 'Member')
})
