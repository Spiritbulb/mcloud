import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publicIntegration } from './integration-public.ts'

test('only checkout-relevant fields survive', () => {
  const out = publicIntegration({
    enabled: true, darajaEnabled: true, mpesa_type: 'till', mpesa_till: '123456', mpesa_account: 'Shop',
    consumerKey: 'k', consumerSecret: 's', passkey: 'p', shortcode: '174379', webhookToken: 'w', apiKey: 'a',
    inheritedFromOrg: true, hasPasskey: true,
  })
  assert.deepEqual(out, { enabled: true, darajaEnabled: true, mpesa_type: 'till', mpesa_till: '123456', mpesa_account: 'Shop' })
})

test('null in, null out', () => {
  assert.equal(publicIntegration(null), null)
  assert.equal(publicIntegration(undefined), null)
})
