import assert from 'node:assert/strict'
import { test } from 'node:test'
import { afterOnboardingPath, sanitizeOrgSubpath } from './onboarding-logic'

test('goes to the new org when there is nowhere else to go', () => {
    assert.equal(afterOnboardingPath('acme', undefined), '/org/acme')
    assert.equal(afterOnboardingPath('acme', ''), '/org/acme')
    assert.equal(afterOnboardingPath('acme', '/'), '/org/acme')
})

test('keeps the org sub-path they were heading for', () => {
    // redirectToOrgPath hands over `/servers`, not `/org/servers`.
    assert.equal(afterOnboardingPath('acme', '/servers'), '/org/acme/servers')
    assert.equal(afterOnboardingPath('acme', '/stores/new?plan=pro'), '/org/acme/stores/new?plan=pro')
})

test('drops anything that could leave the org or the origin', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'servers', '/a\nb']) {
        assert.equal(sanitizeOrgSubpath(bad), '', bad)
    }
})
