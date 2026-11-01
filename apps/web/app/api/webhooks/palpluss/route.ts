// @route-kind: webhook — PalPluss webhook; status and amount re-fetched from PalPluss before crediting
// apps/web/app/api/webhooks/palpluss/route.ts
// Receives async STK Push results from PalPluss. Per docs.palpluss.com/guides/webhooks:
// return 2xx fast, handle duplicate deliveries safely (same callback can arrive
// more than once on retry). No session here — PalPluss calls this, not a user.
import { NextResponse, after, type NextRequest } from 'next/server'
import { adjustWallet, getTopupByPalplussTransactionId, resolveTopup } from '@/lib/wallet'
import { getTransaction, type PalplussWebhookPayload } from '@/lib/palpluss'
import { notifyWalletTopup } from '@/lib/billing-notify'

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as PalplussWebhookPayload | null

  // Ack fast on anything we can't use — PalPluss retries on non-2xx, and
  // retrying an unparseable payload won't help.
  if (!payload?.transaction?.id) {
    return NextResponse.json({ ok: true })
  }

  const { transaction } = payload

  const topup = await getTopupByPalplussTransactionId(transaction.id)
  if (!topup) {
    // Unknown transaction — acknowledge so PalPluss stops retrying.
    return NextResponse.json({ ok: true })
  }

  // Idempotency guard: a resolved topup is never re-processed.
  if (topup.status !== 'pending') {
    return NextResponse.json({ ok: true })
  }

  // The request is unauthenticated, so the body is only a hint about WHICH transaction
  // changed. Status and amount come from PalPluss, never from the payload.
  let confirmed
  try {
    confirmed = await getTransaction(transaction.id)
  } catch (e) {
    console.error('[palpluss webhook] verify failed', e)
    return NextResponse.json({ error: 'retry' }, { status: 500 }) // PalPluss will resend
  }
  if (confirmed.status === 'PENDING') return NextResponse.json({ ok: true })

  if (confirmed.status === 'SUCCESS') {
    // Credit what PalPluss confirmed was actually paid, not what we requested.
    const amountCents = Math.round(confirmed.amount * 100)
    const balanceCents = await adjustWallet({
      orgId: topup.org_id,
      amountCents,
      kind: 'topup',
      reference: transaction.mpesa_receipt ?? transaction.id,
      metadata: { palplussTransactionId: transaction.id, topupId: topup.id },
    })

    await resolveTopup(topup.id, 'success', {
      mpesaReceipt: transaction.mpesa_receipt,
      resultDesc: transaction.result_desc,
    })

    after(() =>
      notifyWalletTopup({
        topupId: topup.id,
        orgId: topup.org_id,
        requestedBy: topup.requested_by,
        amountCents,
        balanceCents,
        receipt: transaction.mpesa_receipt,
      }),
    )
  } else {
    const status = confirmed.status === 'CANCELLED' ? 'cancelled' : confirmed.status === 'EXPIRED' ? 'expired' : 'failed'
    await resolveTopup(topup.id, status, { resultDesc: transaction.result_desc })
  }

  return NextResponse.json({ ok: true })
}