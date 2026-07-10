// lib/campaigns.ts
// Campaign shape + donation-amount validation. Campaigns live in
// stores.settings.campaigns (JSON) — no table. Pure (no DB/Next) so it's
// unit-testable and reused by /donate and the progress reader.

export interface Campaign {
  id: string
  title: string
  description?: string
  image?: string
  goalAmount?: number
  presets?: number[]
  allowCustomAmount?: boolean
  minAmount?: number
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Read the campaigns array out of a store's settings JSON. Tolerant of junk. */
export function readCampaigns(settings: unknown): Campaign[] {
  if (!isRecord(settings)) return []
  const raw = settings.campaigns
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (c): c is Campaign => isRecord(c) && typeof c.id === 'string' && typeof c.title === 'string',
  )
}

export function findCampaign(settings: unknown, campaignId: string): Campaign | null {
  return readCampaigns(settings).find((c) => c.id === campaignId) ?? null
}

export type AmountCheck = { ok: true; amount: number } | { ok: false; error: string }

/** Validate a donor-supplied amount against a campaign's rules. */
export function validateDonationAmount(campaign: Campaign, rawAmount: unknown): AmountCheck {
  const amount = Number(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter a valid donation amount.' }
  }
  if (typeof campaign.minAmount === 'number' && amount < campaign.minAmount) {
    return { ok: false, error: `Minimum donation is ${campaign.minAmount}.` }
  }
  if (campaign.allowCustomAmount === false) {
    const presets = Array.isArray(campaign.presets) ? campaign.presets : []
    if (!presets.includes(amount)) {
      return { ok: false, error: 'Please choose one of the suggested amounts.' }
    }
  }
  return { ok: true, amount }
}

/** Trim + cap a dedication note; undefined when empty/non-string. */
export function cleanDedication(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, 280)
}
