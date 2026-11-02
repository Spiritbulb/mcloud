'use client'
import { Fragment, useState } from 'react'
import type { FeedRow } from '@/lib/feed/queries'
import { formatFeedDate } from '@/lib/feed/feed-logic'

const CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'government', label: 'Government' },
  { key: 'university', label: 'Universities' },
  { key: 'media', label: 'Media' },
] as const

type Page = { items: FeedRow[]; nextCursor: string | null }

export function FeedList({ initial }: { initial: FeedRow[] }) {
  const [rows, setRows] = useState(initial)
  const [chip, setChip] = useState<string>('all')
  const [more, setMore] = useState(initial.length > 0)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const shown = chip === 'all' ? rows : rows.filter((r) => r.category === chip)

  async function older() {
    const last = rows[rows.length - 1]
    if (!last) return
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(last.cursor)}`)
      if (!res.ok) throw new Error(String(res.status))
      const page = (await res.json()) as Page
      setRows((cur) => {
        const seen = new Set(cur.map((r) => r.id))
        return [...cur, ...page.items.filter((r) => !seen.has(r.id))]
      })
      setMore(page.nextCursor !== null)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  if (rows.length === 0) {
    return <p className="ui-sans mt-10 text-[var(--muted)]">No news in the last 7 days yet.</p>
  }

  return (
    <div className="mt-6">
      <div className="ui-sans flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={chip === c.key}
            onClick={() => setChip(c.key)}
            className="rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--muted)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:text-[var(--accent)]"
          >
            {c.label}
          </button>
        ))}
      </div>

      <ol className="mt-4 divide-y divide-[var(--line)]">
        {shown.map((r, i) => (
          <Fragment key={r.id}>
            <li className="py-5">
              <h2 className="text-lg font-semibold leading-snug">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener"
                  className="hover:text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  {r.title}
                </a>
              </h2>
              <p className="ui-sans mt-1 text-sm text-[var(--muted)]">
                {r.source} · {formatFeedDate(r.at)}
              </p>
              {r.summary && <p className="mt-2 line-clamp-2 text-[var(--ink)]/90">{r.summary}</p>}
              {r.why && (
                <p className="ui-sans mt-2 border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--muted)]">
                  <span className="font-medium text-[var(--accent)]">Nuru&apos;s analysis:</span> {r.why}
                </p>
              )}
            </li>
            {i === 4 && (
              <li className="ui-sans my-2 rounded-md bg-[var(--line)]/40 px-4 py-3 text-sm">
                Connected to an institution?{' '}
                <a href="/waitlist?kind=institution" className="font-medium text-[var(--accent)] underline">
                  Join the waitlist
                </a>
              </li>
            )}
          </Fragment>
        ))}
      </ol>
      {shown.length === 0 && (
        <p className="ui-sans py-6 text-[var(--muted)]">Nothing in this category yet.</p>
      )}

      {more && (
        <div className="ui-sans mt-4">
          <button
            type="button"
            onClick={older}
            disabled={loading}
            className="rounded-md border border-[var(--line)] px-4 py-2 text-sm hover:border-[var(--accent)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {loading ? 'Loading…' : 'Show older'}
          </button>
          {failed && <span className="ml-3 text-sm text-red-700">Could not load older news. Try again.</span>}
        </div>
      )}
    </div>
  )
}
