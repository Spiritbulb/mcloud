// apps/web/app/api/org/[orgSlug]/servers/route.ts
// GET  -> list this org's servers (DB mapping + live UpCloud state)
// POST -> provision a new server for this org (owner/admin only)
import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { getOrgRole, listOrgServerUuids, recordServer, syncServerCache } from '@/lib/servers-db'
import { listServers, createServer, getServer } from '@/lib/upcloud'
import { canAffordHourlyRate, hourlyRateCentsForMonthlyKes, seedServerBilling, adjustWallet, centsToKes } from '@/lib/wallet'

async function resolveOrg(orgSlug: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('orgs').select('id').eq('slug', orgSlug).single()
  return data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const role = await getOrgRole(org.id, session.user.id)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

   try {
    const uuids = await listOrgServerUuids(org.id)
    if (uuids.length === 0) return NextResponse.json({ servers: [] })

    const all = await listServers()
    const owned = all.filter((s) => uuids.includes(s.uuid))
    await syncServerCache(owned)
    return NextResponse.json({ servers: owned })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load servers' },
      { status: 502 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const role = await getOrgRole(org.id, session.user.id)
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    title?: unknown
    hostname?: unknown
    zone?: unknown
    plan?: unknown
    templateUuid?: unknown
    storageSize?: unknown
    sshKeys?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const hostname = typeof body.hostname === 'string' ? body.hostname.trim() : ''
  const zone = typeof body.zone === 'string' ? body.zone : ''
  const plan = typeof body.plan === 'string' ? body.plan : ''
  const templateUuid = typeof body.templateUuid === 'string' ? body.templateUuid : ''
  const storageSize = typeof body.storageSize === 'number' ? body.storageSize : NaN

  if (!title || !hostname || !zone || !plan || !templateUuid) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!Number.isFinite(storageSize) || storageSize < 10 || storageSize > 1024) {
    return NextResponse.json({ error: 'Storage size must be between 10 and 1024 GB' }, { status: 400 })
  }

  // ── Credits gate ──────────────────────────────────────────────────────
  // Uses the same KES pricing route the form displays prices from, so the
  // hourly rate charged always matches what the user was shown.
  const kesPriceRes = await fetch(new URL('/api/upcloud/plans/kes', req.url).toString(), {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  const { prices: kesPrices } = (await kesPriceRes.json()) as { prices: Record<string, number> }
  const monthlyKesPrice = kesPrices[plan]

  if (!monthlyKesPrice) {
    return NextResponse.json({ error: 'No pricing configured for this plan' }, { status: 400 })
  }

  const hourlyRateCents = hourlyRateCentsForMonthlyKes(monthlyKesPrice)
  const { ok: canAfford, balanceCents } = await canAffordHourlyRate(org.id, hourlyRateCents)

  if (!canAfford) {
    return NextResponse.json(
      {
        error: `Insufficient credits. This plan costs KSh ${centsToKes(hourlyRateCents).toFixed(2)}/hour and your balance is KSh ${centsToKes(balanceCents).toFixed(2)}. Top up to continue.`,
        code: 'INSUFFICIENT_CREDITS',
        hourlyRateCents,
        balanceCents,
      },
      { status: 402 },
    )
  }

  try {
    const { server, privateKey } = await createServer({ title, hostname, zone, plan, templateUuid, storageSize })

    await recordServer({
      orgId: org.id,
      upcloudUuid: server.uuid,
      title: server.title,
      zone: server.zone,
      plan: server.plan,
      state: server.state,
      createdBy: session.user.id,
    })

    // Find the DB row we just inserted so billing can reference its id.
    const supabase = await createClient()
    const { data: serverRow } = await supabase
      .from('servers')
      .select('id')
      .eq('upcloud_uuid', server.uuid)
      .single()

    if (serverRow) {
      await seedServerBilling({ serverId: serverRow.id, orgId: org.id, hourlyRateCents })

      // Charge the first hour up front so a server can't be created and
      // deleted to dodge billing before the first cron tick.
      await adjustWallet({
        orgId: org.id,
        amountCents: -hourlyRateCents,
        kind: 'hourly_charge',
        serverId: serverRow.id,
        metadata: { firstHour: true },
      })
    }

    // privateKey is returned to the client exactly once and never stored.
    return NextResponse.json({ server, privateKey }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create server' },
      { status: 502 },
    )
  }
}