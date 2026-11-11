import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  channelMatches, channelName, darajaReady, channelSpecFromMpesa, palplussOutcome, palplussStkEligible, palplussStorePaymentsOn,
} from './palpluss-store.ts'

test('the switch is off unless exactly "1"', () => {
  assert.equal(palplussStorePaymentsOn({}), false)
  assert.equal(palplussStorePaymentsOn({ PALPLUSS_STORE_PAYMENTS: '' }), false)
  assert.equal(palplussStorePaymentsOn({ PALPLUSS_STORE_PAYMENTS: 'true' }), false)
  assert.equal(palplussStorePaymentsOn({ PALPLUSS_STORE_PAYMENTS: '1' }), true)
})

test('till details become a TILL_NUMBER spec', () => {
  assert.deepEqual(channelSpecFromMpesa({ mpesa_type: 'till', mpesa_till: ' 123456 ' }), { type: 'TILL_NUMBER', shortcode: '123456', accountNumber: null })
  // Missing mpesa_type defaults to a till, as the checkout does.
  assert.deepEqual(channelSpecFromMpesa({ mpesa_till: '5551234' }), { type: 'TILL_NUMBER', shortcode: '5551234', accountNumber: null })
})

test('paybill needs a paybill number and an account number', () => {
  assert.deepEqual(
    channelSpecFromMpesa({ mpesa_type: 'paybill', mpesa_paybill: '400200', mpesa_account: 'SHOP1' }),
    { type: 'PAYBILL', shortcode: '400200', accountNumber: 'SHOP1' },
  )
  assert.equal(channelSpecFromMpesa({ mpesa_type: 'paybill', mpesa_paybill: '400200' }), null)
  assert.equal(channelSpecFromMpesa({ mpesa_type: 'paybill', mpesa_account: 'SHOP1' }), null)
  // A till number left over from a type switch is not used for a paybill.
  assert.equal(channelSpecFromMpesa({ mpesa_type: 'paybill', mpesa_till: '123456', mpesa_account: 'A' }), null)
})

test('malformed or missing numbers are not chargeable', () => {
  for (const cfg of [null, undefined, 'x', [], {}, { mpesa_till: '12' }, { mpesa_till: 'abc123' }, { mpesa_till: '12345678' }, { mpesa_till: '12 34 56' }]) {
    assert.equal(channelSpecFromMpesa(cfg), null, JSON.stringify(cfg))
  }
})

test('channelMatches compares type, shortcode and account', () => {
  const spec = { type: 'PAYBILL', shortcode: '400200', accountNumber: 'SHOP1' } as const
  assert.equal(channelMatches({ id: 'c', type: 'PAYBILL', shortcode: '400200', accountNumber: 'SHOP1' }, spec), true)
  assert.equal(channelMatches({ id: 'c', type: 'PAYBILL', shortcode: '400200', accountNumber: 'OTHER' }, spec), false)
  assert.equal(channelMatches({ id: 'c', type: 'TILL_NUMBER', shortcode: '400200', accountNumber: null }, spec), false)
  const till = { type: 'TILL_NUMBER', shortcode: '123456', accountNumber: null } as const
  assert.equal(channelMatches({ id: 'c', type: 'TILL_NUMBER', shortcode: '123456', accountNumber: null }, till), true)
  assert.equal(channelMatches({ id: 'c', type: 'TILL_NUMBER', shortcode: '123456', accountNumber: '' }, till), true)
  assert.equal(channelMatches({ id: 'c', type: 'TILL_NUMBER', shortcode: '999999', accountNumber: null }, till), false)
})

test('channelName carries a short store id and the number', () => {
  assert.equal(channelName('abcdef12-3456', { type: 'TILL_NUMBER', shortcode: '123456', accountNumber: null }), 'mcloud abcdef12 till 123456')
})

test('eligibility needs the switch, Pro, a chargeable spec and no working Daraja', () => {
  const spec = { type: 'TILL_NUMBER', shortcode: '123456', accountNumber: null } as const
  const ok = { switchOn: true, plan: 'pro', spec, darajaReady: false } as const
  assert.equal(palplussStkEligible(ok), true)
  assert.equal(palplussStkEligible({ ...ok, switchOn: false }), false)
  assert.equal(palplussStkEligible({ ...ok, plan: 'hobby' }), false)
  assert.equal(palplussStkEligible({ ...ok, plan: 'free' }), false)
  assert.equal(palplussStkEligible({ ...ok, spec: null }), false)
  assert.equal(palplussStkEligible({ ...ok, darajaReady: true }), false)
})

test('outcome: paid only from SUCCESS with a covering amount', () => {
  assert.equal(palplussOutcome({ status: 'SUCCESS', amount: 100 }, 100), 'paid')
  assert.equal(palplussOutcome({ status: 'SUCCESS', amount: 101 }, 100.2), 'paid')
  assert.equal(palplussOutcome({ status: 'SUCCESS', amount: 99 }, 100), 'underpaid')
  assert.equal(palplussOutcome({ status: 'SUCCESS', amount: undefined }, 100), 'underpaid')
  assert.equal(palplussOutcome({ status: 'SUCCESS', amount: 'abc' }, 100), 'underpaid')
})

test('outcome: terminal failures and everything unclear', () => {
  for (const status of ['FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED']) assert.equal(palplussOutcome({ status, amount: 100 }, 100), 'failed')
  for (const status of ['PENDING', 'PROCESSING', 'WHATEVER', undefined, null, 5]) assert.equal(palplussOutcome({ status, amount: 100 }, 100), 'pending')
})

test('darajaReady mirrors the stk-push route: active and every credential present', () => {
  const full = { darajaEnabled: true, consumerKey: 'k', consumerSecret: 's', passkey: 'p', shortcode: '174379' }
  assert.equal(darajaReady(full, true), true)
  assert.equal(darajaReady(full, false), false)
  assert.equal(darajaReady(full, null), false)
  assert.equal(darajaReady({ ...full, darajaEnabled: false }, true), false)
  for (const k of ['consumerKey', 'consumerSecret', 'passkey', 'shortcode']) assert.equal(darajaReady({ ...full, [k]: '' }, true), false, k)
  assert.equal(darajaReady(null, true), false)
})
