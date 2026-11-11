import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The nav holds two direct <div> children: the bar and, on phones, the menu drawer.
// Theme rules that size or round "the bar" must target the bar by class, or they
// squash the drawer (fixed height, pill corners) and its links spill over the page.
const css = readFileSync(new URL('../app/(storefront)/store/[slug]/store-themes.css', import.meta.url), 'utf8')
const nav = readFileSync(new URL('../components/store/store-nav.tsx', import.meta.url), 'utf8')
assert.ok(!/\.sf-nav\s*>\s*div/.test(css), 'no theme rule targets every div inside the nav')
assert.ok(css.includes('.sf-nav__bar'), 'themes style the bar by its class')
assert.ok(/className="sf-nav__bar[ "]/.test(nav), 'the nav bar carries sf-nav__bar')

// Studio's white headline and button are for text ON a photo. Without an image the
// hero shows --sf-primary, which can be white, so those rules must need the image.
const whiteRules = css.split('}').filter((r) => /data-sf-theme="studio"/.test(r) && /#fff\b/.test(r))
assert.ok(whiteRules.length > 0, 'studio has white-on-image rules')
for (const r of whiteRules) assert.ok(r.includes('.sf-hero__slide--image'), `white text needs an image: ${r.trim().slice(0, 80)}`)

console.log('store-themes-css.test.ts OK')
