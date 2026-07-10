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

import { formatKES } from './currency'
import { createClient } from '@mcloud/db/server'

export interface AugmentedCampaign {
  id: string
  title: string
  description?: string
  image?: string
  presets?: number[]
  allowCustomAmount?: boolean
  hasGoal: boolean
  percent: number
  raisedLabel: string
  goalLabel: string
}

/** Attach progress display fields to campaigns from a raised-by-id map. Pure. */
export function augmentCampaigns(
  campaigns: Campaign[],
  raisedById: Record<string, number>,
): AugmentedCampaign[] {
  return campaigns.map((c) => {
    const raised = raisedById[c.id] ?? 0
    const goal = typeof c.goalAmount === 'number' && c.goalAmount > 0 ? c.goalAmount : 0
    const hasGoal = goal > 0
    const percent = hasGoal ? Math.min(100, Math.round((raised / goal) * 100)) : 0
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      image: c.image,
      presets: c.presets,
      allowCustomAmount: c.allowCustomAmount,
      hasGoal,
      percent,
      raisedLabel: hasGoal ? formatKES(raised) : '',
      goalLabel: hasGoal ? formatKES(goal) : '',
    }
  })
}

/**
 * Load a store's campaigns augmented with each one's raised total. Sums the
 * `total` of orders tagged with the campaignId whose payment completed. A read
 * failure defaults raised to 0 (the home render must never break on reporting).
 */
export async function loadCampaignsWithProgress(
  storeId: string,
  settings: unknown,
): Promise<AugmentedCampaign[]> {
  const campaigns = readCampaigns(settings)
  if (campaigns.length === 0) return []

  const raisedById: Record<string, number> = {}
  try {
    const admin = await createClient()
    const { data } = await admin
      .from('orders')
      .select('total, metadata')
      .eq('store_id', storeId)
      .eq('metadata->>isDonation', 'true')
      .eq('metadata->>payment_status', 'completed')
    for (const row of data ?? []) {
      const md = (row.metadata ?? {}) as Record<string, unknown>
      const id = typeof md.campaignId === 'string' ? md.campaignId : null
      if (id) raisedById[id] = (raisedById[id] ?? 0) + Number(row.total ?? 0)
    }
  } catch (err) {
    console.error('[storefront] campaign progress read failed (defaulting to 0):', err)
  }
  return augmentCampaigns(campaigns, raisedById)
}
