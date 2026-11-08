import { test } from 'node:test'
import assert from 'node:assert/strict'
import { closeOrg, describeCloseOrgBlock, parseCloseOrgResult } from './org-closing.ts'

test('a successful result keeps the moved stores and drops malformed ones', () => {
    assert.deepEqual(parseCloseOrgResult({ ok: true, moved_stores: [{ id: '1', slug: 'a' }, { id: 2 }, null] }), { ok: true, movedStores: [{ id: '1', slug: 'a' }] })
    assert.deepEqual(parseCloseOrgResult({ ok: true }), { ok: true, movedStores: [] })
})

test('each refusal is recognised', () => {
    assert.deepEqual(parseCloseOrgResult({ ok: false, code: 'not_owner' }), { ok: false, code: 'not_owner' })
    assert.deepEqual(parseCloseOrgResult({ ok: false, code: 'no_org' }), { ok: false, code: 'no_org' })
    assert.deepEqual(parseCloseOrgResult({ ok: false, code: 'org_has_servers', servers: 2 }), { ok: false, code: 'org_has_servers', servers: 2 })
    assert.deepEqual(parseCloseOrgResult({ ok: false, code: 'org_has_balance', balance_cents: 1500 }), { ok: false, code: 'org_has_balance', balanceCents: 1500 })
})

test('anything unexpected is not treated as success', () => {
    for (const bad of [null, undefined, 'ok', 1, {}, { ok: 'true' }, { ok: false, code: 'org_has_servers' }, { ok: false, code: 'org_has_balance' }, { ok: false, code: 'surprise' }]) {
        assert.equal(parseCloseOrgResult(bad), null, JSON.stringify(bad))
    }
})

test('messages say what to do and that nothing changed', () => {
    assert.match(describeCloseOrgBlock({ ok: false, code: 'org_has_servers', servers: 1 }), /server first/)
    assert.match(describeCloseOrgBlock({ ok: false, code: 'org_has_servers', servers: 3 }), /3 servers/)
    assert.match(describeCloseOrgBlock({ ok: false, code: 'org_has_balance', balanceCents: 123456 }), /KSh 1234\.56/)
    assert.match(describeCloseOrgBlock({ ok: false, code: 'not_owner' }), /owner/)
    assert.match(describeCloseOrgBlock(null), /Nothing was changed/)
})

test('closeOrg passes the org and the actor, and reports an RPC error as nothing changed', async () => {
    const calls: unknown[] = []
    const ok = await closeOrg({ rpc: async (fn, args) => (calls.push([fn, args]), { data: { ok: true, moved_stores: [] }, error: null }) }, 'org1', 'u1')
    assert.deepEqual(calls, [['close_org', { p_org_id: 'org1', p_actor: 'u1' }]])
    assert.equal(ok.ok, true)
    const originalError = console.error
    console.error = () => {}
    try {
        const failed = await closeOrg({ rpc: async () => ({ data: null, error: { message: 'boom' } }) }, 'org1', 'u1')
        assert.equal(failed.ok, false)
        assert.match(failed.ok ? '' : failed.message, /Nothing was changed/)
    } finally {
        console.error = originalError
    }
})
