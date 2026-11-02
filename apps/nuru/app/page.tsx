import { FeedList } from '@/components/feed-list'
import { maybeRefreshFeed } from '@/lib/feed/ingest'
import { listFeed, type FeedRow } from '@/lib/feed/queries'

// ISR: never read cookies(), headers() or searchParams here.
export const revalidate = 600

export default async function Home() {
  let rows: FeedRow[] = []
  try {
    await maybeRefreshFeed()
    rows = await listFeed({})
  } catch (err) {
    console.error('feed unavailable', err)
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
