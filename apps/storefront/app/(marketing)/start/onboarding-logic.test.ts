import test from 'node:test'
import assert from 'node:assert/strict'
import { launchProblem, nextSlug, isSiteType } from './onboarding-logic'

test('launchProblem accepts a complete shop and ngo', () => {
    assert.equal(launchProblem({ type: 'shop', name: 'Wanjiru Crafts', slug: 'wanjiru-crafts' }), null)
    assert.equal(launchProblem({ type: 'ngo', name: 'Hope Trust', slug: 'hope-trust' }), null)
})

test('launchProblem reports the first problem', () => {
    assert.ok(launchProblem({ type: 'events', name: 'Fest', slug: 'fest-ke' }), 'events is not offered here')
    assert.ok(launchProblem({ type: 'shop', name: ' a ', slug: 'abc' }))
    assert.ok(launchProblem({ type: 'shop', name: 'x'.repeat(61), slug: 'abc' }))
    assert.ok(launchProblem({ type: 'shop', name: 'Fine', slug: '' }))
    assert.ok(launchProblem({ type: 'shop', name: 'Fine', slug: 'login' }))
})

test('nextSlug follows the name until the address is edited', () => {
    assert.equal(nextSlug('Wanjiru Crafts', '', false), 'wanjiru-crafts')
    assert.equal(nextSlug('Wanjiru Crafts Ltd', 'my-own', true), 'my-own')
})

test('isSiteType', () => {
    assert.equal(isSiteType('shop'), true)
    assert.equal(isSiteType('x'), false)
    assert.equal(isSiteType(undefined), false)
})
