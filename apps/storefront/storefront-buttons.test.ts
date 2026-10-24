// Theme button rules in storefront.css must not match a @mcloud/ui Button by class substring.
// Every Button's class list contains Tailwind's `outline-none`, so `button[class*="outline"]`
// styled every primary Button (the cart's "Proceed to Checkout") as a transparent outline one,
// and the button sat unnoticed on live stores. A class-substring rule is only allowed for plain
// <button>s, i.e. guarded by :not([data-variant]); Buttons are matched by data-variant.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const css = readFileSync(path.join(here, 'app/(storefront)/store/[slug]/storefront.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')

const selectors = [...css.matchAll(/([^{}]+)\{/g)]
    .flatMap((m) => m[1].split(','))
    .map((s) => s.trim())
    .filter((s) => /\bbutton\b/.test(s) && /\[class\*=/.test(s))

assert.ok(selectors.length > 0, 'expected the theme button rules in storefront.css')
for (const s of selectors) {
    assert.ok(s.includes(':not([data-variant])'), `class-substring button rule must skip variant Buttons: ${s}`)
}

// The cart's primary Button: its real class list must not hit the outline rule.
const buttonClasses = readFileSync(path.join(here, '../../packages/ui/src/button.tsx'), 'utf8')
assert.match(buttonClasses, /outline-none/, 'premise: Button classes contain outline-none')

console.log('storefront button rule tests passed')
