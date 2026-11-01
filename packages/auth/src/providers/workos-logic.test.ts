import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapUser, resolveIdentity } from './workos-logic'

const u = { id: 'user_1', email: 'a@b.co', externalId: 'auth0|9' }
test('external mode prefers externalId', () => assert.equal(mapUser(u, 'external').id, 'auth0|9'))
test('workos mode always uses the WorkOS id', () => assert.equal(mapUser(u, 'workos').id, 'user_1'))
test('linker runs when given', async () => {
    let calls = 0
    const out = await resolveIdentity({ id: 'user_2', email: 'x@y.z' }, { canonicalId: 'external', link: async (v) => { calls++; return { ...v, externalId: 'auth0|2' } } })
    assert.equal(calls, 1); assert.equal(out.externalId, 'auth0|2')
})
test('no linker, no call', async () => {
    const v = { id: 'user_3', email: 'q@r.s' }
    assert.equal(await resolveIdentity(v, { canonicalId: 'workos' }), v)
})
test('linkFailed maps to unlinked only in external mode', () => {
    assert.equal(mapUser({ ...u, linkFailed: true }, 'external').unlinked, true)
    assert.equal(mapUser({ ...u, linkFailed: true }, 'workos').unlinked, undefined)
})
