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
 * Placeholder copy for a newly added record. Seeded (not empty) so there is
 * always a clickable target the merchant can type over. No em dashes (merchant
 * facing). Keys match what each section template reads.
 */
export const EDITABLE_LISTS_SEEDS: Record<string, Record<string, unknown>> = {
  programs: { title: 'New program', description: 'Describe this program.' },
  campaigns: { title: 'New campaign', description: 'Describe this campaign.', image: '', goalAmount: '', presets: '', allowCustomAmount: true, minAmount: '' },
  impactStats: { value: '0', label: 'New stat' },
  heroSlides: { title: 'New slide', subtitle: '' },
}

/** A short url-safe id in the same format as newCampaignId (kept inline so this
 * module stays dependency-free and unit-testable). Campaigns are FILTERED out by
 * readCampaigns unless they carry a string id, so a seeded campaign MUST have one
 * or it never renders and later index-addressed ops desync. */
function freshCampaignId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * A new record placeholder. Returns an empty object if the list is unknown.
 */
export function seedRecord(list: string): Record<string, unknown> {
  const base = { ...(EDITABLE_LISTS_SEEDS[list] ?? {}) }
  if (list === 'campaigns') base.id = freshCampaignId()
  return base
}
