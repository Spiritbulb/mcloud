import 'server-only'
import { db } from '@/lib/db'
import { encodeCursor } from './feed-logic'
import type { Category } from './types'

export type FeedRow = {
  id: number
  url: string
  title: string
  summary: string
  /** UTC ISO, microsecond precision: coalesce(published_at, fetched_at) */
  at: string
  /** Opaque keyset cursor pointing just after this row */
  cursor: string
  source: string
  category: Category
  why: string | null
}

type Opts = {
  /** Keyset position: only rows strictly older than (at, id). */
  before?: { at: string; id: number }
  /** Only rows newer than this many days. No limit applies unless `limit` is set. */
  days?: number
  limit?: number
}

export async function listFeed({ before, days, limit }: Opts = {}): Promise<FeedRow[]> {
  const sql = db()
  const rows = await sql`
    select i.id, i.url, i.title, i.summary,
           to_char(coalesce(i.published_at, i.fetched_at) at time zone 'UTC',
                   'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at,
           s.name as source, s.category, i.why
    from feed_items i join sources s on s.id = i.source_id
    where s.active
      and (${before?.at ?? null}::timestamptz is null
           or (coalesce(i.published_at, i.fetched_at), i.id)
              < (${before?.at ?? null}::timestamptz, ${before?.id ?? null}::bigint))
      and (${days ?? null}::int is null
           or coalesce(i.published_at, i.fetched_at) > now() - make_interval(days => ${days ?? null}::int))
    order by coalesce(i.published_at, i.fetched_at) desc, i.id desc
    limit ${limit ?? null}::int`
  return rows.map((r) => {
    const id = Number(r.id)
    const at = String(r.at)
    return {
      id,
      url: String(r.url),
      title: String(r.title),
      summary: String(r.summary ?? ''),
      at,
      cursor: encodeCursor(at, id),
      source: String(r.source),
      category: r.category as Category,
      why: (r.why as string | null) ?? null,
    }
  })
}
