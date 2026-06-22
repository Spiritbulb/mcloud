// Run with: node --experimental-strip-types scripts/verify-google-play.ts
import { parseSubscriptionResponse } from '../app/api/mobile/_google-play-parse.ts'
import assert from 'node:assert'

const active = {
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
    latestOrderId: 'GPA.1234',
    lineItems: [{ productId: 'pro_monthly', expiryTime: '2026-07-22T00:00:00Z' }],
}
let r = parseSubscriptionResponse(active)
assert.deepEqual(r, { ok: true, active: true, productId: 'pro_monthly', orderId: 'GPA.1234', expiryTime: '2026-07-22T00:00:00Z' })

const cancelled = { subscriptionState: 'SUBSCRIPTION_STATE_CANCELED', lineItems: [{ productId: 'pro_monthly' }] }
r = parseSubscriptionResponse(cancelled)
assert.equal(r.ok, true)
assert.equal((r as any).active, false)

const grace = { subscriptionState: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', lineItems: [{ productId: 'pro_monthly' }] }
assert.equal((parseSubscriptionResponse(grace) as any).active, true, 'grace counts as active')

const malformed = { subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [] }
assert.equal(parseSubscriptionResponse(malformed).ok, false, 'no productId → error')

console.log('OK')
