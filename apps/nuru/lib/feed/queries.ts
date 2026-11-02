import 'server-only'
import { db } from '@/lib/db'
import type { Category } from './types'

export type FeedRow = {
  id: number
  url: string
  title: string
  summary: string
  at: string
  source: string
  category: Category
  why: string | null
}

type Opts = { before?: Date; days?: number; limit?: number }

export async function listFeed({ before, days = 7, limit = 50 }: Opts = {}): Promise<FeedRow[]> {
  const sql = db()
  const rows = before
    ? await sql`
        select i.id, i.url, i.title, i.summary, coalesce(i.published_at, i.fetched_at) as at,
               s.name as source, s.category, i.why
        from feed_items i join sources s on s.id = i.source_id
        where s.active and coalesce(i.published_at, i.fetched_at) < ${before.toISOString()}
        order by at desc, i.id desc
        limit ${limit}`
    : await sql`
        select i.id, i.url, i.title, i.summary, coalesce(i.published_at, i.fetched_at) as at,
               s.name as source, s.category, i.why
        from feed_items i join sources s on s.id = i.source_id
        where s.active and coalesce(i.published_at, i.fetched_at) > now() - make_interval(days => ${days})
        order by at desc, i.id desc`
  return rows.map((r) => ({
    id: Number(r.id),
    url: String(r.url),
    title: String(r.title),
    summary: String(r.summary ?? ''),
    at: new Date(r.at as string | Date).toISOString(),
    source: String(r.source),
    category: r.category as Category,
    why: (r.why as string | null) ?? null,
  }))
}
