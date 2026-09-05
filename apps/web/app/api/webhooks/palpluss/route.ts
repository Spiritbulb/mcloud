// apps/web/app/api/webhooks/palpluss/route.ts
// Receives async STK Push results from PalPluss. Per docs.palpluss.com/guides/webhooks:
// return 2xx fast, handle duplicate deliveries safely (same callback can arrive
// more than once on retry). No session here — PalPluss calls this, not a user.
import { NextResponse, type NextRequest } from 'next/server'
import { adjustWallet, getTopupByPalplussTransactionId, resolveTopup } from '@/lib/wallet'
import type { PalplussWebhookPayload } from '@/lib/palpluss'

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as PalplussWebhookPayload | null

  // Ack fast on anything we can't use — PalPluss retries on non-2xx, and
  // retrying an unparseable payload won't help.
  if (!payload?.transaction?.id) {
    return NextResponse.json({ ok: true })
  }

  const { transaction, event_type } = payload

  const topup = await getTopupByPalplussTransactionId(transaction.id)
  if (!topup) {
    // Unknown transaction — acknowledge so PalPluss stops retrying.
    return NextResponse.json({ ok: true })
  }

  // Idempotency guard: a resolved topup is never re-processed.
  if (topup.status !== 'pending') {
    return NextResponse.json({ ok: true })
  }

  if (event_type === 'transaction.success') {
    // Credit what PalPluss confirmed was actually paid, not what we requested.
    await adjustWallet({
      orgId: topup.org_id,
      amountCents: Math.round(transaction.amount * 100),
      kind: 'topup',
      reference: transaction.mpesa_receipt ?? transaction.id,
      metadata: { palplussTransactionId: transaction.id, topupId: topup.id },
    })

    await resolveTopup(topup.id, 'success', {
      mpesaReceipt: transaction.mpesa_receipt,
      resultDesc: transaction.result_desc,
    })
  } else {
    const status = event_type === 'transaction.cancelled' ? 'cancelled' : event_type === 'transaction.expired' ? 'expired' : 'failed'
    await resolveTopup(topup.id, status, { resultDesc: transaction.result_desc })
  }

  return NextResponse.json({ ok: true })
}