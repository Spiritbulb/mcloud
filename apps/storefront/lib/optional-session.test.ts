import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readOptionalSession } from './optional-session'

test('returns the session when there is one', async () => {
    assert.deepEqual(await readOptionalSession(async () => ({ user: { id: 'u1' } })), { user: { id: 'u1' } })
})

test('no session, or a session read that throws, means anonymous rather than an error', async () => {
    assert.equal(await readOptionalSession(async () => null), null)
    assert.equal(await readOptionalSession(async () => undefined), null)
    const orig = console.warn
    console.warn = () => {}
    try {
        assert.equal(await readOptionalSession(async () => { throw new Error("You are calling 'withAuth' on a route that isn't covered") }), null)
    } finally {
        console.warn = orig
    }
})
