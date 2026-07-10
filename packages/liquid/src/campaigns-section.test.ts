import assert from 'node:assert/strict'
import { renderTemplate } from './index'

const store = { name: 'Hope', slug: 'hope', settings: {} }
const campaigns = [
  {
    id: 'water', title: 'Clean Water', description: 'Wells for villages', image: 'https://x/w.jpg',
    presets: [500, 1000], allowCustomAmount: true,
    hasGoal: true, percent: 52, raisedLabel: 'KSh 52,000.00', goalLabel: 'KSh 100,000.00',
  },
  {
    id: 'school', title: 'Schooling', description: '', image: '',
    presets: [1000], allowCustomAmount: false,
    hasGoal: false, percent: 0, raisedLabel: '', goalLabel: '',
  },
]

const html = await renderTemplate('classic/sections/campaigns', { store, campaigns })
assert.ok(html.includes('sf-campaigns'), 'renders the section')
assert.ok(html.includes('Clean Water') && html.includes('Schooling'), 'renders each campaign title')
assert.ok(html.includes('Wells for villages'), 'renders description')
// progress bar only for hasGoal
assert.ok(html.includes('KSh 52,000.00') && html.includes('KSh 100,000.00'), 'renders raised/goal for goaled campaign')
assert.ok(html.includes('width: 52%') || html.includes('width:52%'), 'progress bar width from percent')
// donate action carries data-* for the island
assert.ok(html.includes('data-campaign-id="water"'), 'donate action has campaign id')
assert.ok(html.includes('data-allow-custom="true"'), 'water allows custom')
assert.ok(html.includes('data-allow-custom="false"'), 'school disallows custom')
assert.ok(html.includes('sf-donate'), 'donate action present')

// empty guard: no campaigns -> nothing
const empty = await renderTemplate('classic/sections/campaigns', { store, campaigns: [] })
assert.ok(!empty.includes('sf-campaigns'), 'empty campaigns renders nothing')

console.log('campaigns-section.test.ts: all assertions passed')
