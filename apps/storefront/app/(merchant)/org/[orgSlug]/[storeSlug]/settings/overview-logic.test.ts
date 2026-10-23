import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatCurrency, funnelRate, overviewHeadline, overviewSummary } from './overview-logic.ts'

test('funnel rates are against views, clamped, and null without views', () => {
    assert.equal(funnelRate(5, 40), '12.5%')
    assert.equal(funnelRate(50, 40), '100.0%')
    assert.equal(funnelRate(0, 40), '0.0%')
    assert.equal(funnelRate(3, 0), null)
})

test('headlines follow the vertical and whether money has come in', () => {
    assert.equal(overviewHeadline('Reach', true, true), 'Reach is making money.')
    assert.equal(overviewHeadline('Reach', true, false), 'Reach is ready to sell.')
    assert.equal(overviewHeadline('KFS', false, true), 'KFS is raising money.')
    assert.equal(overviewHeadline('KFS', false, false), 'KFS is ready for donations.')
})

test('the summary names the amount once there is one', () => {
    assert.match(overviewSummary({ commerce: true, revenue: 581, raised: 0, currency: 'KES' }), /earned .*581/)
    assert.match(overviewSummary({ commerce: false, revenue: 0, raised: 1200, currency: 'KES' }), /raised .*1,200/)
    assert.match(overviewSummary({ commerce: true, revenue: 0, raised: 0, currency: 'KES' }), /first order/)
    // Donations do not count as revenue for a shop, and vice versa.
    assert.match(overviewSummary({ commerce: false, revenue: 999, raised: 0, currency: 'KES' }), /first donation/)
})

test('currency formatting has no decimals', () => {
    assert.match(formatCurrency(2795.6, 'KES'), /2,796/)
})
