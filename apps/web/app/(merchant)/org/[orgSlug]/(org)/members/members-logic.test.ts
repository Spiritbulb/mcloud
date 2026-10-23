import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canInvite, daysUntil, memberPermissions } from './members-logic.ts'

test('owners remove anyone but owners and change non-owner roles', () => {
    assert.deepEqual(memberPermissions('owner', 'admin'), { canRemove: true, canChangeRole: true })
    assert.deepEqual(memberPermissions('owner', 'member'), { canRemove: true, canChangeRole: true })
    assert.deepEqual(memberPermissions('owner', 'owner'), { canRemove: false, canChangeRole: false })
})

test('admins remove plain members only and never change roles', () => {
    assert.deepEqual(memberPermissions('admin', 'member'), { canRemove: true, canChangeRole: false })
    assert.deepEqual(memberPermissions('admin', 'admin'), { canRemove: false, canChangeRole: false })
    assert.deepEqual(memberPermissions('admin', 'owner'), { canRemove: false, canChangeRole: false })
})

test('members and outsiders can do nothing', () => {
    assert.deepEqual(memberPermissions('member', 'member'), { canRemove: false, canChangeRole: false })
    assert.deepEqual(memberPermissions(null, 'member'), { canRemove: false, canChangeRole: false })
})

test('only owners and admins invite', () => {
    assert.equal(canInvite('owner'), true)
    assert.equal(canInvite('admin'), true)
    assert.equal(canInvite('member'), false)
    assert.equal(canInvite(null), false)
})

test('daysUntil rounds up, floors at zero and tolerates blanks', () => {
    const now = Date.parse('2026-10-23T12:00:00Z')
    assert.equal(daysUntil('2026-10-30T12:00:00Z', now), 7)
    assert.equal(daysUntil('2026-10-23T13:00:00Z', now), 1)
    assert.equal(daysUntil('2026-10-20T12:00:00Z', now), 0)
    assert.equal(daysUntil(null, now), null)
    assert.equal(daysUntil('nope', now), null)
})
