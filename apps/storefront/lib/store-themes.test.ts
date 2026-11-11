import assert from 'node:assert/strict'
import {
  STORE_THEMES, UPGRADE_TARGET, isStoreThemeId, presetForAdoption, resolveThemeId, templateKeyFor,
} from './store-themes'
import { THEME_PRESETS } from './theme-presets'

const preset = (id: string) => THEME_PRESETS.find((p) => p.id === id)!.values

// A missing or unknown theme is Classic, so every existing store renders unchanged.
assert.equal(resolveThemeId(undefined), 'classic')
assert.equal(resolveThemeId(null), 'classic')
assert.equal(resolveThemeId({}), 'classic')
assert.equal(resolveThemeId({ themeId: 'bogus' }), 'classic')
assert.equal(resolveThemeId({ themeId: 5 }), 'classic')
assert.equal(resolveThemeId({ themeId: 'soft' }), 'soft')
assert.equal(resolveThemeId('soft'), 'classic', 'a bare string is not a settings object')
assert.ok(isStoreThemeId('studio') && !isStoreThemeId('Studio') && !isStoreThemeId(undefined))

// A theme without a template falls back to Classic's, section by section.
assert.equal(templateKeyFor('studio', 'hero', () => true), 'studio/sections/hero')
assert.equal(templateKeyFor('studio', 'hero', () => false), 'classic/sections/hero')
assert.equal(templateKeyFor('classic', 'hero', () => false), 'classic/sections/hero')

// Update keeps a merchant's own colours; only an untouched Classic look moves to the theme's default.
assert.deepEqual(presetForAdoption({}, 'studio', true), preset('bold'), 'empty theme row takes the default')
assert.deepEqual(presetForAdoption(preset('classic'), 'studio', true), preset('bold'))
assert.deepEqual(presetForAdoption({}, 'soft', false), preset('giving'), 'NGO default')
assert.deepEqual(presetForAdoption({}, 'soft', true), preset('market'), 'shop default')
assert.equal(presetForAdoption({ ...preset('classic'), primary_color: '#123456' }, 'studio', true), null, 'customised colours kept')
assert.equal(presetForAdoption(preset('noir'), 'studio', true), null, 'another preset is kept')

// The registry itself.
const ids = STORE_THEMES.map((t) => t.id)
assert.deepEqual(ids, ['classic-2', 'studio', 'soft', 'classic'])
assert.equal(new Set(ids).size, ids.length)
const presetIds = new Set(THEME_PRESETS.map((p) => p.id))
for (const t of STORE_THEMES) {
  assert.ok(t.name && t.description, `${t.id} has copy`)
  assert.ok(presetIds.has(t.defaultPreset.shop) && presetIds.has(t.defaultPreset.ngo), `${t.id} defaults are real presets`)
  for (const s of t.suggestedPresets) assert.ok(presetIds.has(s), `${t.id} suggests a real preset: ${s}`)
}
assert.equal(STORE_THEMES.find((t) => t.id === 'classic')?.released, true)
assert.equal(STORE_THEMES.find((t) => t.id === 'classic')?.name, 'Classic (original)')
assert.equal(UPGRADE_TARGET, 'classic-2')

console.log('store-themes.test.ts OK')

// ── Update (adoptTheme) write plan ─────────────────────────────────────────────
import { adoptionWrites } from './store-themes'
{
  const fresh = adoptionWrites({}, 'studio', true)
  assert.deepEqual(fresh.settingsPatch, { themeId: 'studio' }, 'only themeId is written to settings')
  assert.deepEqual(fresh.themeValues, preset('bold'), 'an untouched store takes the theme default')
  const custom = adoptionWrites({ ...preset('classic'), accent_color: '#ff0000' }, 'studio', true)
  assert.deepEqual(custom.settingsPatch, { themeId: 'studio' })
  assert.equal(custom.themeValues, null, 'custom colours are never overwritten')
  const toClassic2 = adoptionWrites({}, 'classic-2', true)
  assert.deepEqual(toClassic2.themeValues, preset('classic'), 'Classic 2 keeps the Classic look')
}
console.log('store-themes.test.ts: adoption assertions passed')

// ── Released means complete ─────────────────────────────────────────────────────
// A theme is offered to merchants only when it ships every Classic file, so a released
// theme never silently falls back to Classic for a section.
import { hasTemplate } from '@mcloud/liquid'
const FILES = ['hero', 'collections-grid', 'featured-products', 'all-products', 'services', 'gallery',
  'mission', 'programs', 'impact', 'contact', 'campaigns', 'product-card']
for (const t of STORE_THEMES.filter((x) => x.released)) {
  for (const f of FILES) assert.ok(hasTemplate(`${t.id}/sections/${f}`), `${t.id} ships ${f}`)
}
assert.equal(STORE_THEMES.find((t) => t.id === UPGRADE_TARGET)?.released, true, 'the Update target is released')
console.log('store-themes.test.ts: release completeness passed')
