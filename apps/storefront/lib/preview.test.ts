import assert from 'node:assert/strict'
import { signPreview, verifyPreview, isSafeCssValue } from './preview'

const SECRET = 'test-secret-do-not-use'

// A token is scoped to one store and verifiable.
const t = signPreview('store-a', SECRET)
assert.ok(verifyPreview(t, 'store-a', SECRET), 'a valid token verifies')

// It does NOT unlock a different store.
assert.ok(!verifyPreview(t, 'store-b', SECRET), 'token is scoped to its store')

// It cannot be forged without the secret.
assert.ok(!verifyPreview(t, 'store-a', 'wrong-secret'), 'a wrong secret fails')
assert.ok(!verifyPreview('garbage', 'store-a', SECRET), 'garbage fails')
assert.ok(!verifyPreview('', 'store-a', SECRET), 'empty fails')

// The listener must only ever apply plain CSS values.
assert.ok(isSafeCssValue('#EFC940'))
assert.ok(isSafeCssValue('Quicksand'))
assert.ok(isSafeCssValue('8px'))
assert.ok(isSafeCssValue('1.2'))
assert.ok(!isSafeCssValue('red; background: url(evil)'), 'no semicolons')
assert.ok(!isSafeCssValue('url(javascript:alert(1))'), 'no url()')
assert.ok(!isSafeCssValue('expression(alert(1))'), 'no expression()')
assert.ok(!isSafeCssValue('</style><script>'), 'no markup')

console.log('preview.test.ts OK')
