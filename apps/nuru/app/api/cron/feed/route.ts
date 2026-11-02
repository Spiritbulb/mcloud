// @route-kind: cron
import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { runIngest } from '@/lib/feed/ingest'
import { withFeedLease } from '@/lib/feed/lease'

export const maxDuration = 60

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const out = await withFeedLease(runIngest)
  if (out === 'busy') return NextResponse.json({ busy: true })
  if (out.some((r) => r.inserted > 0)) revalidatePath('/')
  return NextResponse.json({ results: out })
}
