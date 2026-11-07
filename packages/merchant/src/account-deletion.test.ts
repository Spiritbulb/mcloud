import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeDeleteBlock, parseDeleteAccountResult } from './account-deletion.ts'

test('a successful result keeps its transfers and drops malformed ones', () => {
    assert.deepEqual(parseDeleteAccountResult({ ok: true, transfers: [{ org: 'Acme', to: 'u2' }, { org: 5 }, null] }), { ok: true, transfers: [{ org: 'Acme', to: 'u2' }] })
    assert.deepEqual(parseDeleteAccountResult({ ok: true }), { ok: true, transfers: [] })
})

test('each refusal is recognised', () => {
    assert.deepEqual(parseDeleteAccountResult({ ok: false, code: 'org_needs_successor', org: 'Acme', has_other_members: true }), { ok: false, code: 'org_needs_successor', org: 'Acme', has_other_members: true })
    assert.deepEqual(parseDeleteAccountResult({ ok: false, code: 'store_without_org' }), { ok: false, code: 'store_without_org' })
    assert.deepEqual(parseDeleteAccountResult({ ok: false, code: 'no_user' }), { ok: false, code: 'no_user' })
})

test('anything unexpected is not treated as success', () => {
    for (const bad of [null, undefined, 'ok', 1, {}, { ok: 'true' }, { ok: false, code: 'org_needs_successor' }, { ok: false, code: 'surprise' }]) {
        assert.equal(parseDeleteAccountResult(bad), null, JSON.stringify(bad))
    }
})

test('messages say what to do and that nothing changed', () => {
    const members = describeDeleteBlock({ ok: false, code: 'org_needs_successor', org: 'Acme', has_other_members: true })
    assert.match(members, /Acme/)
    assert.match(members, /admin/)
    assert.match(members, /Nothing was changed/)
    const alone = describeDeleteBlock({ ok: false, code: 'org_needs_successor', org: 'Acme', has_other_members: false })
    assert.match(alone, /only person/)
    assert.match(describeDeleteBlock(null), /Nothing was changed/)
})
