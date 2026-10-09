// The theme's settings, declared once. The Editor GENERATES its form from this,
// and updateStoreTheme whitelists against it, so the form, the validator and the
// store_themes table cannot drift apart.
//
// Each field id IS the store_themes column name.

import type { SettingField } from '@mcloud/verticals'

export const THEME_SCHEMA: readonly SettingField[] = [
  { id: 'primary_color',           type: 'color',  label: 'Primary',          default: '#1c2228' },
  { id: 'secondary_color',         type: 'color',  label: 'Secondary',        default: '#f5f0eb' },
  { id: 'accent_color',            type: 'color',  label: 'Accent',           default: '#c9a96e' },
  { id: 'background_color',        type: 'color',  label: 'Background',       default: '#ffffff' },
  { id: 'foreground_color',        type: 'color',  label: 'Text',             default: '#1c2228' },
  { id: 'muted_color',             type: 'color',  label: 'Muted',            default: '#f4f4f5' },

  { id: 'dark_primary_color',      type: 'color',  label: 'Primary (dark)',    default: '#e8e0d8' },
  { id: 'dark_background_color',   type: 'color',  label: 'Background (dark)', default: '#0f0f10' },
  { id: 'dark_foreground_color',   type: 'color',  label: 'Text (dark)',       default: '#f0ece6' },
  { id: 'dark_muted_color',        type: 'color',  label: 'Muted (dark)',      default: '#1e1e20' },

  { id: 'heading_font',            type: 'font',   label: 'Heading font',      default: 'Playfair Display' },
  { id: 'body_font',               type: 'font',   label: 'Body font',         default: 'Inter' },
  { id: 'border_radius',           type: 'select', label: 'Corners',           default: '0px',
    options: [
      { value: '0px',  label: 'Square' },
      { value: '4px',  label: 'Slightly rounded' },
      { value: '8px',  label: 'Rounded' },
      { value: '16px', label: 'Very rounded' },
    ] },
  // A real column, applied as --sf-font-scale, that no UI has ever written.
  { id: 'font_scale',              type: 'number', label: 'Text size', default: 1, min: 0.8, max: 1.4, step: 0.05 },
]

/** The store_themes columns the Editor may write. Derived, never hand-maintained. */
export const THEME_COLUMNS: readonly string[] = THEME_SCHEMA.map((f) => f.id)

const HEX = /^#[0-9a-fA-F]{3,8}$/
const FONT = /^[A-Za-z0-9 ]{1,60}$/
const LENGTH = /^\d{1,3}(px|rem|em|%)?$/
const SCALE = /^\d(\.\d+)?$/

/**
 * Is `value` acceptable for the field `id`? These values are interpolated into
 * CSS custom properties on the storefront, so an unvalidated string is stored XSS
 * against every visitor to that store. Unknown ids are rejected outright.
 *
 * A `select` accepts its own options, or any plain CSS length. The options are
 * what the Editor OFFERS; they are not the only values the column has ever held.
 * The old appearance page shipped a "Pill" radius of 999px, and a store row can
 * hold a bare `0`, so a strict option-set check would reject a value the merchant
 * already has and lock them out of saving. LENGTH is itself a strict whitelist
 * (digits plus an optional unit), so nothing is loosened: `calc(100% - 2px)`,
 * `url(...)` and every injection payload are still rejected.
 */
export function isValidThemeValue(id: string, value: string): boolean {
  const field = THEME_SCHEMA.find((f) => f.id === id)
  if (!field) return false

  switch (field.type) {
    case 'color':  return HEX.test(value)
    case 'font':   return FONT.test(value)
    case 'number': return SCALE.test(value)
    case 'select': return field.options.some((o) => o.value === value) || LENGTH.test(value)
    default:       return LENGTH.test(value)
  }
}
