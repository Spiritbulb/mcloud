import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dailySeries, seriesIsEmpty } from './overview-series.ts'

// 2026-11-12 10:00 in Nairobi (UTC+3).
const now = new Date('2026-11-12T07:00:00Z')

test('one entry per day, oldest first, ending on today in Nairobi', () => {
    const s = dailySeries([], { days: 14, now, commerce: true })
    assert.equal(s.length, 14)
    assert.equal(s[0].date, '2026-10-30')
    assert.equal(s[13].date, '2026-11-12')
    assert.ok(s.every((d) => d.amount === 0 && d.count === 0))
})

test('days are Nairobi calendar days, not UTC', () => {
    // 23:30 UTC on the 10th is 02:30 on the 11th in Nairobi.
    const s = dailySeries([{ total: 500, status: 'paid', created_at: '2026-11-10T23:30:00Z' }], { days: 14, now, commerce: true })
    assert.equal(s.find((d) => d.date === '2026-11-11')?.amount, 500)
    assert.equal(s.find((d) => d.date === '2026-11-10')?.amount, 0)
})

test('a shop counts only orders that were paid', () => {
    const rows = ['paid', 'processing', 'shipped', 'delivered', 'pending', 'cancelled', 'refunded', null]
        .map((status) => ({ total: 100, status, created_at: '2026-11-12T05:00:00Z' }))
    const today = dailySeries(rows, { days: 14, now, commerce: true })[13]
    assert.equal(today.amount, 400)
    assert.equal(today.count, 4)
})

test('a non-profit counts only completed donations', () => {
    const at = '2026-11-12T05:00:00Z'
    const rows = [
        { total: 1000, status: 'paid', created_at: at, metadata: { isDonation: true, payment_status: 'completed' } },
        { total: 300, status: 'paid', created_at: at, metadata: { isDonation: 'true', payment_status: 'completed' } },
        { total: 900, status: 'pending', created_at: at, metadata: { isDonation: true, payment_status: 'pending' } },
        { total: 700, status: 'paid', created_at: at, metadata: {} },
    ]
    const today = dailySeries(rows, { days: 14, now, commerce: false })[13]
    assert.equal(today.amount, 1300)
    assert.equal(today.count, 2)
})

test('orders outside the window and unreadable totals are ignored', () => {
    const rows = [
        { total: 100, status: 'paid', created_at: '2026-10-29T12:00:00Z' },
        { total: null, status: 'paid', created_at: '2026-11-12T05:00:00Z' },
        { total: 50, status: 'paid', created_at: 'not a date' },
        { total: 70, status: 'paid', created_at: null },
    ]
    const s = dailySeries(rows, { days: 14, now, commerce: true })
    assert.equal(s.reduce((n, d) => n + d.amount, 0), 0)
    assert.equal(s[13].count, 1)
})

test('getStoreOverview feeds the trend from a date-bounded query, not every order', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('./store-data.ts', import.meta.url), 'utf8')
    // A store with more than 1000 orders would get an arbitrary capped slice from an unbounded select.
    assert.match(src, /dailySeries\(trendOrders \?\? \[\]/)
    assert.match(src, /\.gte\('created_at', sinceTrend\)/)
})

test('a window with no takings is reported as empty, not drawn as a flat line', () => {
    assert.equal(seriesIsEmpty(dailySeries([], { days: 14, now, commerce: true })), true)
    assert.equal(seriesIsEmpty(dailySeries([{ total: 5, status: 'paid', created_at: '2026-11-12T05:00:00Z' }], { days: 14, now, commerce: true })), false)
})
