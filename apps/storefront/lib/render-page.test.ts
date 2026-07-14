import assert from 'node:assert/strict'
import { renderPage } from './render-page'

const ctx = {
  store: { id: 's', name: 'Test Store', slug: 's', currency: 'KES', settings: {} },
  products: [{ id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null }],
  collections: [{ id: 'c1', name: 'Coll', slug: 'coll', image_url: null, description: null }],
  featuredProducts: [{ id: 'p1', name: 'Alpha', slug: 'alpha', price: 100, images: [], compare_at_price: null }],
  campaigns: [],
}

// renders listed sections in order, wrapped in min-h-screen
const html = await renderPage([{ type: 'hero' }, { type: 'all-products' }], ctx)
assert.ok(html.startsWith('<div class="min-h-screen">'), 'wraps in min-h-screen')
assert.ok(html.trimEnd().endsWith('</div>'), 'closes wrapper')
assert.ok(html.includes('sf-hero'), 'renders hero')
assert.ok(html.includes('Alpha'), 'renders all-products with product')
assert.ok(html.indexOf('sf-hero') < html.indexOf('id="products"'), 'sections in order')

// unknown type is skipped, does not throw, other sections still render
const html2 = await renderPage([{ type: 'bogus' }, { type: 'hero' }], ctx)
assert.ok(html2.includes('sf-hero'), 'skips unknown, renders known')
assert.ok(!html2.includes('bogus'), 'unknown type produces no output')

// empty sections -> just the wrapper
const empty = await renderPage([], ctx)
assert.ok(empty.includes('min-h-screen'), 'empty page still has wrapper')

console.log('render-page.test.ts: all assertions passed')

// ── SP6: section config arrives as `section`, and does NOT clobber `settings` ──
//
// Five templates open with `assign settings = store.settings`, which shadows any
// section-level `settings`. Verified by running this pipeline: a section-level
// `settings.heading` in programs.liquid is INVISIBLE. So section config must
// arrive under its own name, and the store's settings must keep working.

const ctxSp6: any = {
  store: {
    slug: 's', name: 'N',
    settings: { programs: [{ title: 'FROM_STORE_SETTINGS', description: 'd' }] },
  },
  products: [], collections: [], featuredProducts: [], campaigns: [],
}

// programs.liquid SHADOWS `settings`. Its heading must still be overridable.
const overridden = await renderPage(
  [{ type: 'programs', settings: { heading: 'OUR_PROGRAMMES', eyebrow: 'WHAT_WE_DO' } }],
  ctxSp6,
)
assert.ok(overridden.includes('OUR_PROGRAMMES'), 'section heading reaches a shadowing template')
assert.ok(overridden.includes('WHAT_WE_DO'), 'section eyebrow reaches a shadowing template')
assert.ok(!overridden.includes('What We Do'), 'the default is replaced, not appended')
assert.ok(
  overridden.includes('FROM_STORE_SETTINGS'),
  'the store settings still resolve — `section` must not break `settings`',
)

// No section config: the template renders exactly what it does today.
const bare = await renderPage([{ type: 'programs' }], ctxSp6)
assert.ok(bare.includes('What We Do'), 'falls back to the hardcoded default')
assert.ok(bare.includes('FROM_STORE_SETTINGS'), 'store settings unaffected')

// campaigns.liquid does NOT shadow settings — it must work the same way.
const camp = await renderPage(
  [{ type: 'campaigns', settings: { heading: 'GIVE' } }],
  { ...ctxSp6, campaigns: [{ id: 'c', title: 'T', hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '' }] },
)
assert.ok(camp.includes('GIVE'), 'works in a non-shadowing template too')
assert.ok(!camp.includes('Support a Cause'), 'default replaced')

// An empty string means "use the default", never "render an empty heading".
const blank = await renderPage([{ type: 'campaigns', settings: { heading: '' } }], {
  ...ctxSp6, campaigns: [{ id: 'c', title: 'T', hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '' }],
})
assert.ok(blank.includes('Support a Cause'), 'blank falls back to the default')

console.log('render-page.test.ts: SP6 section-namespace assertions passed')

// ── Editor anchors: every section is addressable by its INDEX ──────────────────
//
// The Editor's rail addresses a section as sections[i], and the preview reports
// clicks as that same i. If the two ever disagree, the merchant edits one section
// and a different one changes. So the rendered index must be the index in the
// STORED list.

const anchored = await renderPage([{ type: 'hero' }, { type: 'all-products' }], ctx)
assert.ok(anchored.includes('data-mcloud-section="0"'), 'first section is anchored at 0')
assert.ok(anchored.includes('data-mcloud-section="1"'), 'second section is anchored at 1')

