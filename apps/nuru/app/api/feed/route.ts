// @route-kind: public — read-only public news feed
import { NextResponse, type NextRequest } from 'next/server'
import { listFeed } from '@/lib/feed/queries'
import { parseBefore } from '@/lib/feed/feed-logic'

const LIMIT = 50

export async function GET(req: NextRequest) {
  const before = parseBefore(req.nextUrl.searchParams.get('before'))
  if (!before) return NextResponse.json({ error: 'before must be an ISO date' }, { status: 400 })
  const items = await listFeed({ before, limit: LIMIT })
  const nextBefore = items.length === LIMIT ? items[items.length - 1].at : null
  return NextResponse.json(
    { items, nextBefore },
    { headers: { 'Cache-Control': 'public, s-maxage=300' } },
  )
}
