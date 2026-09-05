// apps/web/app/api/cron/bill-servers/route.ts
// Run on a schedule (Vercel Cron or similar) every 5-10 min. For every
// `started` server, charges the org wallet for elapsed hours since it was
// last billed. If the org can't cover it, the server is stopped via UpCloud
// (reusing stopServer from lib/upcloud.ts) and billing is marked suspended.
//
// Prorates per elapsed hour rather than "1 hour per tick" — safe to run at
// any interval, won't over/under-charge if the cron is delayed.
import { NextResponse, type NextRequest } from 'next/server'
import { stopServer } from '@/lib/upcloud'
import { listBillableServers, adjustWallet, getWalletBalanceCents, markServerBilled, suspendServerBilling } from '@/lib/wallet'
import { createClient } from '@mcloud/db/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const billable = await listBillableServers()

  const results: Array<{ serverId: string; chargedCents: number; suspended: boolean; error?: string }> = []

  for (const row of billable) {
    const server = Array.isArray(row.servers) ? row.servers[0] : row.servers
    if (!server) continue

    const lastBilledAt = new Date(row.last_billed_at)
    const elapsedHours = (now.getTime() - lastBilledAt.getTime()) / (1000 * 60 * 60)

    if (elapsedHours < 1 / 60) continue // less than a minute — skip this tick

    const chargeCents = Math.round(row.hourly_rate_cents * elapsedHours)
    if (chargeCents <= 0) continue

    try {
      const balanceCents = await getWalletBalanceCents(row.org_id)

      if (balanceCents < chargeCents) {
        // Charge what's left, then suspend rather than let the org run a debt.
        if (balanceCents > 0) {
          await adjustWallet({
            orgId: row.org_id,
            amountCents: -balanceCents,
            kind: 'hourly_charge',
            serverId: row.server_id,
            metadata: { partial: true, elapsedHours, fullChargeCents: chargeCents },
          })
        }

        await stopServer(server.upcloud_uuid)

        const supabase = await createClient()
        await supabase.from('servers').update({ state: 'stopped' }).eq('id', row.server_id)

        await suspendServerBilling(row.server_id, now.toISOString())

        results.push({ serverId: row.server_id, chargedCents: balanceCents, suspended: true })
        continue
      }

      await adjustWallet({
        orgId: row.org_id,
        amountCents: -chargeCents,
        kind: 'hourly_charge',
        serverId: row.server_id,
        metadata: { elapsedHours },
      })

      await markServerBilled(row.server_id, now.toISOString())

      results.push({ serverId: row.server_id, chargedCents: chargeCents, suspended: false })
    } catch (e) {
      results.push({
        serverId: row.server_id,
        chargedCents: 0,
        suspended: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({ processedCount: results.length, results })
}