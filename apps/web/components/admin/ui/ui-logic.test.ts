import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deltaTone, formatDelta, percentChange, sparklinePaths } from './ui-logic.ts'

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
