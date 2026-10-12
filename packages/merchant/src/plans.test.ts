// packages/merchant/src/plans.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PLAN_LIMITS,
  planFromActiveRow,
  isOverLimit,
  planHasFeature,
  planAllowsRequired,
  limitMessage,
} from './plans.ts'

test('PLAN_LIMITS has the locked tier values', () => {
  assert.equal(PLAN_LIMITS.free.products, 20)
  assert.equal(PLAN_LIMITS.free.members, 1)
  assert.equal(PLAN_LIMITS.free.monthlyOrders, 50)
  assert.equal(PLAN_LIMITS.hobby.products, 200)
  assert.equal(PLAN_LIMITS.hobby.members, 3)
  assert.equal(PLAN_LIMITS.hobby.monthlyOrders, 500)
  assert.equal(PLAN_LIMITS.pro.products, Infinity)
  assert.equal(PLAN_LIMITS.pro.members, 10)
  assert.equal(PLAN_LIMITS.pro.monthlyOrders, Infinity)
})

test('feature flags match the tier table', () => {
  assert.equal(PLAN_LIMITS.free.features.customDomain, false)
  assert.equal(PLAN_LIMITS.hobby.features.customDomain, true)
  assert.equal(PLAN_LIMITS.hobby.features.advancedAnalytics, true)
  assert.equal(PLAN_LIMITS.hobby.features.blogPages, true)
  assert.equal(PLAN_LIMITS.hobby.features.removeBranding, false)
  assert.equal(PLAN_LIMITS.hobby.features.prioritySupport, false)
  assert.equal(PLAN_LIMITS.pro.features.removeBranding, true)
  assert.equal(PLAN_LIMITS.pro.features.prioritySupport, true)
})

test('planFromActiveRow derives the tier', () => {
  assert.equal(planFromActiveRow(null), 'free')
  assert.equal(planFromActiveRow(undefined), 'free')
  assert.equal(planFromActiveRow({ plan: 'pro', status: 'active' }), 'pro')
  assert.equal(planFromActiveRow({ plan: 'hobby', status: 'active' }), 'hobby')
  assert.equal(planFromActiveRow({ plan: 'pro', status: 'cancelled' }), 'free')
  assert.equal(planFromActiveRow({ plan: null, status: 'active' }), 'free')
  assert.equal(planFromActiveRow({ plan: 'weird', status: 'active' }), 'free')
})

test('isOverLimit: finite compares, Infinity never over', () => {
  assert.equal(isOverLimit(19, 20), false)
  assert.equal(isOverLimit(20, 20), true)
  assert.equal(isOverLimit(21, 20), true)
  assert.equal(isOverLimit(999999, Infinity), false)
})

test('planHasFeature reads the map', () => {
  assert.equal(planHasFeature('free', 'customDomain'), false)
  assert.equal(planHasFeature('hobby', 'customDomain'), true)
  assert.equal(planHasFeature('hobby', 'removeBranding'), false)
  assert.equal(planHasFeature('pro', 'removeBranding'), true)
})

test('planAllowsRequired ranks tiers', () => {
  assert.equal(planAllowsRequired('free', 'hobby'), false)
  assert.equal(planAllowsRequired('hobby', 'hobby'), true)
  assert.equal(planAllowsRequired('pro', 'hobby'), true)
  assert.equal(planAllowsRequired('hobby', 'pro'), false)
  assert.equal(planAllowsRequired('pro', 'pro'), true)
})

test('limitMessage has no dashes and names the plan and noun', () => {
  const msg = limitMessage('free', 'products', 20)
  assert.match(msg, /free/)
  assert.match(msg, /20 products/)
  assert.equal(msg.includes('-'), false)
  assert.equal(msg.includes('–'), false)
  assert.equal(msg.includes('—'), false)
})

test('resolvePlan: best active, unexpired row wins; newer inactive rows do not mask it', async () => {
  const { resolvePlan, isPaidPlan } = await import('./plans.ts')
  const now = new Date('2026-10-12T00:00:00Z')
  assert.equal(resolvePlan([], now), 'free')
  assert.equal(resolvePlan(null, now), 'free')
  assert.equal(resolvePlan([{ plan: 'pro', status: 'active' }], now), 'pro')
  // a newer pending/cancelled row does not hide an active one
  assert.equal(resolvePlan([
    { plan: 'pro', status: 'pending' }, { plan: 'hobby', status: 'cancelled' }, { plan: 'pro', status: 'active' },
  ], now), 'pro')
  // highest active tier wins regardless of order
  assert.equal(resolvePlan([{ plan: 'hobby', status: 'active' }, { plan: 'pro', status: 'active' }], now), 'pro')
  assert.equal(resolvePlan([{ plan: 'pro', status: 'active' }, { plan: 'hobby', status: 'active' }], now), 'pro')
  // a lapsed active row grants nothing; no period_end never expires
  assert.equal(resolvePlan([{ plan: 'pro', status: 'active', period_end: '2026-10-01T00:00:00Z' }], now), 'free')
  assert.equal(resolvePlan([{ plan: 'pro', status: 'active', period_end: '2026-11-01T00:00:00Z' }], now), 'pro')
  assert.equal(resolvePlan([{ plan: 'pro', status: 'active', period_end: null }], now), 'pro')
  // expired Pro row, still-valid Hobby row
  assert.equal(resolvePlan([
    { plan: 'pro', status: 'active', period_end: '2026-10-01T00:00:00Z' },
    { plan: 'hobby', status: 'active', period_end: '2026-11-01T00:00:00Z' },
  ], now), 'hobby')
  // unknown plan names are free
  assert.equal(resolvePlan([{ plan: 'enterprise', status: 'active' }], now), 'free')
  assert.equal(isPaidPlan('free'), false)
  assert.equal(isPaidPlan('hobby'), true)
})
