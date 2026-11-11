import assert from 'node:assert/strict'
import { THEME_PRESETS, activePreset } from './theme-presets'
import { THEME_SCHEMA, isValidThemeValue } from './theme-schema'

// A preset is a COMPLETE theme: applying one must leave no field at a stale value
// from the previous look, so every preset sets every schema field, and nothing else.
const fieldIds = THEME_SCHEMA.map((f) => f.id).sort()
assert.ok(THEME_PRESETS.length >= 6, 'enough presets to be a real choice')
for (const p of THEME_PRESETS) {
  assert.deepEqual(Object.keys(p.values).sort(), fieldIds, `${p.id} sets every theme field and only those`)
  for (const [id, value] of Object.entries(p.values)) {
    assert.ok(isValidThemeValue(id, value), `${p.id}.${id} = ${value} passes the CSS whitelist`)
  }
  assert.ok(p.name && p.description, `${p.id} has a name and description`)
  // The swatch shows real preset colours, never a made-up palette.
  assert.equal(p.values.primary_color, p.swatch.primary, `${p.id} swatch primary is the preset primary`)
}
const ids = THEME_PRESETS.map((p) => p.id)
assert.equal(new Set(ids).size, ids.length, 'preset ids are unique')

// Classic IS the current defaults: an untouched store is on the Classic preset.
const classic = THEME_PRESETS.find((p) => p.id === 'classic')
assert.ok(classic, 'a classic preset exists')
for (const f of THEME_SCHEMA) {
  const dflt = 'default' in f ? f.default : undefined
  assert.equal(classic.values[f.id], String(dflt), `classic.${f.id} equals the schema default`)
}

// The active preset is DERIVED from the document, never stored.
assert.equal(activePreset({})?.id, 'classic', 'an empty theme row (all defaults) is Classic')
assert.equal(activePreset(classic.values)?.id, 'classic')
const noir = THEME_PRESETS.find((p) => p.id === 'noir')!
assert.equal(activePreset(noir.values)?.id, 'noir')
assert.equal(activePreset({ ...noir.values, primary_color: '#123456' }), null, 'one changed value means no preset is active')
// A number column comes back from the DB as a string ("1"), a form may hold 1.
assert.equal(activePreset({ ...classic.values, font_scale: 1 })?.id, 'classic', 'numeric values compare as strings')

console.log('theme-presets.test.ts OK')
