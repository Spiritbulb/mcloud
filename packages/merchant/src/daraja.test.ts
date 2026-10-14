import { test } from 'node:test'
import assert from 'node:assert/strict'
import { queryStkPush, settleDarajaOrder } from './daraja.ts'

const cfg = { consumerKey: 'k', consumerSecret: 's', passkey: 'p', shortcode: '174379' }

/** Stub fetch: the first call is the OAuth token, the second the STK query. */
function stubFetch(queryBody: unknown, queryStatus = 200) {
  const calls: string[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string) => {
    calls.push(String(url))
    if (String(url).includes('/oauth/')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 })
    return new Response(JSON.stringify(queryBody), { status: queryStatus })
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = original } }
}

test('queryStkPush: paid only when Safaricom confirms it', async () => {
  const f = stubFetch({ ResponseCode: '0', ResultCode: '0', CheckoutRequestID: 'ws_1' })
  try {
    assert.equal(await queryStkPush(cfg, 'ws_1'), 'paid')
    assert.ok(f.calls.some((u) => u.endsWith('/mpesa/stkpushquery/v1/query')))
  } finally { f.restore() }
})

test('queryStkPush: an in-progress (error status) answer stays pending', async () => {
  const f = stubFetch({ errorCode: '500.001.1001', errorMessage: 'being processed' }, 500)
  try { assert.equal(await queryStkPush(cfg, 'ws_1'), 'pending') } finally { f.restore() }
})

test('queryStkPush: missing credentials never reach the network or read as paid', async () => {
  const f = stubFetch({ ResponseCode: '0', ResultCode: '0' })
  try {
    assert.equal(await queryStkPush({ ...cfg, passkey: undefined }, 'ws_1'), 'pending')
    assert.equal(f.calls.length, 0)
  } finally { f.restore() }
})

test('queryStkPush: a network failure reads as pending, not an exception', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => { throw new Error('offline') }) as typeof fetch
  try { assert.equal(await queryStkPush(cfg, 'ws_1'), 'pending') } finally { globalThis.fetch = original }
})

test('settleDarajaOrder: only the call that flips the order reports true', async () => {
  const updates: any[] = []
  const fake = (rows: unknown[]) => ({
    from: () => ({
      update: (v: unknown) => { updates.push(v); return { eq: () => ({ neq: () => ({ select: async () => ({ data: rows }) }) }) } },
    }),
  }) as any
  const order = { id: 'o1', metadata: { payment_method: 'daraja' } }
  assert.equal(await settleDarajaOrder(fake([{ id: 'o1' }]), order, { mpesaCode: 'ABC' }), true)
  assert.equal(await settleDarajaOrder(fake([]), order), false) // already paid by the other path
  assert.equal(updates[0].status, 'paid')
  assert.equal(updates[0].metadata.mpesa_transaction_code, 'ABC')
  assert.equal(updates[0].metadata.payment_method, 'daraja') // existing metadata kept
})
