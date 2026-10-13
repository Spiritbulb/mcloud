import test from 'node:test'
import assert from 'node:assert/strict'
import { slugFromName, slugProblem } from './slug'

test('slugFromName makes a clean address', () => {
    assert.equal(slugFromName("Wanjiru's Crafts!"), 'wanjiru-s-crafts')
    assert.equal(slugFromName('  --Hello   World--  '), 'hello-world')
    assert.equal(slugFromName('***'), '')
})

test('slugProblem rejects bad and reserved addresses', () => {
    assert.equal(slugProblem('wanjiru-crafts'), null)
    assert.ok(slugProblem(''))
    assert.ok(slugProblem('ab'))
    assert.ok(slugProblem('-bad-'))
    assert.ok(slugProblem('Upper'))
    for (const r of ['org', 'start', 'login', 'signup', 'moving', 'api']) assert.ok(slugProblem(r), r)
})
