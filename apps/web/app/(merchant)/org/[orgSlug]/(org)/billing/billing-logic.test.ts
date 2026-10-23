import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentPlanOf, formatDate, formatKes, isPaidPlanName, planActionLabel, planLabel, shortfallMessage } from './billing-logic.ts'

test('plan names and labels', () => {
    assert.equal(isPaidPlanName('pro'), true)
    assert.equal(isPaidPlanName('hobby'), true)
    assert.equal(isPaidPlanName('free'), false)
    assert.equal(isPaidPlanName(null), false)
    assert.equal(planLabel('pro'), 'Pro')
    assert.equal(planLabel(null), 'Free')
})

test('only an active subscription sets the current plan', () => {
    assert.equal(currentPlanOf({ plan: 'pro', status: 'active', period_end: null }), 'pro')
    assert.equal(currentPlanOf({ plan: 'pro', status: 'pending', period_end: null }), null)
    assert.equal(currentPlanOf({ plan: 'pro', status: 'expired', period_end: null }), null)
    assert.equal(currentPlanOf(null), null)
})

test('action labels follow the current plan', () => {
    assert.equal(planActionLabel('pro', 'pro'), 'Renew plan')
    assert.equal(planActionLabel('hobby', 'hobby'), 'Renew plan')
    assert.equal(planActionLabel('hobby', 'pro'), 'Upgrade to Pro')
    assert.equal(planActionLabel('pro', 'hobby'), 'Switch to Hobby')
    assert.equal(planActionLabel(null, 'pro'), 'Choose Pro')
    assert.equal(planActionLabel(null, 'hobby'), 'Choose Hobby')
})

test('the wallet pre-check names the shortfall', () => {
    assert.equal(shortfallMessage(3000, 'pro', 2795), null)
    assert.equal(shortfallMessage(2795, 'pro', 2795), null)
    const msg = shortfallMessage(2, 'pro', 2795)
    assert.ok(msg?.includes('Pro plan'))
    assert.ok(msg?.includes('KSh 2,793'))
})

test('money and dates format for Kenya, with a dash for blanks', () => {
    assert.equal(formatKes(2795), 'KSh 2,795')
    assert.equal(formatDate(null), '—')
    assert.equal(formatDate('not a date'), '—')
    assert.match(formatDate('2026-10-25T00:00:00Z'), /2026/)
})
