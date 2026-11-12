import { test } from 'node:test'
import assert from 'node:assert/strict'
import { colorModeFrom, darkLogoFrom, logoSizeFrom, logoStyle } from './brand.ts'

test('colour mode defaults to auto and rejects unknown values', () => {
    assert.equal(colorModeFrom(null), 'auto')
    assert.equal(colorModeFrom({ colorMode: 'dark' }), 'dark')
    assert.equal(colorModeFrom({ colorMode: 'purple' }), 'auto')
    assert.equal(colorModeFrom({ colorMode: 3 }), 'auto')
})

test('logo size defaults to medium and rejects unknown values', () => {
    assert.equal(logoSizeFrom(undefined), 'md')
    assert.equal(logoSizeFrom({ logoSize: 'lg' }), 'lg')
    assert.equal(logoSizeFrom({ logoSize: '999px; x' }), 'md')
})

test('logo style is bounded and capped to the viewport', () => {
    assert.deepEqual(logoStyle('md'), { height: 40, maxWidth: 'min(220px, 55vw)' })
    assert.ok(logoStyle('lg').height < 56)
})

test('dark logo needs a light logo to pair with', () => {
    assert.equal(darkLogoFrom('https://x/l.png', { logoDarkUrl: 'https://x/d.png' }), 'https://x/d.png')
    assert.equal(darkLogoFrom(null, { logoDarkUrl: 'https://x/d.png' }), null)
    assert.equal(darkLogoFrom('https://x/l.png', { logoDarkUrl: '' }), null)
    assert.equal(darkLogoFrom('https://x/l.png', {}), null)
})
