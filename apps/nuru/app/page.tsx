import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { FeedList } from '@/components/feed-list'
import { maybeRefreshFeed } from '@/lib/feed/ingest'
import { listFeed, type FeedRow } from '@/lib/feed/queries'

// ISR: never read cookies(), headers() or searchParams here.
export const revalidate = 600

export default async function Home() {
  let rows: FeedRow[] = []
  try {
    await maybeRefreshFeed() // best-effort
  } catch (err) {
    console.error('feed refresh failed', err)
  }
  try {
    rows = await listFeed({ days: 7 })
  } catch (err) {
    // Only tolerate a missing DB while building. At runtime throw, so Next keeps the last good page.
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw err
    console.error('feed unavailable at build', err)
  }
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">News</h1>
      <p className="ui-sans mt-1 text-sm text-[var(--muted)]">
        Kenyan government, universities and media, from the last 7 days.
      </p>
      <FeedList initial={rows} />
    </section>
  )
}
