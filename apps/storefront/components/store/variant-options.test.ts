import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatOptions, optionsEqual, parseOptions, sanitizeOptions } from './variant-options.ts'

test('parses name/value pairs with : or =', () => {
    assert.deepEqual(parseOptions('Size: M, Colour=Red'), { Size: 'M', Colour: 'Red' })
})

test('drops blank, half-filled and duplicate names while typing', () => {
    assert.deepEqual(parseOptions('Size: , Colour, : Red, Size: L, Size: XL'), { Size: 'L' })
    assert.deepEqual(parseOptions(''), {})
})

test('caps the number of options', () => {
    assert.equal(Object.keys(parseOptions('a:1,b:2,c:3,d:4,e:5,f:6')).length, 5)
})

test('format then parse round-trips', () => {
    const o = { Size: 'M', Colour: 'Red' }
    assert.deepEqual(parseOptions(formatOptions(o)), o)
    assert.equal(formatOptions(null), '')
})

test('sanitize coerces to clean strings and rejects non-objects', () => {
    assert.deepEqual(sanitizeOptions({ Size: ' M ', Qty: 2, Bad: {}, '': 'x' }), { Size: 'M', Qty: '2' })
    assert.deepEqual(sanitizeOptions([1, 2]), {})
    assert.deepEqual(sanitizeOptions(null), {})
})

test('optionsEqual compares by content', () => {
    assert.ok(optionsEqual({ a: '1' }, { a: '1' }))
    assert.ok(!optionsEqual({ a: '1' }, { a: '2' }))
    assert.ok(!optionsEqual({ a: '1' }, {}))
})
