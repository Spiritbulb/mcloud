// Pure request-shaping for /donate: turn a validated campaign + amount into the
// order line and donation metadata. Kept separate from the route so it's
// unit-testable without a request context.
import type { OrderLineInput } from '@/lib/orders'
import type { Campaign } from '@/lib/campaigns'

export function buildDonationLine(campaign: Campaign, amount: number): OrderLineInput {
  return {
    product_id: null,
    variant_id: null,
    quantity: 1,
    price: amount,
    title: campaign.title,
    variant_title: null,
    image_url: campaign.image ?? null,
  }
}

export function buildDonationMetadata(
  campaignId: string,
  dedication: string | undefined,
): Record<string, unknown> {
  return {
    isDonation: true,
    campaignId,
    ...(dedication ? { dedication } : {}),
  }
}
