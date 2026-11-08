import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyDeleteStoreError, deleteStoreCascade, describeDeleteStoreFailure } from './store-deletion.ts'

test('only the payout refusal is told apart from other failures', () => {
    assert.equal(classifyDeleteStoreError(null), null)
    assert.equal(classifyDeleteStoreError({ message: 'store_has_unpaid_payouts' }), 'unpaid_payouts')
    assert.equal(classifyDeleteStoreError({ message: 'ERROR: store_has_unpaid_payouts' }), 'unpaid_payouts')
    assert.equal(classifyDeleteStoreError({ message: 'deadlock detected' }), 'failed')
    assert.equal(classifyDeleteStoreError({}), 'failed')
})

test('messages say that nothing changed', () => {
    assert.match(describeDeleteStoreFailure('unpaid_payouts'), /payouts.*Nothing was changed/)
    assert.match(describeDeleteStoreFailure('failed'), /Nothing was changed/)
})

test('deleteStoreCascade calls the function with the store id and maps the outcome', async () => {
    const calls: unknown[] = []
    const ok = await deleteStoreCascade({ rpc: async (fn, args) => (calls.push([fn, args]), { data: null, error: null }) }, 's1')
    assert.deepEqual(calls, [['delete_store_cascade', { p_store_id: 's1' }]])
    assert.deepEqual(ok, { ok: true })

    const blocked = await deleteStoreCascade({ rpc: async () => ({ data: null, error: { message: 'store_has_unpaid_payouts' } }) }, 's1')
    assert.equal(blocked.ok, false)
    assert.equal(blocked.ok ? '' : blocked.failure, 'unpaid_payouts')

    const original = console.error
    console.error = () => {}
    try {
        const failed = await deleteStoreCascade({ rpc: async () => ({ data: null, error: { message: 'boom' } }) }, 's1')
        assert.equal(failed.ok ? '' : failed.failure, 'failed')
    } finally {
        console.error = original
    }
})
