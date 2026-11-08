// apps/storefront/app/api/store/_analytics-ratelimit.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowAnalyticsEvent } from './_analytics-ratelimit.ts'

test('allows 60 then blocks the 61st for the same store+session', () => {
  const store = `store-${Date.now()}`
  const session = 'sess-a'
  for (let i = 0; i < 60; i++) {
    assert.equal(allowAnalyticsEvent(store, session, `1.2.3.${i % 250}`), true)
  }
  assert.equal(allowAnalyticsEvent(store, session, '9.9.9.9'), false)
})

test('a single IP is capped even across rotating session ids', () => {
  const store = `store-${Date.now()}-ip`
  const ip = '5.5.5.5'
  for (let i = 0; i < 60; i++) {
    assert.equal(allowAnalyticsEvent(store, `sess-${i}`, ip), true)
  }
  assert.equal(allowAnalyticsEvent(store, `sess-new`, ip), false)
})

test('different stores have independent budgets', () => {
  const session = 'shared-session'
  const ip = '7.7.7.7'
  for (let i = 0; i < 60; i++) {
    assert.equal(allowAnalyticsEvent(`store-a-${Date.now()}`, session, `${ip}-${i}`), true)
  }
  assert.equal(allowAnalyticsEvent(`store-b-${Date.now()}`, session, `${ip}-other`), true)
})
