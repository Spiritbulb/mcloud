import assert from 'node:assert/strict'
import { MAX_ACTIVE_STORE_KEYS } from './reach'
import { createStoreKey, revokeStoreKey } from './reach-listing'

type Op = [string, ...unknown[]]
type Call = { table: string; ops: Op[] }

/** A chainable stand-in for the Supabase client: records each query, answers via `respond`. */
function fakeDb(respond: (c: Call) => unknown) {
    const calls: Call[] = []
    const db = {
        from(table: string) {
            const call: Call = { table, ops: [] }
            calls.push(call)
            const b: any = new Proxy(
                {},
                {
                    get(_t, prop: string) {
                        if (prop === 'then') return (res: (v: unknown) => void) => res(respond(call))
                        return (...args: unknown[]) => {
                            call.ops.push([prop, ...args])
                            return b
                        }
                    },
                },
            )
            return b
        },
    }
    return { db, calls }
}

const has = (c: Call, ...op: Op) => c.ops.some((o) => JSON.stringify(o) === JSON.stringify(op))
const STORE = { id: 's1', name: 'Duka', type: 'shop', is_active: true }
const VENDOR = { id: 'v1', listed: true, approval_status: 'approved', review_note: null, area_id: 'a1', payout_phone: null }

// A store at its key limit gets an error, and no key is inserted.
{
    const { db, calls } = fakeDb((c) => {
        if (c.table === 'stores') return { data: STORE }
        if (c.table === 'reach_vendors') return { data: VENDOR }
        if (c.table === 'reach_courier_keys') return { count: MAX_ACTIVE_STORE_KEYS, data: null, error: null }
        return { data: null }
    })
    const r = await createStoreKey(db, 's1', 'Till 1', 'u1')
    assert.equal(r.ok, false)
    assert.ok(!r.ok && r.error.includes(String(MAX_ACTIVE_STORE_KEYS)))
    assert.equal(calls.filter((c) => c.table === 'reach_courier_keys' && c.ops.some((o) => o[0] === 'insert')).length, 0)
}

// Under the limit: a key is inserted for this store's vendor, labelled, attributed to the caller.
{
    const { db, calls } = fakeDb((c) => {
        if (c.table === 'stores') return { data: STORE }
        if (c.table === 'reach_vendors') return { data: VENDOR }
        if (c.table === 'reach_courier_keys') return c.ops.some((o) => o[0] === 'insert') ? { error: null } : { count: 0 }
        return { data: null }
    })
    const r = await createStoreKey(db, 's1', 'Till 1', 'u1')
    assert.equal(r.ok, true)
    const insert = calls.find((c) => c.table === 'reach_courier_keys' && c.ops.some((o) => o[0] === 'insert'))!
    const row = insert.ops.find((o) => o[0] === 'insert')![1] as Record<string, unknown>
    assert.equal(row.vendor_id, 'v1')
    assert.equal(row.label, 'Till 1')
    assert.equal(row.created_by, 'u1')
}

// Revoking is scoped to this store's vendor: a key of another store matches nothing.
{
    const { db, calls } = fakeDb((c) => {
        if (c.table === 'reach_vendors') return { data: VENDOR }
        if (c.table === 'reach_courier_keys') return { data: [], error: null }
        return { data: null }
    })
    const r = await revokeStoreKey(db, 's1', 'k-other')
    assert.deepEqual(r, { ok: false, error: 'Key not found or already revoked' })
    const update = calls.find((c) => c.table === 'reach_courier_keys')!
    assert.ok(has(update, 'eq', 'vendor_id', 'v1'))
    assert.ok(has(update, 'eq', 'id', 'k-other'))
}

// A bad key id never reaches the database.
{
    const { db, calls } = fakeDb(() => ({ data: null }))
    assert.deepEqual(await revokeStoreKey(db, 's1', 42), { ok: false, error: 'Missing key' })
    assert.equal(calls.length, 0)
}

console.log('reach-listing: passed')
