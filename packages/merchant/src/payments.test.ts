import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  orderIsPayable, mpesaAmountDue, mpesaPaymentCovers, normalizeKenyanPhone,
  paypalAmounts, paypalCaptureMatches, centsToUsd, stkQueryOutcome,
} from './payments.ts'

test('orderIsPayable: only pending, not-yet-completed orders', () => {
  assert.equal(orderIsPayable({ status: 'pending', metadata: {} }), true)
  assert.equal(orderIsPayable({ status: 'pending', metadata: { payment_status: 'pending' } }), true)
  assert.equal(orderIsPayable({ status: 'paid', metadata: {} }), false)
  assert.equal(orderIsPayable({ status: 'pending', metadata: { payment_status: 'completed' } }), false)
  assert.equal(orderIsPayable({ status: 'pending', metadata: null }), true)
})

test('M-PESA amount is the total rounded up and underpayment is rejected', () => {
  assert.equal(mpesaAmountDue(100), 100)
  assert.equal(mpesaAmountDue(100.2), 101)
  assert.equal(mpesaPaymentCovers(100, 100), true)
  assert.equal(mpesaPaymentCovers(101, 100.2), true)
  assert.equal(mpesaPaymentCovers(1, 10000), false)
  assert.equal(mpesaPaymentCovers(undefined, 100), false)
  assert.equal(mpesaPaymentCovers('abc', 100), false)
})

test('normalizeKenyanPhone', () => {
  assert.equal(normalizeKenyanPhone('0712345678'), '254712345678')
  assert.equal(normalizeKenyanPhone('0112345678'), '254112345678')
  assert.equal(normalizeKenyanPhone('+254 712 345 678'), '254712345678')
  assert.equal(normalizeKenyanPhone('254712345678'), '254712345678')
  assert.equal(normalizeKenyanPhone('0212345678'), null)
  assert.equal(normalizeKenyanPhone('12345'), null)
  assert.equal(normalizeKenyanPhone(undefined), null)
})

test('paypalAmounts prices from lines, includes shipping, ignores nothing client-side', () => {
  const a = paypalAmounts([{ title: 'A', price: 1000, quantity: 2 }, { title: 'B', price: 500, quantity: 1 }], 300)
  assert.equal(a.lines[0].unitCents, 770)
  assert.equal(a.itemCents, 770 * 2 + 385)
  assert.equal(a.shippingCents, 231)
  assert.equal(a.totalCents, a.itemCents + a.shippingCents)
  assert.equal(centsToUsd(a.totalCents), '21.56')
  // a quantity of 0 or junk is floored to 1, never free
  assert.equal(paypalAmounts([{ title: 'A', price: 1000, quantity: 0 }], 0).itemCents, 770)
})

test('paypalCaptureMatches compares in cents', () => {
  assert.equal(paypalCaptureMatches('21.56', 2156), true)
  assert.equal(paypalCaptureMatches('0.01', 2156), false)
  assert.equal(paypalCaptureMatches(undefined, 2156), false)
})

test('stkQueryOutcome: only an explicit ResultCode 0 for our request id is paid', () => {
  const ok = { ResponseCode: '0', ResultCode: '0', CheckoutRequestID: 'ws_CO_1' }
  assert.equal(stkQueryOutcome(ok, 'ws_CO_1'), 'paid')
  assert.equal(stkQueryOutcome({ ...ok, ResultCode: 0 }, 'ws_CO_1'), 'paid')
  // cancelled, timed out, wrong PIN, insufficient funds
  for (const code of ['1032', '1037', '2001', '1']) {
    assert.equal(stkQueryOutcome({ ...ok, ResultCode: code }, 'ws_CO_1'), 'failed')
  }
})

test('stkQueryOutcome: anything unclear is pending, never paid', () => {
  // still processing: Daraja answers with an error body and no ResultCode
  assert.equal(stkQueryOutcome({ errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' }, 'ws_CO_1'), 'pending')
  assert.equal(stkQueryOutcome({ ResponseCode: '0' }, 'ws_CO_1'), 'pending')
  assert.equal(stkQueryOutcome({ ResponseCode: '1', ResultCode: '0' }, 'ws_CO_1'), 'pending')
  // an answer about some other transaction must not settle this one
  assert.equal(stkQueryOutcome({ ResponseCode: '0', ResultCode: '0', CheckoutRequestID: 'ws_CO_2' }, 'ws_CO_1'), 'pending')
  for (const bad of [null, undefined, 'ok', 0, [], { ResultCode: '0' }]) {
    assert.equal(stkQueryOutcome(bad, 'ws_CO_1'), 'pending')
  }
})
