// app/api/store/[slug]/donate/route.ts
// Server-authoritative donation. A donation is a checkout with ONE synthetic
// line at the donor-chosen amount, validated against the campaign (which lives
// in stores.settings.campaigns). Reuses the shared order core; the order is
// tagged { isDonation, campaignId, dedication? } with source='donation'. The
// donor then drives the SAME payment steps a purchase uses.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'
import { findCampaign, validateDonationAmount, cleanDedication } from '@/lib/campaigns'
import { createOrderWithPayment } from '@/lib/orders'
import { buildDonationLine, buildDonationMetadata } from './donate-logic'

const noStore = { 'Cache-Control': 'no-store' }

interface DonateBody {
  campaignId?: string
  amount?: unknown
  guest?: { mpesaPhone?: string; email?: string; whatsapp?: string }
  paymentMethod?: 'mpesa' | 'paypal'
  idempotencyKey?: string
  dedication?: unknown
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let body: DonateBody
  try {
    body = (await req.json()) as DonateBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: noStore })
  }

  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
  const method = body.paymentMethod === 'paypal' ? 'paypal' : 'mpesa'
  if (!campaignId) return NextResponse.json({ error: 'Missing campaign' }, { status: 400, headers: noStore })
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400, headers: noStore })

  const storeId = await getActiveStoreId(slug)
  if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

  // Load the store's settings to find the campaign (service-role, no anon).
  const admin = await createClient()
  const { data: store } = await admin.from('stores').select('settings').eq('id', storeId).single()
  const campaign = findCampaign(store?.settings, campaignId)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404, headers: noStore })

  const check = validateDonationAmount(campaign, body.amount)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400, headers: noStore })

  const dedication = cleanDedication(body.dedication)
  const result = await createOrderWithPayment({
    storeId,
    guest: body.guest ?? {},
    lines: [buildDonationLine(campaign, check.amount)],
    paymentMethod: method,
    idempotencyKey,
    source: 'donation',
    extraOrderMetadata: buildDonationMetadata(campaignId, dedication),
  })
  if (result.error !== null) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore })
  }
  return NextResponse.json(
    { orderNumber: result.orderNumber, total: result.total },
    { status: 201, headers: noStore },
  )
}
