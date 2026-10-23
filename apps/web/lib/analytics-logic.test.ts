import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_GA_ID, isTrackablePath, parseConsent, reportedLocation, resolveGaId } from './analytics-logic.ts'

test('falls back to the production property when the env var is unset or blank', () => {
    assert.equal(resolveGaId(undefined), DEFAULT_GA_ID)
    assert.equal(resolveGaId(''), DEFAULT_GA_ID)
    assert.equal(resolveGaId('   '), DEFAULT_GA_ID)
})

test('an env override wins, and a malformed one tracks nothing', () => {
    assert.equal(resolveGaId(' G-ABC123XYZ '), 'G-ABC123XYZ')
    assert.equal(resolveGaId('UA-12345-1'), null)
    assert.equal(resolveGaId('G-'), null)
})

test('measures the public site and merchant app, never admin, auth or tokenised URLs', () => {
    for (const p of ['/', '/pricing', '/org/acme', '/org/acme/stores']) assert.ok(isTrackablePath(p), p)
    for (const p of ['/admin', '/admin/orders', '/auth/login', '/callback', '/invite/abc123', '/dev-login', '/api/x', '/settings'])
        assert.ok(!isTrackablePath(p), p)
})

test('prefix match is on whole segments', () => {
    assert.ok(isTrackablePath('/administrators'))
    assert.ok(isTrackablePath('/authors'))
    assert.ok(isTrackablePath('/invitations'))
})

test('the reported URL drops everything except campaign and click ids', () => {
    const r = reportedLocation('/pricing', '?code=SECRET&utm_source=x&ticket=T&gclid=g1&returnTo=%2Forg&email=a%40b.co', 'https://mcloud.co.ke')
    assert.equal(r.path, '/pricing?utm_source=x&gclid=g1')
    assert.equal(r.location, 'https://mcloud.co.ke/pricing?utm_source=x&gclid=g1')
})

test('no query string at all gives a bare path', () => {
    assert.deepEqual(reportedLocation('/', '', 'https://mcloud.co.ke'), { path: '/', location: 'https://mcloud.co.ke/' })
    assert.equal(reportedLocation('/', '?state=abc', 'https://mcloud.co.ke').path, '/')
})

test('consent is granted unless the visitor declined', () => {
    assert.equal(parseConsent(null), 'granted')
    assert.equal(parseConsent('1'), 'granted')
    assert.equal(parseConsent('accepted'), 'granted')
    assert.equal(parseConsent('declined'), 'denied')
})
