import assert from 'node:assert/strict'
import { heroSlides, authoredSlides } from './hero'

const base = { storeName: 'KFS', storeDescription: 'A feminist organisation', commerce: false, hasCampaign: false }

// ── The legacy shape still renders ────────────────────────────────────────────
// Every existing store is on the flat keys. If this breaks, every hero breaks.

const legacy = heroSlides({
  ...base,
  settings: { heroTitle: 'Our Voices', heroSubtitle: 'Our Stories', heroImage: 'https://x/h.jpg' },
})
assert.equal(legacy.length, 1, 'a legacy hero is one slide')
assert.equal(legacy[0].title, 'Our Voices')
assert.equal(legacy[0].subtitle, 'Our Stories')
assert.equal(legacy[0].image, 'https://x/h.jpg')

// The precedence the template had, preserved exactly:
//   heroTitle > missionHeadline > store.name
const fallsBackToMission = heroSlides({
  ...base,
  settings: { missionHeadline: 'From the mission', mission: 'The statement' },
})
assert.equal(fallsBackToMission[0].title, 'From the mission', 'missionHeadline is the second choice')
assert.equal(fallsBackToMission[0].subtitle, 'The statement')

const fallsBackToStore = heroSlides({ ...base, settings: {} })
assert.equal(fallsBackToStore[0].title, 'KFS', 'and the store name is the last resort')
assert.equal(fallsBackToStore[0].subtitle, 'A feminist organisation')

// heroTitle WINS over missionHeadline, as it did before.
const explicit = heroSlides({
  ...base,
  settings: { heroTitle: 'Explicit', missionHeadline: 'Mission' },
})
assert.equal(explicit[0].title, 'Explicit', 'heroTitle beats missionHeadline')

// ── The modern shape ──────────────────────────────────────────────────────────
const modern = heroSlides({
  ...base,
  settings: {
    heroSlides: [{ title: 'One', image: 'a.jpg' }, { title: 'Two', image: 'b.jpg' }],
    // Present, and must be IGNORED: heroSlides is the whole truth when it exists.
    heroTitle: 'STALE',
  },
})
assert.equal(modern.length, 2, 'a carousel keeps all its slides')
assert.equal(modern[0].title, 'One')
assert.equal(modern[1].title, 'Two')
assert.ok(!modern.some((s) => s.title === 'STALE'), 'the legacy keys are ignored once heroSlides exists')

// ── The CTA defaults still depend on the VERTICAL, not the data ───────────────
const shop = heroSlides({ ...base, settings: {}, commerce: true })
assert.equal(shop[0].accent, 'New Arrivals', 'a shop gets retail copy')
assert.equal(shop[0].buttonText, 'Shop now')

const ngoNoCampaign = heroSlides({ ...base, settings: {}, commerce: false, hasCampaign: false })
assert.equal(ngoNoCampaign[0].accent, '', 'an NGO gets no retail badge')
assert.equal(ngoNoCampaign[0].buttonText, 'Get in touch', 'and is not promised a donate flow it lacks')

const ngoGiving = heroSlides({ ...base, settings: {}, commerce: false, hasCampaign: true })
assert.equal(ngoGiving[0].buttonText, 'Donate', 'an NGO WITH a campaign gets Donate')

// ── authoredSlides: the trap, again ───────────────────────────────────────────
//
// What RENDERS has defaults filled in ("Shop now"). What is SAVED must not: writing
// the default back as though the merchant typed it would freeze it into the record
// and kill the fallback, exactly as with a defaulted heading.

const rendered = heroSlides({ ...base, settings: {}, commerce: true })
const authored = authoredSlides({})
assert.equal(rendered[0].buttonText, 'Shop now', 'the RENDERED slide shows the default')
assert.equal(authored[0].buttonText, '', 'the AUTHORED slide does NOT: the default is not the merchant\'s text')
assert.equal(authored[0].title, '', 'nor is the store name')

// Authored values survive.
const authoredReal = authoredSlides({ heroTitle: 'Mine', heroImage: 'i.jpg' })
assert.equal(authoredReal[0].title, 'Mine')
assert.equal(authoredReal[0].image, 'i.jpg')

// ── Junk in the array does not crash the hero ────────────────────────────────
const junk = heroSlides({ ...base, settings: { heroSlides: [null, 'nope', { title: 'Real' }] } })
assert.equal(junk.length, 1, 'non-object slides are dropped, not rendered')
assert.equal(junk[0].title, 'Real')

console.log('hero.test.ts: all assertions passed')
