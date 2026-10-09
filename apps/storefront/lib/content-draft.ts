// Pure draft/validation/serialization for the Content editor (SP5).
//
// The storefront's readers are deliberately tolerant, which means a malformed
// campaign fails SILENTLY:
//   - readCampaigns() drops any campaign without a string id AND title, so a
//     titleless campaign just vanishes from the live site.
//   - validateDonationAmount() rejects EVERY amount when allowCustomAmount is
//     false and presets is empty, so such a campaign can never take money.
// Both are verified behaviours of apps/storefront/lib/campaigns.ts. The editor
// must therefore block them at save time. The site will not complain.
//
// Form fields are strings (that is what inputs give us); numbers are parsed and
// optional empties are OMITTED at save, never written as NaN or ''.

export type CampaignDraft = {
  id: string
  title: string
  description: string
  image: string
  goalAmount: string
  presets: string          // comma-separated, e.g. "500, 1000, 2500"
  allowCustomAmount: boolean
  minAmount: string
}

export type ProgramDraft = { title: string; description: string; image: string }
export type StatDraft = { label: string; value: string }

export type NgoDraft = {
  missionHeadline: string
  mission: string
  programs: ProgramDraft[]
  impactStats: StatDraft[]
  contact: { address: string; email: string; phone: string }
  campaigns: CampaignDraft[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')

/** A short url-safe id, never colliding with one already in use. */
export function newCampaignId(existing: string[]): string {
  const taken = new Set(existing)
  for (;;) {
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    if (!taken.has(id)) return id
  }
}

export function draftFromSettings(settings: unknown): NgoDraft {
  const s = isRecord(settings) ? settings : {}
  const contact = isRecord(s.contact) ? s.contact : {}

  const programs = Array.isArray(s.programs) ? s.programs : []
  const stats = Array.isArray(s.impactStats) ? s.impactStats : []
  const campaigns = Array.isArray(s.campaigns) ? s.campaigns : []

  return {
    missionHeadline: str(s.missionHeadline),
    mission: str(s.mission),
    programs: programs.filter(isRecord).map((p) => ({
      title: str(p.title),
      description: str(p.description),
      image: str(p.image),
    })),
    impactStats: stats.filter(isRecord).map((t) => ({
      label: str(t.label),
      value: str(t.value),
    })),
    contact: {
      address: str(contact.address),
      email: str(contact.email),
      phone: str(contact.phone),
    },
    campaigns: campaigns.filter(isRecord).map((c) => ({
      id: str(c.id) || newCampaignId([]),
      title: str(c.title),
      description: str(c.description),
      image: str(c.image),
      goalAmount: str(c.goalAmount),
      presets: Array.isArray(c.presets) ? c.presets.join(', ') : '',
      allowCustomAmount: c.allowCustomAmount !== false,   // default true
      minAmount: str(c.minAmount),
    })),
  }
}

/** Parse a comma list of positive numbers. Returns null if any entry is bad. */
function parsePresets(raw: string): number[] | null {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  const nums = parts.map(Number)
  if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null
  return nums
}

/** Optional positive number. '' -> undefined. Bad -> null (an error). */
function parseOptionalAmount(raw: string): number | undefined | null {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function validateDraft(draft: NgoDraft): string[] {
  const errors: string[] = []

  draft.campaigns.forEach((c, i) => {
    const where = c.title.trim() || `Campaign ${i + 1}`

    // readCampaigns() drops a titleless campaign. It would vanish from the site.
    if (!c.title.trim()) {
      errors.push(`${where}: a title is required, or the campaign will not appear on your site.`)
    }

    const presets = parsePresets(c.presets)
    if (presets === null) {
      errors.push(`${where}: suggested amounts must be positive numbers, separated by commas.`)
    }

    // validateDonationAmount() would reject EVERY amount in this state.
    if (!c.allowCustomAmount && (presets === null || presets.length === 0)) {
      errors.push(
        `${where}: add at least one suggested amount, or allow custom amounts. ` +
        `Otherwise no one can donate to this campaign.`,
      )
    }

    if (parseOptionalAmount(c.goalAmount) === null) {
      errors.push(`${where}: the goal must be a positive number.`)
    }
    if (parseOptionalAmount(c.minAmount) === null) {
      errors.push(`${where}: the minimum donation must be a positive number.`)
    }
  })

  return errors
}

/**
 * Serialize a valid draft into the settings JSON the storefront reads. Merges
 * into `prev` so keys belonging to other sections (theme, hero, socials) are
 * preserved rather than clobbered. Blank rows are dropped; empty optionals are
 * omitted entirely rather than written as '' or NaN.
 *
 * Call validateDraft() first. This assumes the draft is valid.
 */
export function settingsFromDraft(
  draft: NgoDraft,
  prev: Record<string, unknown>,
): Record<string, unknown> {
  const campaigns = draft.campaigns.map((c) => {
    const out: Record<string, unknown> = {
      id: c.id,
      title: c.title.trim(),
      allowCustomAmount: c.allowCustomAmount,
    }
    if (c.description.trim()) out.description = c.description.trim()
    if (c.image.trim()) out.image = c.image.trim()

    const goal = parseOptionalAmount(c.goalAmount)
    if (typeof goal === 'number') out.goalAmount = goal

    const min = parseOptionalAmount(c.minAmount)
    if (typeof min === 'number') out.minAmount = min

    const presets = parsePresets(c.presets)
    if (presets && presets.length) out.presets = presets

    return out
  })

  return {
    ...prev,
    missionHeadline: draft.missionHeadline.trim(),
    mission: draft.mission.trim(),
    programs: draft.programs
      .filter((p) => p.title.trim() || p.description.trim())
      .map((p) => ({
        title: p.title.trim(),
        description: p.description.trim(),
        ...(p.image.trim() ? { image: p.image.trim() } : {}),
      })),
    impactStats: draft.impactStats
      .filter((s) => s.label.trim() || s.value.trim())
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
    contact: {
      address: draft.contact.address.trim(),
      email: draft.contact.email.trim(),
      phone: draft.contact.phone.trim(),
    },
    campaigns,
  }
}
