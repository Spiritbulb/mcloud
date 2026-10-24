import assert from 'node:assert/strict'
import { fontScalePercent, googleFontsHref } from './fonts'

// Nothing to fetch.
assert.equal(googleFontsHref([]), null)
assert.equal(googleFontsHref([null, undefined, '']), null)

// System stacks need no webfont — requesting them would be a wasted round-trip.
assert.equal(googleFontsHref(['serif', 'sans-serif']), null)
assert.equal(googleFontsHref(['Arial', 'Georgia']), null)

// A real family is requested, with weights (a missing weight gets faux-bolded).
const one = googleFontsHref(['Quicksand'])
assert.ok(one!.startsWith('https://fonts.googleapis.com/css2?'), 'is a google fonts url')
assert.ok(one!.includes('family=Quicksand:wght@300;400;500;600;700'), 'asks for weights')
assert.ok(one!.includes('display=swap'), 'swaps rather than blocking render')

// Spaces become +.
assert.ok(googleFontsHref(['Playfair Display'])!.includes('family=Playfair+Display:'))

// The same face for heading and body is requested once, not twice.
const dup = googleFontsHref(['Quicksand', 'Quicksand'])
assert.equal(dup!.match(/family=/g)!.length, 1, 'de-duplicated')

// Two different faces are both requested.
const two = googleFontsHref(['Playfair Display', 'Inter'])
assert.equal(two!.match(/family=/g)!.length, 2)

// A hostile settings value cannot smuggle anything into the URL.
assert.equal(googleFontsHref(['Evil"/><script>']), null, 'rejects markup')
assert.equal(googleFontsHref(['Foo&family=Bar']), null, 'rejects url injection')

// Quotes from a CSS-ish value are tolerated.
assert.ok(googleFontsHref(["'Quicksand'"])!.includes('family=Quicksand:'))

console.log('fonts.test.ts OK')

// Text size: a percentage for <html>, or null for the default. It is written into
// CSS, so anything that is not a plain number comes out as null, never as text.
assert.equal(fontScalePercent('1'), null)
assert.equal(fontScalePercent(undefined), null)
assert.equal(fontScalePercent('1.15'), 115)
assert.equal(fontScalePercent(0.9), 90)
assert.equal(fontScalePercent('3'), 140, 'clamped to the Editor range')
assert.equal(fontScalePercent('1;}body{display:none'), null)
assert.equal(fontScalePercent('calc(2)'), null)
