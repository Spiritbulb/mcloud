// Store themes: which LAYOUT a store's home page, nav and footer use.
//
// A theme is a folder of Liquid sections (packages/liquid/themes/<id>/sections).
// It is separate from a preset (lib/theme-presets.ts), which only sets colours and
// fonts. The store's choice lives in stores.settings.themeId; anything missing or
// unknown is Classic, so a store that never chose renders exactly as it always has.
//
// Pure and client-safe: the Editor and the dashboard import this, so it must not
// import @mcloud/liquid (that would ship every template to the browser). Callers
// that resolve templates pass `has` in.

import { THEME_PRESETS, activePreset } from './theme-presets'

export type StoreThemeId = 'classic' | 'classic-2' | 'studio' | 'soft'

export interface StoreThemeDef {
  id: StoreThemeId
  name: string
  /** One line in the Editor's layout picker. */
  description: string
  /** Preset applied on Update when the store still has the untouched Classic look. */
  defaultPreset: { shop: string; ngo: string }
  /** Presets that suit this layout, named under the picker. */
  suggestedPresets: string[]
  /** Offered to merchants. A theme is released once all its templates exist. */
  released: boolean
}

export const STORE_THEMES: readonly StoreThemeDef[] = [
  {
    id: 'classic-2',
    name: 'Classic 2',
    description: 'The editorial look, refreshed: more space, larger images, cleaner cards.',
    defaultPreset: { shop: 'classic', ngo: 'classic' },
    suggestedPresets: ['classic', 'craft', 'minimal'],
    released: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Bold and image-led: big headlines, edge-to-edge grids, a dark footer.',
    defaultPreset: { shop: 'bold', ngo: 'bold' },
    suggestedPresets: ['bold', 'noir', 'tech', 'minimal'],
    released: false,
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Rounded and airy: pill buttons, soft shadows, warm section colours.',
    defaultPreset: { shop: 'market', ngo: 'giving' },
    suggestedPresets: ['market', 'craft', 'giving'],
    released: false,
  },
  {
    id: 'classic',
    name: 'Classic (original)',
    description: 'The design your store has always had.',
    defaultPreset: { shop: 'classic', ngo: 'classic' },
    suggestedPresets: ['classic', 'craft', 'minimal'],
    released: true,
  },
]

/** The theme the dashboard's Update button moves a store to. */
export const UPGRADE_TARGET: StoreThemeId = 'classic-2'

export function isStoreThemeId(v: unknown): v is StoreThemeId {
  return STORE_THEMES.some((t) => t.id === v)
}

/** The store's theme from its settings object. Missing, malformed or unknown is Classic. */
export function resolveThemeId(settings: unknown): StoreThemeId {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 'classic'
  const id = (settings as Record<string, unknown>).themeId
  return isStoreThemeId(id) ? id : 'classic'
}

export function themeDef(id: StoreThemeId): StoreThemeDef {
  return STORE_THEMES.find((t) => t.id === id)!
}

/** `<theme>/sections/<file>` if that template exists, else Classic's. */
export function templateKeyFor(themeId: StoreThemeId, file: string, has: (key: string) => boolean): string {
  const own = `${themeId}/sections/${file}`
  return themeId !== 'classic' && has(own) ? own : `classic/sections/${file}`
}

/**
 * The colours to apply when a store adopts `target`, or null to keep its own.
 * Only a store still on the untouched Classic look (including no theme row at all)
 * takes the theme's default; anyone who chose colours keeps them.
 */
export function presetForAdoption(
  currentTheme: Record<string, unknown>,
  target: StoreThemeId,
  commerce: boolean,
): Record<string, string> | null {
  if (activePreset(currentTheme)?.id !== 'classic') return null
  const def = themeDef(target).defaultPreset
  const preset = THEME_PRESETS.find((p) => p.id === (commerce ? def.shop : def.ngo))
  return preset ? { ...preset.values } : null
}

/**
 * What adopting `target` writes: always `settings.themeId` (and nothing else in
 * settings), plus the theme's default colours only when presetForAdoption says the
 * store has not chosen its own.
 */
export function adoptionWrites(
  currentTheme: Record<string, unknown>,
  target: StoreThemeId,
  commerce: boolean,
): { settingsPatch: { themeId: StoreThemeId }; themeValues: Record<string, string> | null } {
  return { settingsPatch: { themeId: target }, themeValues: presetForAdoption(currentTheme, target, commerce) }
}
