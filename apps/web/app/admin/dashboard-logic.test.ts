import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeRevenue, attentionItems, formatMoney } from './dashboard-logic.ts'

const NOW = Date.parse('2026-10-23T12:00:00Z')
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString()

test('sums paid orders per currency, biggest first, and never mixes currencies', () => {
    const r = summarizeRevenue(
        [
            { total: 1000, currency: 'KES', created_at: ago(1) },
            { total: 500, currency: 'kes', created_at: ago(10) },
            { total: 20, currency: 'USD', created_at: ago(2) },
        ],
        NOW,
    )
    assert.deepEqual(r.map((x) => x.currency), ['KES', 'USD'])
    assert.equal(r[0].last30, 1500)
    assert.equal(r[0].last7, 1000)
    assert.equal(r[0].orders30, 2)
    assert.equal(r[1].last30, 20)
})

test('ignores orders in the future, beyond 60 days, or with no usable total/date', () => {
    const r = summarizeRevenue(
        [
            { total: 900, currency: 'KES', created_at: ago(61) },
            { total: 900, currency: 'KES', created_at: ago(-1) },
            { total: null, currency: 'KES', created_at: ago(1) },
            { total: Number.NaN, currency: 'KES', created_at: ago(1) },
            { total: 5, currency: 'KES', created_at: null },
            { total: 5, currency: 'KES', created_at: 'not a date' },
        ],
        NOW,
    )
    assert.deepEqual(r, [])
})

test('days 31-60 feed only the previous-period comparison', () => {
    const r = summarizeRevenue(
        [
            { total: 100, currency: 'KES', created_at: ago(5) },
            { total: 40, currency: 'KES', created_at: ago(31) },
            { total: 60, currency: 'KES', created_at: ago(59) },
        ],
        NOW,
    )
    assert.equal(r[0].last30, 100)
    assert.equal(r[0].orders30, 1)
    assert.equal(r[0].prev30, 100)
    assert.equal(r[0].ordersPrev30, 2)
    assert.equal(r[0].daily.reduce((a, b) => a + b, 0), 100)
})

test('a currency that only sold last period still shows, at zero now', () => {
    const r = summarizeRevenue([{ total: 80, currency: 'USD', created_at: ago(40) }], NOW)
    assert.deepEqual([r[0].currency, r[0].last30, r[0].prev30], ['USD', 0, 80])
})

test('a missing currency counts as KES', () => {
    const r = summarizeRevenue([{ total: 10, currency: null, created_at: ago(0) }], NOW)
    assert.equal(r[0].currency, 'KES')
})

test('daily series is oldest -> newest and puts today in the last slot', () => {
    const r = summarizeRevenue(
        [
            { total: 7, currency: 'KES', created_at: ago(0) },
            { total: 3, currency: 'KES', created_at: ago(1) },
            { total: 2, currency: 'KES', created_at: ago(20) },
        ],
        NOW,
        14,
    )
    const d = r[0].daily
    assert.equal(d.length, 14)
    assert.equal(d[13], 7)
    assert.equal(d[12], 3)
    assert.equal(d.reduce((a, b) => a + b, 0), 10) // the 20-day-old order is outside the 14-day window
    assert.equal(r[0].last30, 12) // ...but still inside the 30-day total
})

test('attention queue lists only non-empty queues; empty means all clear', () => {
    assert.deepEqual(attentionItems({ pendingSubs: 0, pendingVendors: 0, failedWebhooks: 0 }), [])
    const items = attentionItems({ pendingSubs: 2, pendingVendors: 0, failedWebhooks: 1 })
    assert.deepEqual(items.map((i) => [i.id, i.count]), [['pendingSubs', 2], ['failedWebhooks', 1]])
    assert.ok(items.every((i) => i.href.startsWith('/admin/')))
})

test('formats whole units with grouping', () => {
    assert.equal(formatMoney(12400.4, 'KES'), 'KES 12,400')
})
