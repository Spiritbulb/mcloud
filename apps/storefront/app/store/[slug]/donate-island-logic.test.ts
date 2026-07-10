import assert from 'node:assert/strict'
import { resolveAmount, buildDonatePayload } from './donate-island-logic'

// resolveAmount: preset selection wins; custom used when preset is null
assert.equal(resolveAmount({ preset: 1000, custom: '' }), 1000)
assert.equal(resolveAmount({ preset: null, custom: '750' }), 750)
assert.equal(resolveAmount({ preset: null, custom: 'abc' }), null, 'non-numeric custom -> null')
assert.equal(resolveAmount({ preset: null, custom: '0' }), null, 'zero -> null')
assert.equal(resolveAmount({ preset: null, custom: '' }), null, 'nothing -> null')

// buildDonatePayload: shapes the /donate body, omitting empty dedication
const p = buildDonatePayload({
  campaignId: 'water', amount: 1000, email: 'a@b.com', phone: '0712',
  paymentMethod: 'mpesa', idempotencyKey: 'k1', dedication: '  hi  ',
})
assert.equal(p.campaignId, 'water')
assert.equal(p.amount, 1000)
assert.equal(p.guest.email, 'a@b.com')
assert.equal(p.guest.mpesaPhone, '0712')
assert.equal(p.paymentMethod, 'mpesa')
assert.equal(p.idempotencyKey, 'k1')
assert.equal(p.dedication, 'hi')
const p2 = buildDonatePayload({ campaignId: 'x', amount: 5, email: '', phone: '', paymentMethod: 'paypal', idempotencyKey: 'k', dedication: '' })
assert.equal('dedication' in p2, false, 'empty dedication omitted')

console.log('donate-island-logic.test.ts: all assertions passed')
