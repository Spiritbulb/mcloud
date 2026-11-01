import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkAccept, inviteStatus, INVITE_TTL_MS } from './org-invite-logic'

const now = Date.parse('2026-11-01T12:00:00Z')
const pending = { email: 'Amina@Example.org', token: 'abc', accepted_at: null, expires_at: new Date(now + INVITE_TTL_MS).toISOString() }

test('status', () => {
    assert.equal(inviteStatus(pending, now), 'pending')
    assert.equal(inviteStatus({ ...pending, accepted_at: '2026-11-01T11:00:00Z' }, now), 'accepted')
    assert.equal(inviteStatus({ ...pending, expires_at: '2026-11-01T11:59:59Z' }, now), 'expired')
    assert.equal(inviteStatus({ ...pending, expires_at: null }, now), 'expired')
    assert.equal(inviteStatus({ ...pending, token: null }, now), 'broken')
    // Accepted wins over everything else.
    assert.equal(inviteStatus({ ...pending, token: null, accepted_at: '2026-11-01T11:00:00Z' }, now), 'accepted')
})

test('only the invited address can accept, ignoring case and spaces', () => {
    assert.deepEqual(checkAccept(pending, ' amina@example.org ', now), { ok: true })
    assert.deepEqual(checkAccept(pending, 'someone@else.org', now), { ok: false, reason: 'wrong_account', invitedEmail: 'Amina@Example.org' })
    assert.deepEqual(checkAccept(pending, null, now), { ok: false, reason: 'wrong_account', invitedEmail: 'Amina@Example.org' })
})

test('used, expired and missing invites cannot be accepted', () => {
    assert.deepEqual(checkAccept(null, 'amina@example.org', now), { ok: false, reason: 'not_found' })
    assert.deepEqual(checkAccept({ ...pending, accepted_at: '2026-11-01T11:00:00Z' }, 'amina@example.org', now), { ok: false, reason: 'accepted' })
    assert.deepEqual(checkAccept({ ...pending, expires_at: '2026-10-01T00:00:00Z' }, 'amina@example.org', now), { ok: false, reason: 'expired' })
    assert.deepEqual(checkAccept({ ...pending, token: null }, 'amina@example.org', now), { ok: false, reason: 'expired' })
})
