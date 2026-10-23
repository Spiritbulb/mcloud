import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickStranded, recoveryEmail, RECOVERY_LINK } from './recovery-logic.ts'

const NOW = Date.parse('2026-10-23T12:00:00Z')
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const u = (id: string, email: string, lastSignInAt: string | null, name?: string) => ({
    id,
    email,
    name,
    createdAt: ago(60),
    lastSignInAt,
})

test('keeps people who signed in and have no MCloud row, newest sign-in first', () => {
    const r = pickStranded(
        [u('a', 'old@gmail.com', ago(40)), u('b', 'new@gmail.com', ago(1)), u('c', 'known@gmail.com', ago(2))],
        new Set(['c']),
        NOW,
    )
    assert.deepEqual(r.map((x) => x.email), ['new@gmail.com', 'old@gmail.com'])
})

test('flags recent sign-ins so the UI can preselect them', () => {
    const r = pickStranded([u('a', 'old@gmail.com', ago(40)), u('b', 'new@gmail.com', ago(1))], new Set(), NOW)
    assert.deepEqual(r.map((x) => x.recent), [true, false])
})

test('skips accounts that never signed in', () => {
    assert.deepEqual(pickStranded([u('a', 'x@gmail.com', null)], new Set(), NOW), [])
})

test('skips reserved test domains, including subdomains', () => {
    const r = pickStranded(
        [u('a', 'seed@example.com', ago(1)), u('b', 'x@mail.example.org', ago(1)), u('c', 'real@gmail.com', ago(1))],
        new Set(),
        NOW,
    )
    assert.deepEqual(r.map((x) => x.email), ['real@gmail.com'])
})

test('skips malformed addresses and unparseable dates', () => {
    assert.deepEqual(
        pickStranded([u('a', 'not-an-email', ago(1)), u('b', 'ok@gmail.com', 'garbage')], new Set(), NOW),
        [],
    )
})

test('one entry per email, case-insensitive', () => {
    const r = pickStranded([u('a', 'Same@Gmail.com', ago(1)), u('b', 'same@gmail.com', ago(2))], new Set(), NOW)
    assert.equal(r.length, 1)
    assert.equal(r[0].email, 'same@gmail.com')
})

test('email greets by first name, escapes html, and links to the handoff', () => {
    const e = recoveryEmail('Ada <b>Lovelace')
    assert.ok(e.text.startsWith('Hi Ada,'))
    assert.ok(!e.html.includes('<b>'))
    assert.ok(e.html.includes(RECOVERY_LINK) && e.text.includes(RECOVERY_LINK))
    assert.ok(recoveryEmail(null).text.startsWith('Hi,'))
})
