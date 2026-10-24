import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deltaTone, formatDelta, humanize, initials, isDirty, percentChange, skeletonWidth, sparklinePaths, timeAgo } from './ui-logic.ts'

test('percent change is relative to the previous period', () => {
    assert.equal(percentChange(150, 100), 50)
    assert.equal(percentChange(50, 100), -50)
    assert.equal(percentChange(100, 100), 0)
})

test('no baseline means no percentage, not infinity', () => {
    assert.equal(percentChange(10, 0), null)
    assert.equal(percentChange(0, 0), null)
    assert.equal(percentChange(Number.NaN, 5), null)
})

test('tiny moves read as flat', () => {
    assert.equal(deltaTone(null), 'flat')
    assert.equal(deltaTone(0.4), 'flat')
    assert.equal(deltaTone(-0.4), 'flat')
    assert.equal(deltaTone(3), 'up')
    assert.equal(deltaTone(-3), 'down')
})

test('formats deltas with a real minus sign', () => {
    assert.equal(formatDelta(12.4), '+12%')
    assert.equal(formatDelta(-3.6), '−4%')
    assert.equal(formatDelta(0.2), '0%')
    assert.equal(formatDelta(null), '—')
    assert.equal(formatDelta(1234), '+1,234%')
})

test('sparkline spans the box, with the lowest point on the baseline', () => {
    const { line, area } = sparklinePaths([0, 5, 10], 100, 20, 0)
    assert.equal(line, 'M0 20 L50 10 L100 0')
    assert.equal(area, 'M0 20 L50 10 L100 0 L100 20 L0 20 Z')
})

test('a flat series is a level line mid-height; one point does not divide by zero', () => {
    assert.equal(sparklinePaths([3, 3, 3], 100, 20, 0).line, 'M0 10 L50 10 L100 10')
    assert.equal(sparklinePaths([7], 100, 20, 0).line, 'M50 10')
})

test('an empty series draws nothing', () => {
    assert.deepEqual(sparklinePaths([], 100, 20), { line: '', area: '' })
})

test('initials take the first two words, uppercased', () => {
    assert.equal(initials('ada lovelace'), 'AL')
    assert.equal(initials('  Nelly  '), 'N')
    assert.equal(initials('a b c d'), 'AB')
    assert.equal(initials(null), '?')
    assert.equal(initials('   '), '?')
})

const NOW = Date.parse('2026-10-23T12:00:00Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const MIN = 60_000
const DAY = 86_400_000

test('time ago steps up through minutes, hours, days, months, years', () => {
    assert.equal(timeAgo(ago(20_000), NOW), 'just now')
    assert.equal(timeAgo(ago(5 * MIN), NOW), '5m ago')
    assert.equal(timeAgo(ago(3 * 60 * MIN), NOW), '3h ago')
    assert.equal(timeAgo(ago(2 * DAY), NOW), '2d ago')
    assert.equal(timeAgo(ago(65 * DAY), NOW), '2mo ago')
    assert.equal(timeAgo(ago(800 * DAY), NOW), '2y ago')
})

test('time ago tolerates a future date, a blank and garbage', () => {
    assert.equal(timeAgo(new Date(NOW + DAY).toISOString(), NOW), 'just now')
    assert.equal(timeAgo(null, NOW), '')
    assert.equal(timeAgo('nope', NOW), '')
})

test('skeleton widths vary across a row and down a column but repeat exactly', () => {
    const row0 = [0, 1, 2, 3].map((c) => skeletonWidth(0, c))
    assert.ok(new Set(row0).size > 1, 'columns in one row should differ')
    const col0 = [0, 1, 2, 3].map((r) => skeletonWidth(r, 0))
    assert.ok(new Set(col0).size > 1, 'rows in one column should differ')
    assert.equal(skeletonWidth(4, 2), skeletonWidth(4, 2))
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        const w = skeletonWidth(r, c)
        assert.ok(w >= 30 && w <= 90, `width ${w} out of range`)
    }
})

test('isDirty compares form data by value, ignoring key order and undefined keys', () => {
    assert.equal(isDirty({ a: 1, b: 'x' }, { b: 'x', a: 1 }), false)
    assert.equal(isDirty({ a: 1 }, { a: 2 }), true)
    assert.equal(isDirty({ tags: ['a', 'b'] }, { tags: ['a', 'b'] }), false)
    assert.equal(isDirty({ tags: ['a', 'b'] }, { tags: ['b', 'a'] }), true)
    assert.equal(isDirty({ nested: { on: true } }, { nested: { on: false } }), true)
    assert.equal(isDirty({ a: 1, gone: undefined }, { a: 1 }), false)
    assert.equal(isDirty({ note: null }, { note: undefined }), false)
    assert.equal(isDirty({ note: '' }, { note: null }), true)
    assert.equal(isDirty([], {}), true)
})

test('humanize turns raw statuses into labels', () => {
    assert.equal(humanize('paid'), 'Paid')
    assert.equal(humanize('partially_paid'), 'Partially paid')
    assert.equal(humanize('partially-fulfilled'), 'Partially fulfilled')
    assert.equal(humanize(null), '—')
    assert.equal(humanize(''), '—')
})
