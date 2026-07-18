/**
 * A setting field schema entry (minimal type for fillDefaults).
 * The actual SettingField from @mcloud/verticals has all the ui metadata;
 * we only care about id and default for seed purposes.
 */
interface SettingFieldLike {
  id: string
  default?: unknown
}

/**
 * Fill a settings object from a schema's declared defaults. Pure (no side effects,
 * no registry dependency). Safe to call from tests.
 */
export function fillDefaults(schema: readonly SettingFieldLike[] | undefined): Record<string, unknown> {
  const settings: Record<string, unknown> = {}
  for (const f of schema ?? []) {
    if (f.default !== undefined) settings[f.id] = f.default
  }
  return settings
}

/**
 * A new section starts from its schema's declared defaults (all string copy).
 * Requires registry access at runtime; test must not import this.
 */
export function seedSection(type: string): { type: string; settings: Record<string, unknown> } {
  // Import at call time to avoid breaking test runner on require
  const { SECTION_REGISTRY } = require('../../../../../../../../storefront/lib/sections')
  const def = (SECTION_REGISTRY as Record<string, { schema?: readonly SettingFieldLike[] }>)[type]
  return { type, settings: fillDefaults(def?.schema) }
}

/**
 * Placeholder copy for a newly added record. Seeded (not empty) so there is
 * always a clickable target the merchant can type over. No em dashes (merchant
 * facing). Keys match what each section template reads.
 */
export const EDITABLE_LISTS_SEEDS: Record<string, Record<string, unknown>> = {
  programs: { title: 'New program', description: 'Describe this program.' },
  campaigns: { title: 'New campaign', description: 'Describe this campaign.', goal: 0, raised: 0 },
  impactStats: { value: '0', label: 'New stat' },
  heroSlides: { title: 'New slide', subtitle: '' },
}

/**
 * A new record placeholder. Returns an empty object if the list is unknown.
 */
export function seedRecord(list: string): Record<string, unknown> {
  return { ...(EDITABLE_LISTS_SEEDS[list] ?? {}) }
}
