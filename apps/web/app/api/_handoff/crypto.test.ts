import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sealTokens, openTokens } from './crypto.ts'

const KEY = Buffer.alloc(32, 9).toString('base64')
const sample = { accessToken: 'at_1', refreshToken: 'rt_1' }

test('round-trips a token pair', async () => {
  process.env.HANDOFF_ENC_KEY = KEY
  const sealed = await sealTokens(sample)
  assert.ok(!sealed.includes('at_1')) // opaque
  assert.deepEqual(await openTokens(sealed), sample)
})

test('returns null on a tampered blob', async () => {
  process.env.HANDOFF_ENC_KEY = KEY
  const sealed = await sealTokens(sample)
  const tampered = sealed.slice(0, -2) + (sealed.endsWith('AA') ? 'BB' : 'AA')
  assert.equal(await openTokens(tampered), null)
})

test('returns null on garbage', async () => {
  process.env.HANDOFF_ENC_KEY = KEY
  assert.equal(await openTokens('nope'), null)
})

test('throws when the key is missing', async () => {
  delete process.env.HANDOFF_ENC_KEY
  await assert.rejects(() => sealTokens(sample))
})
