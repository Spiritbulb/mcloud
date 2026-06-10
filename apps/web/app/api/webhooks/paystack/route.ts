// app/api/webhooks/paystack/route.ts
import { createClient } from '@mcloud/db/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function verifySignature(payload: string, signature: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret || !signature) return false

  const expected = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''

  if (!verifySignature(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(payload)
  const supabase = await createClient()

  // Paystack event names include charge.success, subscription.create,
  // subscription.disable, invoice.update, invoice.payment_failed
  const eventType = event.event
  const data = event.data ?? {}

  const reference =
    data.reference ??
    data?.metadata?.reference ??
    data?.invoice?.transaction?.reference ??
    null

  if (!reference) {
    return NextResponse.json({ ok: true })
  }

  const { data: sub } = await supabase
    .from('store_subscriptions')
    .select('id, store_id, status, plan')
    .eq('paystack_reference', reference)
    .single()

  if (!sub) {
    return NextResponse.json({ ok: true })
  }

  const now = new Date()
  const periodStart = new Date(now)
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  if (eventType === 'charge.success') {
    await Promise.all([
      supabase
        .from('store_subscriptions')
        .update({
          status: 'active',
          provider: 'paystack',
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          paystack_subscription_code: data.subscription?.subscription_code ?? null,
          paystack_email_token: data.subscription?.email_token ?? null,
          paystack_customer_code: data.customer?.customer_code ?? null,
          paystack_paid_at: data.paid_at ?? now.toISOString(),
        })
        .eq('id', sub.id),

      supabase
        .from('stores')
        .update({
          is_pro: true,
          pro_since: periodStart.toISOString(),
          pro_expires_at: periodEnd.toISOString(),
        })
        .eq('id', sub.store_id),
    ])
  }

  if (eventType === 'subscription.create' || eventType === 'subscription.enable') {
    await supabase
      .from('store_subscriptions')
      .update({
        status: 'active',
        paystack_subscription_code: data.subscription_code ?? null,
        paystack_email_token: data.email_token ?? null,
        paystack_customer_code: data.customer?.customer_code ?? null,
      })
      .eq('id', sub.id)
  }

  if (eventType === 'invoice.update') {
    await supabase
      .from('store_subscriptions')
      .update({
        status: 'active',
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .eq('id', sub.id)
  }

  if (eventType === 'invoice.payment_failed') {
    await supabase
      .from('store_subscriptions')
      .update({
        status: 'past_due',
      })
      .eq('id', sub.id)
  }

  if (eventType === 'subscription.disable') {
    await Promise.all([
      supabase
        .from('store_subscriptions')
        .update({
          status: 'cancelled',
        })
        .eq('id', sub.id),

      supabase
        .from('stores')
        .update({
          is_pro: false,
        })
        .eq('id', sub.store_id),
    ])
  }

  return NextResponse.json({ ok: true })
}