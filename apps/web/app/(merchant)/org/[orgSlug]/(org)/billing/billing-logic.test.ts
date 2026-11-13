import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentPlanOf, formatDate, formatKes, isPaidPlanName, planActionLabel, planBenefits, planButtonLabel, planLabel, shortfallMessage, pollStep, topupAmountFor } from './billing-logic.ts'

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

test('topupAmountFor covers the shortfall, at least the KSh 20 minimum', () => {
    assert.equal(topupAmountFor(500, 795), 295)
    assert.equal(topupAmountFor(792, 795), 20)
    assert.equal(topupAmountFor(800, 795), 0)
    assert.equal(topupAmountFor(795, 795), 0)
    assert.equal(topupAmountFor(0, 795.4), 796)
})

test('planBenefits gives two lines per plan, from the plan limits', () => {
    const hobby = planBenefits('hobby')
    const pro = planBenefits('pro')
    assert.equal(hobby.length, 2)
    assert.equal(pro.length, 2)
    assert.match(hobby.join(' '), /domain/)
    assert.match(hobby.join(' '), /200 products/)
    assert.match(pro.join(' '), /Unlimited products/)
    assert.match(pro.join(' '), /branding/)
    for (const line of [...hobby, ...pro]) assert.doesNotMatch(line, /NGO/)
})

test('planButtonLabel shows the action and the monthly price', () => {
    assert.equal(planButtonLabel(null, 'hobby'), 'Choose Hobby · KSh 795/mo')
    assert.equal(planButtonLabel('hobby', 'pro'), 'Upgrade to Pro · KSh 2,795/mo')
    assert.equal(planButtonLabel('pro', 'pro'), 'Renew plan · KSh 2,795/mo')
})

test('pollStep opens the confirm only when funded and nothing else is in progress', () => {
    assert.equal(pollStep(80_000, 795, 1, 24, false), 'confirm')
    assert.equal(pollStep(80_000, 795, 1, 24, true), 'balance-ready')
    assert.equal(pollStep(50_000, 795, 3, 24, false), 'wait')
    assert.equal(pollStep(null, 795, 3, 24, false), 'wait')
    assert.equal(pollStep(50_000, 795, 24, 24, false), 'timeout')
    assert.equal(pollStep(null, 795, 24, 24, true), 'timeout')
})
