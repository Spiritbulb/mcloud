import assert from 'node:assert/strict'
import {
  newCampaignId,
  draftFromSettings,
  validateDraft,
  settingsFromDraft,
  type NgoDraft,
} from './content-draft'

// ── newCampaignId: unique, url-safe, never collides with existing ──
const id1 = newCampaignId([])
assert.ok(/^[a-z0-9-]+$/.test(id1), 'id is url-safe')
assert.notEqual(newCampaignId([id1]), id1, 'never reuses an existing id')

// ── draftFromSettings: tolerant of junk, always returns a usable draft ──
const empty = draftFromSettings(null)
assert.equal(empty.mission, '')
assert.deepEqual(empty.programs, [])
assert.deepEqual(empty.campaigns, [])
assert.equal(empty.contact.email, '')

const loaded = draftFromSettings({
  missionHeadline: 'Water for all',
  mission: 'We dig wells.',
  programs: [{ title: 'Wells', description: 'Dig', image: 'x.png' }],
  impactStats: [{ label: 'Wells dug', value: '42' }],
  contact: { address: 'Nairobi', email: 'a@b.c', phone: '+254' },
  campaigns: [{ id: 'water', title: 'Clean Water', goalAmount: 100000, presets: [500, 1000] }],
})
assert.equal(loaded.missionHeadline, 'Water for all')
assert.equal(loaded.programs.length, 1)
assert.equal(loaded.impactStats[0].value, '42')
assert.equal(loaded.campaigns[0].id, 'water')
assert.equal(loaded.campaigns[0].goalAmount, '100000', 'numbers become form strings')
assert.equal(loaded.campaigns[0].presets, '500, 1000', 'presets become a comma list')

// ── validateDraft: blocks the two silent-failure modes ──
const base: NgoDraft = draftFromSettings(null)

const noTitle: NgoDraft = {
  ...base,
  campaigns: [{ id: 'a', title: '  ', description: '', image: '', goalAmount: '', presets: '', allowCustomAmount: true, minAmount: '' }],
}
assert.ok(
  validateDraft(noTitle).some((e) => /title/i.test(e)),
  'a titleless campaign is rejected (readCampaigns would silently drop it)',
)

const unfundable: NgoDraft = {
  ...base,
  campaigns: [{ id: 'a', title: 'Ok', description: '', image: '', goalAmount: '', presets: '', allowCustomAmount: false, minAmount: '' }],
}
// The merchant-facing copy says "suggested amount", not the internal word
// "presets", so match the message the merchant actually reads.
assert.ok(
  validateDraft(unfundable).some((e) => /suggested amount/i.test(e) && /no one can donate/i.test(e)),
  'no custom amount + no presets is rejected (campaign could accept NO donation)',
)

const badNumber: NgoDraft = {
  ...base,
  campaigns: [{ id: 'a', title: 'Ok', description: '', image: '', goalAmount: '-5', presets: '', allowCustomAmount: true, minAmount: '' }],
}
assert.ok(validateDraft(badNumber).length > 0, 'negative goal is rejected')

const good: NgoDraft = {
  ...base,
  campaigns: [{ id: 'a', title: 'Ok', description: '', image: '', goalAmount: '1000', presets: '100, 200', allowCustomAmount: false, minAmount: '' }],
}
assert.deepEqual(validateDraft(good), [], 'a well-formed campaign passes')

// ── settingsFromDraft: emits the shape SP4's readers accept ──
const out = settingsFromDraft(good, { themeId: 'classic', heroTitle: 'keep me' })
assert.equal(out.themeId, 'classic', 'unrelated settings keys are preserved')
assert.equal(out.heroTitle, 'keep me', 'does not clobber other verticals keys')
const camps = out.campaigns as any[]
assert.equal(camps[0].id, 'a')
assert.equal(camps[0].goalAmount, 1000, 'goal is a number, not a string')
assert.deepEqual(camps[0].presets, [100, 200], 'presets are numbers')
assert.equal(camps[0].allowCustomAmount, false)
assert.ok(!('minAmount' in camps[0]), 'empty optional fields are omitted, not sent as NaN/empty')

// Blank rows are dropped rather than persisted as empty objects.
const blanks: NgoDraft = {
  ...base,
  programs: [{ title: '', description: '', image: '' }, { title: 'Real', description: 'd', image: '' }],
  impactStats: [{ label: '', value: '' }],
}
const out2 = settingsFromDraft(blanks, {})
assert.equal((out2.programs as any[]).length, 1, 'blank program dropped')
assert.equal((out2.impactStats as any[]).length, 0, 'blank stat dropped')

// Ids survive an edit round-trip — this is the orphaning guard.
const round = settingsFromDraft(draftFromSettings(out), {})
assert.equal((round.campaigns as any[])[0].id, 'a', 'campaign id survives load->save')

console.log('content-draft.test.ts OK')
