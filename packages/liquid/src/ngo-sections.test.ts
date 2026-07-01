import assert from 'node:assert/strict'
import { renderTemplate } from './index'

// mission ALWAYS renders. With settings.mission it shows the statement.
const withMission = await renderTemplate('classic/sections/mission', {
  store: { name: 'Hope Org', description: 'We help', slug: 'hope', settings: { mission: 'End hunger by 2030.' } },
})
assert.ok(withMission.includes('sf-mission'), 'mission renders its section')
assert.ok(withMission.includes('End hunger by 2030.'), 'renders the mission statement')

// Without settings.mission it falls back to store name + description (never headerless)
const noMission = await renderTemplate('classic/sections/mission', {
  store: { name: 'Hope Org', description: 'We help communities', slug: 'hope', settings: {} },
})
assert.ok(noMission.includes('sf-mission'), 'mission still renders with no settings')
assert.ok(noMission.includes('Hope Org'), 'falls back to store name')
assert.ok(noMission.includes('We help communities'), 'falls back to store description')

const noDesc = await renderTemplate('classic/sections/mission', {
  store: { name: 'Bare Org', slug: 'bare', settings: {} },
})
assert.ok(noDesc.includes('sf-mission'), 'mission renders with no description')
assert.ok(noDesc.includes('Bare Org'), 'headline still shows store name')

// ── programs ──
const programsStore = {
  name: 'Hope Org', slug: 'hope',
  settings: { programs: [
    { title: 'Clean Water', description: 'Wells for villages', image: 'https://x/water.jpg' },
    { title: 'Schooling', description: 'Books and teachers', image: '' },
  ] },
}
const programs = await renderTemplate('classic/sections/programs', { store: programsStore })
assert.ok(programs.includes('sf-programs'), 'programs renders its section')
assert.ok(programs.includes('Clean Water') && programs.includes('Schooling'), 'renders each program title')
assert.ok(programs.includes('Wells for villages'), 'renders program description')

// programs empty guard: no array -> nothing
const programsEmpty = await renderTemplate('classic/sections/programs', { store: { name: 'X', slug: 'x', settings: {} } })
assert.ok(!programsEmpty.includes('sf-programs'), 'programs renders nothing when settings.programs absent')

// programs empty guard: empty array -> nothing
const programsEmptyArr = await renderTemplate('classic/sections/programs', { store: { name: 'X', slug: 'x', settings: { programs: [] } } })
assert.ok(!programsEmptyArr.includes('sf-programs'), 'programs renders nothing when settings.programs is []')

// ── impact ──
const impactStore = {
  name: 'Hope Org', slug: 'hope',
  settings: { impactStats: [
    { label: 'People served', value: '5,000' },
    { label: 'Villages', value: '42' },
  ] },
}
const impact = await renderTemplate('classic/sections/impact', { store: impactStore })
assert.ok(impact.includes('sf-impact'), 'impact renders its section')
assert.ok(impact.includes('5,000') && impact.includes('People served'), 'renders stat value + label')
assert.ok(impact.includes('42') && impact.includes('Villages'), 'renders second stat')

// impact empty guard
const impactEmpty = await renderTemplate('classic/sections/impact', { store: { name: 'X', slug: 'x', settings: {} } })
assert.ok(!impactEmpty.includes('sf-impact'), 'impact renders nothing when settings.impactStats absent')
const impactEmptyArr = await renderTemplate('classic/sections/impact', { store: { name: 'X', slug: 'x', settings: { impactStats: [] } } })
assert.ok(!impactEmptyArr.includes('sf-impact'), 'impact renders nothing when settings.impactStats is []')

console.log('ngo-sections.test.ts: all assertions passed')
