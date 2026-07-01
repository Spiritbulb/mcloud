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

console.log('ngo-sections.test.ts: mission assertions passed')