// THE DRIFT BUG: a skipped section must still CONSUME its index. If it did not,
// `hero` here would render as 0 while the rail calls it 1, and clicking the hero
// in the preview would open a section that is not the hero.
const drift = await renderPage([{ type: 'bogus' }, { type: 'hero' }], ctx)
assert.ok(
  drift.includes('data-mcloud-section="1"'),
  'a skipped section still consumes its index — hero is 1, as the rail sees it',
)
assert.ok(!drift.includes('data-mcloud-section="0"'), 'the skipped section emits no anchor')

// The anchor wraps the section, so a click anywhere inside it resolves via
// closest('[data-mcloud-section]').
assert.ok(
  /<div data-mcloud-section="0">\s*<section/.test(anchored),
  'the anchor wraps the section element',
)

console.log('render-page.test.ts: editor anchor assertions passed')

// ── The hero asks the VERTICAL, not the data ──────────────────────────────────
//
// It used to infer "is this a giving site?" from `campaigns.size > 0`. That is a
// different question, and it got the answer wrong for the commonest NGO state:
// signed up, no campaign yet. Kisumu Feminists Society rendered "New Arrivals"
// and a "Shop now" button scrolling to a #products section it does not have.
//
// So: store.commerce decides the COPY, campaigns decide the CTA's BEHAVIOUR.
// All four combinations are pinned, because collapsing them is what broke it.

const heroCtx = (commerce: boolean, campaigns: any[] = []) => ({
  store: { id: 's', name: 'N', slug: 's', currency: 'KES', settings: {}, commerce },
  products: [], collections: [], featuredProducts: [], campaigns,
})
const CAMPAIGN = [{ id: 'c', title: 'T', hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '' }]

// 1. NGO, no campaign yet — THE BUG. No retail copy, no dead scroll target.
const ngoBare = await renderPage([{ type: 'hero' }], heroCtx(false))
assert.ok(!ngoBare.includes('New Arrivals'), 'NGO with no campaign is not sold "New Arrivals"')
assert.ok(!ngoBare.includes('Shop now'), 'NGO with no campaign is not told to "Shop now"')
assert.ok(!ngoBare.includes('#products'), 'no dead scroll to a #products section it lacks')
assert.ok(ngoBare.includes('Get in touch'), 'it asks for contact instead')
assert.ok(!ngoBare.includes('sf-donate'), 'and does not offer a donate flow it cannot fulfil')

// 2. NGO with a campaign — the donate flow.
const ngoGiving = await renderPage([{ type: 'hero' }], heroCtx(false, CAMPAIGN))
assert.ok(ngoGiving.includes('Donate'), 'NGO with a campaign gets Donate')
assert.ok(ngoGiving.includes('sf-donate'), 'wired to the donate flow')
assert.ok(!ngoGiving.includes('New Arrivals'), 'still no retail copy')

// 3. Shop — unregressed.
const shop = await renderPage([{ type: 'hero' }], heroCtx(true))
assert.ok(shop.includes('New Arrivals'), 'a shop still gets New Arrivals')
assert.ok(shop.includes('Shop now'), 'a shop still gets Shop now')
assert.ok(shop.includes('#products'), 'a shop still scrolls to its products')

// 4. A shop is a shop even if some campaign data exists: the VERTICAL decides
//    the copy. (Guards the inverse of the original bug.)
const shopWithData = await renderPage([{ type: 'hero' }], heroCtx(true, CAMPAIGN))
assert.ok(shopWithData.includes('New Arrivals'), 'commerce copy is not overridden by campaign data')

console.log('render-page.test.ts: hero vertical-gating assertions passed')

// ── Click-to-edit: the rendered value and the STORED value are different things ─
//
// Every heading renders through `| default: 'Support a Cause'`, so an unset field
// still SHOWS text. If the editor read the heading back out of the DOM, clicking
// into it and clicking away would save the default as though the merchant had
// typed it: the default gets baked in, the fallback dies, and there is no undo.
//
// So each editable node carries data-mcloud-stored — the value as STORED, empty
// when unset — and the editor diffs against that, never against textContent.

const campaignCtx = {
  ...ctxSp6,
  campaigns: [{ id: 'c', title: 'T', hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '' }],
}

// UNSET: shows the default, but reports itself as empty.
const unset = await renderPage([{ type: 'campaigns' }], campaignCtx)
assert.ok(unset.includes('Support a Cause'), 'renders the default text')
assert.ok(
  unset.includes('data-mcloud-stored=""'),
  'THE TRAP: an unset field must report EMPTY, not the default it happens to display',
)
assert.ok(unset.includes('data-mcloud-field="heading"'), 'the heading is marked editable')
assert.ok(unset.includes('data-mcloud-field="eyebrow"'), 'the eyebrow is marked editable')

