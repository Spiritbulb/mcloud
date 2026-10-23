import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storefrontDisplayUrl, storefrontUrl } from './storefront-url.ts'

test('platform stores live under the site origin', () => {
    assert.match(storefrontUrl('reach'), /\/reach$/)
    assert.doesNotMatch(storefrontDisplayUrl('reach'), /^https?:/)
})

test('an apex custom domain is linked as www, a subdomain as itself', () => {
    assert.equal(storefrontUrl('x', 'locdessence.com'), 'https://www.locdessence.com')
    assert.equal(storefrontUrl('x', 'shop.example.com'), 'https://shop.example.com')
    assert.equal(storefrontUrl('x', 'mystore.co.ke'), 'https://www.mystore.co.ke')
})

test('display URLs drop the scheme', () => {
    assert.equal(storefrontDisplayUrl('x', 'locdessence.com'), 'www.locdessence.com')
    assert.equal(storefrontDisplayUrl('x', 'shop.example.com'), 'shop.example.com')
})
