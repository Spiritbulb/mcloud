import assert from 'node:assert/strict'
import { readCampaigns, findCampaign, validateDonationAmount, cleanDedication } from './campaigns'

// readCampaigns: tolerant of missing/malformed settings
assert.deepEqual(readCampaigns(null), [])
assert.deepEqual(readCampaigns({}), [])
assert.deepEqual(readCampaigns({ campaigns: 'nope' }), [])
const settings = { campaigns: [
  { id: 'water', title: 'Clean Water', goalAmount: 100000, presets: [500, 1000, 2500], allowCustomAmount: true },
  { id: 'school', title: 'Schooling', presets: [1000], allowCustomAmount: false },
] }
assert.equal(readCampaigns(settings).length, 2)

// findCampaign
assert.equal(findCampaign(settings, 'water')!.title, 'Clean Water')
assert.equal(findCampaign(settings, 'missing'), null)

// validateDonationAmount: allowCustomAmount true -> any amount > 0
const water = findCampaign(settings, 'water')!
assert.deepEqual(validateDonationAmount(water, 750), { ok: true, amount: 750 })
assert.equal(validateDonationAmount(water, 0).ok, false)
assert.equal(validateDonationAmount(water, -5).ok, false)
assert.equal(validateDonationAmount(water, 'abc').ok, false)
assert.equal(validateDonationAmount(water, NaN).ok, false)

// minAmount enforced when set
const waterMin = { ...water, minAmount: 500 }
assert.equal(validateDonationAmount(waterMin, 100).ok, false, 'below min rejected')
assert.equal(validateDonationAmount(waterMin, 500).ok, true, 'at min ok')

// allowCustomAmount false -> amount MUST be one of presets
const school = findCampaign(settings, 'school')!
assert.deepEqual(validateDonationAmount(school, 1000), { ok: true, amount: 1000 })
assert.equal(validateDonationAmount(school, 1500).ok, false, 'non-preset rejected when custom disallowed')

// cleanDedication: trims, caps at 280, drops empties/non-strings
assert.equal(cleanDedication('  In memory of Jane  '), 'In memory of Jane')
assert.equal(cleanDedication(''), undefined)
assert.equal(cleanDedication('   '), undefined)
assert.equal(cleanDedication(42), undefined)
assert.equal(cleanDedication('x'.repeat(400))!.length, 280, 'capped at 280')

import { augmentCampaigns } from './campaigns'

// augmentCampaigns: computes percent + formatted labels; caps percent at 100
const aug = augmentCampaigns(
  [
    { id: 'water', title: 'Clean Water', goalAmount: 100000, presets: [500], allowCustomAmount: true },
    { id: 'over', title: 'Over', goalAmount: 1000 },
    { id: 'nogoal', title: 'No Goal' },
  ],
  { water: 52000, over: 5000, nogoal: 999 },
)
const waterAug = aug.find((c) => c.id === 'water')!
assert.equal(waterAug.hasGoal, true)
assert.equal(waterAug.percent, 52, 'percent = round(raised/goal*100)')
assert.equal(waterAug.raisedLabel, 'KSh 52,000.00')
assert.equal(waterAug.goalLabel, 'KSh 100,000.00')
const overAug = aug.find((c) => c.id === 'over')!
assert.equal(overAug.percent, 100, 'percent capped at 100 when raised exceeds goal')
const nogoalAug = aug.find((c) => c.id === 'nogoal')!
assert.equal(nogoalAug.hasGoal, false, 'no goalAmount -> no progress bar')
assert.equal(nogoalAug.percent, 0)

console.log('campaigns.test.ts: all assertions passed')
