import assert from 'node:assert/strict'
import { THEME_SCHEMA, THEME_COLUMNS, isValidThemeValue } from './theme-schema'

// Every field maps to a real store_themes column. This is what stops the schema
// and the table drifting apart.
const REAL_COLUMNS = new Set([
  'theme_id',
  'primary_color', 'secondary_color', 'accent_color',
  'background_color', 'foreground_color', 'muted_color',
  'dark_primary_color', 'dark_background_color', 'dark_foreground_color', 'dark_muted_color',
  'heading_font', 'body_font', 'border_radius', 'font_scale',
])
for (const f of THEME_SCHEMA) {
  assert.ok(REAL_COLUMNS.has(f.id), `${f.id} is a real store_themes column`)
}
const ids = THEME_SCHEMA.map((f) => f.id)
assert.equal(new Set(ids).size, ids.length, 'field ids are unique')
assert.deepEqual([...THEME_COLUMNS].sort(), ids.sort(), 'THEME_COLUMNS matches the schema')

// Validation is the XSS boundary: these values are interpolated into CSS custom
// properties, so anything that is not a plain colour/font/length is rejected.
assert.ok(isValidThemeValue('primary_color', '#EFC940'))
assert.ok(isValidThemeValue('primary_color', '#fff'))
assert.ok(!isValidThemeValue('primary_color', 'red'), 'named colours rejected')
assert.ok(!isValidThemeValue('primary_color', '#fff;}body{display:none'), 'CSS injection rejected')
assert.ok(!isValidThemeValue('primary_color', 'url(javascript:alert(1))'), 'url() rejected')

assert.ok(isValidThemeValue('heading_font', 'Quicksand'))
assert.ok(isValidThemeValue('heading_font', 'Playfair Display'))
assert.ok(!isValidThemeValue('heading_font', 'Evil"/><script>'), 'markup rejected')
assert.ok(!isValidThemeValue('heading_font', 'Foo;color:red'), 'punctuation rejected')

assert.ok(isValidThemeValue('border_radius', '8px'))
assert.ok(isValidThemeValue('border_radius', '0'))
assert.ok(!isValidThemeValue('border_radius', 'calc(100% - 2px)'), 'expressions rejected')

assert.ok(isValidThemeValue('font_scale', '1'))
assert.ok(isValidThemeValue('font_scale', '1.2'))
assert.ok(!isValidThemeValue('font_scale', '1;evil'), 'rejected')

assert.ok(!isValidThemeValue('not_a_field', 'x'), 'unknown field rejected outright')

console.log('theme-schema.test.ts OK')
