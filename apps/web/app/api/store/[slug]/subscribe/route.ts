// app/api/store/[slug]/subscribe/route.ts
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

const PLANS = {
  hobby: { code: 'PLN_10bmosuhh7p4zhw', amount: 149900 }, // KES 1499 in kobo
  pro:   { code: 'PLN_ob4j8tgco6e63b0', amount: 249900 }, // KES 2499 in kobo
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession(request)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  // Safely parse the request body — it might be empty
let plan: 'hobby' | 'pro' = 'pro'
try {
  const body = await request.json()
  if (body?.plan) plan = body.plan
} catch {
  // No body sent — default to 'pro'
}

  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, is_pro')
    .eq('slug', slug)
    .single()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', store.id)
    .eq('user_id', session.user.id)
    .in('role', ['owner', 'admin'])
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (store.is_pro) return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })

  const selectedPlan = PLANS[plan] ?? PLANS.pro

  // Initialize Paystack transaction with plan code
let paystackRes: Response
try {
  paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: session.user.email,
      amount: selectedPlan.amount,
      plan: selectedPlan.code,
      currency: 'KES',
      metadata: {
        store_id: store.id,
        store_slug: slug,
        plan_tier: plan,
        user_id: session.user.id,
      },
    }),
  })
} catch (err) {
  console.error('Paystack fetch failed entirely:', err)
  return NextResponse.json({ error: 'Could not reach Paystack' }, { status: 502 })
}

// Guard: read raw text first so you can debug empty/non-JSON responses
const rawText = await paystackRes.text()

if (!rawText) {
  console.error('Paystack returned empty response', paystackRes.status)
  return NextResponse.json(
    { error: 'Paystack returned an empty response' },
    { status: 502 }
  )
}

let paystackData: any
try {
  paystackData = JSON.parse(rawText)
} catch (e) {
  console.error('Paystack non-JSON response:', paystackRes.status, rawText)
  return NextResponse.json(
    { error: 'Unexpected response from Paystack', detail: rawText },
    { status: 502 }
  )
}

if (!paystackData.status) {
  console.error('Paystack error:', paystackData.message)
  return NextResponse.json({ error: paystackData.message }, { status: 502 })
}

  // Record pending subscription
  await supabase.from('store_subscriptions').insert({
    store_id: store.id,
    paystack_reference: paystackData.data.reference,
    amount: selectedPlan.amount / 100,
    currency: 'KES',
    plan: plan,
    status: 'pending',
  })

  return NextResponse.json({ url: paystackData.data.authorization_url })
}