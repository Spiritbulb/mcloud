import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isStaging, mpesaCallbackUrl } from './deploy-env'

const PROD_CALLBACK = 'https://mcloud.co.ke/api/payments/mpesa/callback'

test('isStaging is true only for the exact value "staging"', () => {
    assert.equal(isStaging('staging'), true)
    assert.equal(isStaging('production'), false)
    assert.equal(isStaging('Staging '), false)
    assert.equal(isStaging(''), false)
})

test('outside staging the callback is always the registered production URL', () => {
    assert.equal(mpesaCallbackUrl('https://www.mcloud.co.ke', ''), PROD_CALLBACK)
    assert.equal(mpesaCallbackUrl('https://staging.mcloud.co.ke', 'production'), PROD_CALLBACK)
    assert.equal(mpesaCallbackUrl(undefined, ''), PROD_CALLBACK)
})

test('on staging the callback falls back to production without a usable origin', () => {
    assert.equal(mpesaCallbackUrl(undefined, 'staging'), PROD_CALLBACK)
    assert.equal(mpesaCallbackUrl(null, 'staging'), PROD_CALLBACK)
    assert.equal(mpesaCallbackUrl('', 'staging'), PROD_CALLBACK)
    assert.equal(mpesaCallbackUrl('not a url', 'staging'), PROD_CALLBACK)
})

test('on staging the callback uses only the origin of the configured URL', () => {
    assert.equal(mpesaCallbackUrl('https://staging.mcloud.co.ke/', 'staging'), 'https://staging.mcloud.co.ke/api/payments/mpesa/callback')
    assert.equal(mpesaCallbackUrl('https://staging.mcloud.co.ke/some/path', 'staging'), 'https://staging.mcloud.co.ke/api/payments/mpesa/callback')
})
