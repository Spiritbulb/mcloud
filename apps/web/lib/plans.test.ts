// apps/web/lib/plans.test.ts
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
