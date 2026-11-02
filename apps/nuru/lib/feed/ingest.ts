import 'server-only'
import { after } from 'next/server'
import { db } from '@/lib/db'
import { parseFeed } from './rss-logic'
import { normalizeItem } from './normalize-logic'
import { PARSERS } from './parsers'
import { isStale } from './stale-logic'
import { withFeedLease } from './lease'
import { whyUpdates } from './why-logic'
import { whyItMatters } from '@/lib/ai/claude'
import type { RawItem, Source } from './types'

export type SourceResult = { source: string; ok: boolean; inserted: number; error?: string }

const UA = 'NuruBot/1.0 (+https://nuru.spiritb.uk)'

async function fetchRaw(s: Source): Promise<RawItem[]> {
  const res = await fetch(s.url, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, text/xml, text/html, */*' },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.text()
  if (s.kind === 'rss') return parseFeed(body)
  const parser = s.parser ? PARSERS[s.parser] : undefined
  if (!parser) throw new Error(`unknown parser: ${s.parser ?? '(none)'}`)
  const items = parser(body, s.homepage)
  if (items.length === 0) throw new Error('parser returned no items')
  return items
}

type NewItem = { id: number; title: string; summary: string; source: string }

const WHY_BATCH = 20

async function ingestSource(s: Source, fresh: NewItem[]): Promise<SourceResult> {
  try {
    const raw = await fetchRaw(s)
    const now = new Date()
    let inserted = 0
    for (const r of raw) {
      const item = normalizeItem(r, s.homepage, now)
      if (!item) continue
      const rows = await db()`
        insert into feed_items (source_id, url, title, summary, published_at, title_key)
        select ${s.id}, ${item.url}, ${item.title}, ${item.summary}, ${item.publishedAt}, ${item.titleKey}
        where not exists (select 1 from feed_items where source_id = ${s.id} and title_key = ${item.titleKey})
        on conflict (url) do nothing
        returning id, title, summary`
      inserted += rows.length
      for (const row of rows) {
        fresh.push({ id: Number(row.id), title: String(row.title ?? ''), summary: String(row.summary ?? ''), source: s.name })
      }
    }
    await db()`update sources set last_fetched_at = now(), last_ok_at = now(), last_error = null where id = ${s.id}`
    return { source: s.name, ok: true, inserted }
  } catch (e) {
    const error = (e instanceof Error ? e.message : String(e)).slice(0, 300)
    try {
      await db()`update sources set last_fetched_at = now(), last_error = ${error} where id = ${s.id}`
    } catch {
      // recording the failure must not mask it
    }
    return { source: s.name, ok: false, inserted: 0, error }
  }
}

/** Best effort: any failure is logged and never touches the ingest results. */
async function addWhyLines(batch: NewItem[]): Promise<void> {
  if (batch.length === 0) return
  try {
    const results = await whyItMatters(batch)
    for (const u of whyUpdates(batch.map((b) => b.id), results)) {
      await db()`update feed_items set why = ${u.why} where id = ${u.id}`
    }
  } catch (e) {
    console.error('why-this-matters failed:', e instanceof Error ? e.message : String(e))
  }
}

export async function runIngest(): Promise<SourceResult[]> {
  const rows = await db()`
    select id, name, kind, url, homepage, category, parser from sources where active order by id`
  const sources = rows as unknown as Source[]
  const fresh: NewItem[] = []
  const settled = await Promise.allSettled(sources.map((s) => ingestSource(s, fresh)))
  await addWhyLines(fresh.slice(0, WHY_BATCH))
  return settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { source: sources[i].name, ok: false, inserted: 0, error: String(r.reason).slice(0, 300) },
  )
}

/** Safe to call from a cached page: reads no cookies or headers. Refresh runs after the response. */
export async function maybeRefreshFeed(): Promise<void> {
  const rows = await db()`select max(last_fetched_at) as last from sources where active`
  const last = rows[0]?.last ? new Date(rows[0].last as string | Date) : null
  if (!isStale(last, new Date())) return
  after(() => withFeedLease(runIngest))
}
