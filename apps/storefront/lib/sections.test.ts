import assert from 'node:assert/strict'
import { SECTION_REGISTRY, DEFAULT_HOME_SECTIONS, defaultHomeSections } from './sections'

const ctx = {
  store: { slug: 's' },
  products: [{ id: 'p1' }],
  collections: [{ id: 'c1' }],
  featuredProducts: [{ id: 'p1' }],
  campaigns: [],
}

// every known type maps to an existing classic section template key
for (const [type, def] of Object.entries(SECTION_REGISTRY)) {
  assert.ok(def.templateKey.startsWith('classic/sections/'), `${type} maps to a classic section`)
}
assert.equal(SECTION_REGISTRY.hero.templateKey, 'classic/sections/hero')
assert.equal(SECTION_REGISTRY.collections.templateKey, 'classic/sections/collections-grid')
assert.equal(SECTION_REGISTRY.featured.templateKey, 'classic/sections/featured-products')
assert.equal(SECTION_REGISTRY['all-products'].templateKey, 'classic/sections/all-products')

// NGO section types map to their templates and pick only { store }
assert.equal(SECTION_REGISTRY.mission.templateKey, 'classic/sections/mission')
assert.equal(SECTION_REGISTRY.programs.templateKey, 'classic/sections/programs')
assert.equal(SECTION_REGISTRY.impact.templateKey, 'classic/sections/impact')
assert.equal(SECTION_REGISTRY.contact.templateKey, 'classic/sections/contact')
for (const t of ['mission', 'programs', 'impact', 'contact'] as const) {
  assert.deepEqual(Object.keys(SECTION_REGISTRY[t].pickContext(ctx)), ['store'], `${t} picks only store`)
}

// The hero needs campaigns as well as the store: on a non-commerce site its CTA
// opens the donate flow for the lead campaign rather than scrolling to products.
// Without campaigns in its context that button silently never renders.
//
// It also gets `slides` and `authored`, which are the whole hero model:
//   slides   — what the visitor SEES (defaults substituted in)
//   authored — what is actually STORED (no defaults)
// The two MUST stay separate. A hero with no title displays the store's name, so
// reporting the rendered value to the Editor would save "Test Store" as though the
// merchant had typed it, freezing the fallback into their record.
const heroCtx = SECTION_REGISTRY.hero.pickContext({
  ...ctx,
  store: { slug: 's', name: 'Test Store', settings: {} },
} as any) as any
assert.deepEqual(Object.keys(heroCtx).sort(), ['authored', 'campaigns', 'slides', 'store'])
assert.equal(heroCtx.slides.length, 1, 'a store with no heroSlides still gets one slide')
assert.equal(heroCtx.slides[0].title, 'Test Store', 'which DISPLAYS the store name')
assert.equal(heroCtx.authored[0].title, '', 'but reports nothing stored — the trap')
assert.deepEqual(Object.keys(SECTION_REGISTRY.collections.pickContext(ctx)).sort(), ['collections', 'store'])
const feat = SECTION_REGISTRY.featured.pickContext(ctx)
assert.deepEqual((feat as any).products, ctx.featuredProducts, 'featured maps featuredProducts -> products')
const all = SECTION_REGISTRY['all-products'].pickContext(ctx)
assert.deepEqual((all as any).products, ctx.products, 'all-products maps products -> products')

assert.equal(SECTION_REGISTRY.campaigns.templateKey, 'classic/sections/campaigns')
assert.deepEqual(Object.keys(SECTION_REGISTRY.campaigns.pickContext({
  store: { slug: 's' }, products: [], collections: [], featuredProducts: [], campaigns: [{ id: 'c1' }],
} as any)).sort(), ['campaigns', 'store'])
assert.deepEqual(defaultHomeSections('ngo').map(s => s.type), ['hero', 'programs', 'impact', 'campaigns', 'contact'])

// defaultHomeSections is vertical-aware
assert.deepEqual(defaultHomeSections('shop').map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])
assert.deepEqual(defaultHomeSections('bogus').map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'unknown -> shop')
assert.deepEqual(defaultHomeSections(null).map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'null -> shop')
assert.deepEqual(defaultHomeSections(undefined).map(s => s.type), ['hero', 'collections', 'featured', 'all-products'], 'undefined -> shop')

// back-compat constant still equals the shop set
assert.deepEqual(DEFAULT_HOME_SECTIONS.map(s => s.type), ['hero', 'collections', 'featured', 'all-products'])

console.log('sections.test.ts: all assertions passed')

// ── SP6: every section declares a label and a schema ──
import type { SettingField } from '@mcloud/verticals'

const EXPECTED_DEFAULTS: Record<string, { heading?: string; eyebrow?: string }> = {
  collections:     { heading: 'Shop by Category',  eyebrow: 'Collections' },
  featured:        { heading: 'Top Picks',         eyebrow: 'Featured Collection' },
  'all-products':  { heading: 'Browse Everything', eyebrow: 'All Products' },
  programs:        { heading: 'What We Do',        eyebrow: 'Programs' },
  impact:          { heading: 'Our Impact',        eyebrow: 'Impact' },
  contact:         { heading: 'Contact Us',        eyebrow: 'Get in Touch' },
  campaigns:       { heading: 'Support a Cause',   eyebrow: 'Campaigns' },
  mission:         { eyebrow: 'Our Mission' },
}

for (const [type, def] of Object.entries(SECTION_REGISTRY)) {
  assert.ok(def.label && def.label.length > 0, `${type} has a human label for the rail`)

  const ids = (def.schema ?? []).map((f: SettingField) => f.id)
  assert.equal(new Set(ids).size, ids.length, `${type} field ids are unique`)

  const expected = EXPECTED_DEFAULTS[type]
  if (!expected) continue

  for (const [fieldId, want] of Object.entries(expected)) {
    const field = (def.schema ?? []).find((f: SettingField) => f.id === fieldId)
    assert.ok(field, `${type} declares a "${fieldId}" field`)
    // This is the guard that stops every existing store's headings changing:
    // the schema default MUST equal what the template hardcodes today.
    assert.equal(
      (field as any).default, want,
      `${type}.${fieldId} default must equal the template's current string`,
    )
  }
}

console.log('sections.test.ts: SP6 schema assertions passed')
