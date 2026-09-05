// apps/web/app/api/org/[orgSlug]/wallet/balance/route.ts
// GET -> current credit balance for the org, in cents and KES.
import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { getOrgRole } from '@/lib/servers-db'
import { getWalletBalanceCents, centsToKes } from '@/lib/wallet'

async function resolveOrg(orgSlug: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('orgs').select('id').eq('slug', orgSlug).single()
  return data
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const role = await getOrgRole(org.id, session.user.id)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const balanceCents = await getWalletBalanceCents(org.id)

  return NextResponse.json({ balanceCents, balanceKes: centsToKes(balanceCents) })
}