// SET: reports what is actually stored. Note the eyebrow here is still unset, so
// it must STILL report empty: the two fields are tracked independently, and
// setting one must not make the other look set.
const set = await renderPage([{ type: 'campaigns', settings: { heading: 'Give Today' } }], campaignCtx)
assert.ok(
  set.includes('data-mcloud-field="heading" data-mcloud-stored="Give Today"'),
  'a set field reports its stored value',
)
assert.ok(
  set.includes('data-mcloud-field="eyebrow" data-mcloud-stored=""'),
  'a sibling field that is still unset keeps reporting empty',
)

// The stored value is ESCAPED into the attribute: a merchant typing a quote must
// not be able to break out of it and inject markup into their own page.
const nasty = await renderPage(
  [{ type: 'campaigns', settings: { heading: '"><script>alert(1)</script>' } }],
  campaignCtx,
)
assert.ok(!nasty.includes('<script>'), 'a quote in the copy cannot break out of the attribute')
assert.ok(nasty.includes('&lt;script&gt;'), 'it is escaped instead')

// Mission declares only an eyebrow (its headline comes from store settings), so it
// must be marked for that and nothing else.
const mission = await renderPage([{ type: 'mission' }], {
  ...ctxSp6,
  store: { ...ctxSp6.store, settings: { ...ctxSp6.store.settings, mission: 'M', missionHeadline: 'H' } },
})
assert.ok(mission.includes('data-mcloud-field="eyebrow"'), 'mission marks its eyebrow')
assert.ok(!mission.includes('data-mcloud-field="heading"'), 'and does not claim a heading it does not own')

console.log('render-page.test.ts: click-to-edit anchor assertions passed')

// ── Store settings + repeated records are editable too ─────────────────────────
//
// Copy lives in three places, and the drawer must not be the only way to reach any
// of them. The hero's title is stores.settings.heroTitle; a programme's title is
// stores.settings.programs[i].title. Neither is section config, so both need their
// own channel — and both have the same default-trap.

const ngoStore = (settings: Record<string, unknown>, editing = false) => ({
  store: { id: 's', name: 'KFS', slug: 's', currency: 'KES', settings, commerce: false, editing },
  products: [], collections: [], featuredProducts: [],
  campaigns: [{ id: 'c', title: 'Support Us', description: 'd', hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '' }],
})

// The hero's title is a STORE SETTING, not section config.
const heroSet = await renderPage([{ type: 'hero' }], ngoStore({ heroTitle: 'Our Voices' }))
assert.ok(
  heroSet.includes('data-mcloud-setting="heroTitle" data-mcloud-stored="Our Voices"'),
  'the hero title is editable and reports its stored value',
)

// THE TRAP AGAIN: with no heroTitle the hero falls back to store.name, so it
// DISPLAYS "KFS" while the setting is empty. It must report empty.
const heroBare = await renderPage([{ type: 'hero' }], ngoStore({}))
assert.ok(heroBare.includes('KFS'), 'falls back to the store name')
assert.ok(
  heroBare.includes('data-mcloud-setting="heroTitle" data-mcloud-stored=""'),
  'but reports the SETTING as empty, so clicking it cannot freeze the fallback in',
)

// A repeated record carries its list AND its index: an edit that cannot say which
// record it belongs to would overwrite the wrong programme.
const programs = await renderPage([{ type: 'programs' }], ngoStore({
  programs: [{ title: 'Advocacy', description: 'a' }, { title: 'Care', description: 'b' }],
}))
assert.ok(
  programs.includes('data-mcloud-list="programs" data-mcloud-index="0" data-mcloud-key="title" data-mcloud-stored="Advocacy"'),
  'programme 0 is addressable',
)
assert.ok(
  programs.includes('data-mcloud-list="programs" data-mcloud-index="1" data-mcloud-key="title" data-mcloud-stored="Care"'),
  'programme 1 is addressable, and distinct from 0',
)

// ── store.editing must NEVER leak to a visitor ────────────────────────────────
//
// The editor renders empty fields so they can be clicked and filled. A visitor must
// see none of that: an empty subtitle stays absent from their page entirely.
const visitor = await renderPage([{ type: 'hero' }], ngoStore({ heroTitle: 'T' }, false))
assert.ok(!visitor.includes('heroSubtitle'), 'a visitor gets no empty subtitle element')

const editor = await renderPage([{ type: 'hero' }], ngoStore({ heroTitle: 'T' }, true))
assert.ok(
  editor.includes('data-mcloud-setting="heroSubtitle"'),
  'the editor DOES get the empty subtitle, so there is something to click',
)

console.log('render-page.test.ts: store-setting + repeated-record assertions passed')
