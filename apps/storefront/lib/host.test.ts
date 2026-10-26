import test from 'node:test'
import assert from 'node:assert/strict'
import { redirectsToCustomDomain } from './host'

test('a store with a custom domain is redirected off the platform host', () => {
    assert.equal(redirectsToCustomDomain('app.mcloud.co.ke', 'shop.example.com', '/'), true)
    assert.equal(redirectsToCustomDomain('app.mcloud.co.ke', 'shop.example.com', '/cart'), true)
})

test('the Editor preview stays on the platform host so the Editor can frame it', () => {
    assert.equal(redirectsToCustomDomain('app.mcloud.co.ke', 'shop.example.com', '/-preview'), false)
    // Only the exact segment: a product slug that merely starts with it still redirects.
    assert.equal(redirectsToCustomDomain('app.mcloud.co.ke', 'shop.example.com', '/-previewer'), true)
})

test('no custom domain, or local dev, never redirects', () => {
    assert.equal(redirectsToCustomDomain('app.mcloud.co.ke', null, '/'), false)
    assert.equal(redirectsToCustomDomain('localhost:3001', 'shop.example.com', '/'), false)
})
