// apps/web/app/api/upcloud/plans/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { listPlans } from '../../../../lib/upcloud'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const plans = await listPlans()

    return NextResponse.json({ plans })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load plans' },
      { status: 502 },
    )
  }
}
