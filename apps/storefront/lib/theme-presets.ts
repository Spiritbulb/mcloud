// Theme presets: complete sets of store_themes values a merchant applies in one
// click from the Editor's Theme tab. A preset is data only; applying one goes
// through the same `theme-set` action and `updateStoreTheme` validation as a
// hand-picked colour, so nothing here is privileged.
//
// The active preset is DERIVED (activePreset): the one whose every value equals
// the document. Nothing records "which preset", so a merchant who tweaks one
// colour simply has a custom theme, and Classic is whatever the defaults are.

import { THEME_SCHEMA } from './theme-schema'

export interface ThemePreset {
  id: string
  name: string
  /** One line in the picker. */
  description: string
  /** The three colours the picker's swatch shows; always the preset's own. */
  swatch: { primary: string; background: string; accent: string }
  /** Every THEME_SCHEMA field, as the strings store_themes holds. */
  values: Record<string, string>
}

type Palette = {
  primary: string; secondary: string; accent: string; background: string; foreground: string; muted: string
}

function preset(
  id: string, name: string, description: string,
  light: Palette, dark: Palette,
  fonts: { heading: string; body: string }, radius: string,
): ThemePreset {
  return {
    id, name, description,
    swatch: { primary: light.primary, background: light.background, accent: light.accent },
    values: {
      primary_color: light.primary,
      secondary_color: light.secondary,
      accent_color: light.accent,
      background_color: light.background,
      foreground_color: light.foreground,
      muted_color: light.muted,
      dark_primary_color: dark.primary,
      dark_background_color: dark.background,
      dark_foreground_color: dark.foreground,
      dark_muted_color: dark.muted,
      dark_accent_color: dark.accent,
      dark_secondary_color: dark.secondary,
      heading_font: fonts.heading,
      body_font: fonts.body,
      border_radius: radius,
      font_scale: '1',
    },
  }
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  preset('classic', 'Classic', 'Editorial serif headings, warm neutrals, sharp corners.',
    { primary: '#1c2228', secondary: '#f5f0eb', accent: '#c9a96e', background: '#ffffff', foreground: '#1c2228', muted: '#f4f4f5' },
    { primary: '#e8e0d8', secondary: '#27272a', accent: '#c9a96e', background: '#0f0f10', foreground: '#f0ece6', muted: '#1e1e20' },
    { heading: 'Playfair Display', body: 'Inter' }, '0px'),

  preset('bold', 'Bold', 'Heavy type and a hot accent for streetwear and fashion.',
    { primary: '#111111', secondary: '#f2f2f2', accent: '#ff3d00', background: '#ffffff', foreground: '#111111', muted: '#ebebeb' },
    { primary: '#ffffff', secondary: '#171717', accent: '#ff6a33', background: '#0a0a0a', foreground: '#f5f5f5', muted: '#1a1a1a' },
    { heading: 'Archivo Black', body: 'Archivo' }, '0px'),

  preset('market', 'Market', 'Fresh greens and amber for groceries, farms and food.',
    { primary: '#1b5e20', secondary: '#f1f8e9', accent: '#f9a825', background: '#fffdf7', foreground: '#1f2a1f', muted: '#eef3e8' },
    { primary: '#a5d6a7', secondary: '#1e2b1e', accent: '#ffca28', background: '#0f1a10', foreground: '#e8f0e6', muted: '#1b261b' },
    { heading: 'Fraunces', body: 'Nunito' }, '8px'),

  preset('noir', 'Noir', 'Dark by default with gold details for luxury and beauty.',
    { primary: '#d4af37', secondary: '#1a1a1a', accent: '#d4af37', background: '#0b0b0b', foreground: '#f2efe9', muted: '#161616' },
    { primary: '#d4af37', secondary: '#1a1a1a', accent: '#d4af37', background: '#0b0b0b', foreground: '#f2efe9', muted: '#161616' },
    { heading: 'Cormorant Garamond', body: 'Inter' }, '0px'),

  preset('tech', 'Tech', 'Cool slate and electric blue for electronics and gadgets.',
    { primary: '#0f172a', secondary: '#f1f5f9', accent: '#2563eb', background: '#ffffff', foreground: '#0f172a', muted: '#f1f5f9' },
    { primary: '#e2e8f0', secondary: '#1e293b', accent: '#60a5fa', background: '#0b1120', foreground: '#e2e8f0', muted: '#1e293b' },
    { heading: 'Space Grotesk', body: 'IBM Plex Sans' }, '8px'),

  preset('craft', 'Craft', 'Terracotta and cream for handmade, decor and gifts.',
    { primary: '#7c3f21', secondary: '#fbf3ea', accent: '#c2410c', background: '#fffaf4', foreground: '#3b2a20', muted: '#f5ebe0' },
    { primary: '#e8c9ad', secondary: '#2a211b', accent: '#f0874f', background: '#1a1410', foreground: '#f3e9df', muted: '#2a211b' },
    { heading: 'Lora', body: 'Source Sans 3' }, '4px'),

  preset('giving', 'Giving', 'Friendly teal, rounded corners and one warm accent for NGOs.',
    { primary: '#0f766e', secondary: '#ecfdf5', accent: '#f59e0b', background: '#ffffff', foreground: '#134e4a', muted: '#f0fdfa' },
    { primary: '#5eead4', secondary: '#0f3f3c', accent: '#fbbf24', background: '#042f2e', foreground: '#ecfeff', muted: '#0f3f3c' },
    { heading: 'Nunito', body: 'Nunito' }, '16px'),

  preset('minimal', 'Minimal', 'Black on white, one typeface, nothing in the way of the product.',
    { primary: '#000000', secondary: '#fafafa', accent: '#000000', background: '#ffffff', foreground: '#000000', muted: '#f5f5f5' },
    { primary: '#ffffff', secondary: '#111111', accent: '#ffffff', background: '#000000', foreground: '#ffffff', muted: '#111111' },
    { heading: 'Inter', body: 'Inter' }, '0px'),
]

/** The field's effective value as a string: what is set, else the schema default. */
function effective(theme: Record<string, unknown>, id: string): string {
  const v = theme[id]
  if (v !== undefined && v !== null && v !== '') return String(v)
  const f = THEME_SCHEMA.find((x) => x.id === id)
  return f && 'default' in f && f.default !== undefined ? String(f.default) : ''
}

/** The preset the theme currently equals, field for field, or null if it is custom. */
export function activePreset(theme: Record<string, unknown>): ThemePreset | null {
  return THEME_PRESETS.find((p) => Object.entries(p.values).every(([id, v]) => effective(theme, id) === v)) ?? null
}
