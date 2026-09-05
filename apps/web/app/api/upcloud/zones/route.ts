// apps/web/app/api/upcloud/zones/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { listZones } from '../../../../lib/upcloud'

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const zones = await listZones()
    return NextResponse.json({ zones })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load zones' },
      { status: 502 },
    )
  }
}