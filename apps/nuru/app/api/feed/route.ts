// @route-kind: public — read-only public news feed
import { NextResponse, type NextRequest } from 'next/server'
import { listFeed } from '@/lib/feed/queries'
import { decodeCursor } from '@/lib/feed/feed-logic'

const LIMIT = 50

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('cursor')
  const before = raw === null ? undefined : decodeCursor(raw)
  if (before === null) return NextResponse.json({ error: 'invalid cursor' }, { status: 400 })
  const items = await listFeed({ before, limit: LIMIT })
  const nextCursor = items.length === LIMIT ? items[items.length - 1].cursor : null
  return NextResponse.json(
    { items, nextCursor },
    { headers: { 'Cache-Control': 'public, s-maxage=300' } },
  )
}
