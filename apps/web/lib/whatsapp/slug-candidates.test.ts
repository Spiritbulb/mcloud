import test from 'node:test'
import assert from 'node:assert/strict'
import { slugCandidates, pickFreeSlug } from './slug-candidates'
import { slugProblem } from '@mcloud/merchant/slug'

test('slug comes from the name', () => {
    assert.equal(slugCandidates("Wanjiru's Crafts!")[0], 'wanjiru-s-crafts')
    assert.equal(slugCandidates('  Tea   House ')[0], 'tea-house')
})

test('short, empty, emoji only and reserved names still give a valid slug', () => {
    assert.equal(slugCandidates('Jo')[0], 'jo-site')
    assert.equal(slugCandidates('A')[0], 'a-site')
    assert.equal(slugCandidates('🎉🎉')[0], 'my-store')
    assert.equal(slugCandidates('Admin')[0], 'admin-store')
    assert.equal(slugCandidates('Orders')[0], 'orders-store')
})

test('long names are capped and never end with a hyphen', () => {
    const c = slugCandidates('word '.repeat(30))[0]
    assert.ok(c.length <= 40)
    assert.ok(!c.endsWith('-'))
})

test('every candidate is valid and unique, and falls through collisions', () => {
    const c = slugCandidates('Tea House', () => 0.5)
    assert.equal(new Set(c).size, c.length)
    for (const s of c) assert.equal(slugProblem(s), null)
    assert.equal(pickFreeSlug(c, new Set()), 'tea-house')
    assert.equal(pickFreeSlug(c, new Set(['tea-house'])), 'tea-house-2')
    assert.equal(pickFreeSlug(c, new Set(['tea-house', 'tea-house-2', 'tea-house-3'])), 'tea-house-4')
    assert.equal(pickFreeSlug(c, new Set(c)), null)
})
