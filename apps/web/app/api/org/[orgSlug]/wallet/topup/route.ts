// apps/web/app/api/org/[orgSlug]/wallet/topup/route.ts
// POST -> start an M-Pesa STK Push to add credits to the org's wallet.
// The wallet is only credited once the PalPluss webhook confirms SUCCESS —
// see /api/webhooks/palpluss/route.ts. Any org member can top up.
import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { getOrgRole } from '@/lib/servers-db'
import { createPendingTopup, attachPalplussTransaction, markTopupFailed, MIN_TOPUP_KES, kesToCents } from '@/lib/wallet'
import { initiateStkPush } from '@/lib/palpluss'

async function resolveOrg(orgSlug: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('orgs').select('id').eq('slug', orgSlug).single()
  return data
}

const PHONE_RE = /^(?:\+254|254|0)\d{9}$/

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const role = await getOrgRole(org.id, session.user.id)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { amountKes?: unknown; phone?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const amountKes = typeof body.amountKes === 'number' ? body.amountKes : NaN
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

  if (!Number.isFinite(amountKes) || amountKes < MIN_TOPUP_KES) {
    return NextResponse.json({ error: `Minimum top-up is KSh ${MIN_TOPUP_KES}` }, { status: 400 })
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Enter a valid Kenyan phone number' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_ADMIN_ORIGIN
  if (!appUrl) {
    return NextResponse.json({ error: 'Server misconfigured: NEXT_PUBLIC_ADMIN_ORIGIN not set' }, { status: 500 })
  }

  const topup = await createPendingTopup({
    orgId: org.id,
    requestedBy: session.user.id,
    amountCents: kesToCents(amountKes),
    phone,
  })

  // accountReference must be <= 12 chars — first 12 hex chars of the topup id.
  const shortRef = topup.id.replace(/-/g, '').slice(0, 12)

  try {
    const stk = await initiateStkPush({
      amountKes,
      phone,
      accountReference: shortRef,
      transactionDesc: 'VPS credits',
      callbackUrl: `${appUrl}/api/webhooks/palpluss`,
    })

    await attachPalplussTransaction(topup.id, stk.transactionId)

    return NextResponse.json({ topupId: topup.id, transactionId: stk.transactionId, status: stk.status }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to initiate payment'
    await markTopupFailed(topup.id, message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}