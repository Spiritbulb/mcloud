import Link from 'next/link'
import { PAGE_SIZE, listHref, queryParams, type ListQuery } from './list-query'

/** Previous / next links that keep the current search and filters. Renders nothing for a single page. */
export function Pagination({ basePath, q, pages, total, newestFirst }: { basePath: string; q: ListQuery; pages: number; total: number; newestFirst?: boolean }) {
    if (pages <= 1) return null
    const href = (page: number) => listHref(basePath, { ...queryParams(q), page })
    const from = (q.page - 1) * PAGE_SIZE + 1
    const to = Math.min(q.page * PAGE_SIZE, total)
    const link = 'inline-flex h-8 items-center rounded-md border border-border px-3 text-foreground transition-colors hover:bg-muted'
    return (
        <nav className="flex items-center justify-between gap-3 text-[13px]" aria-label="Pagination">
            {q.page > 1 ? <Link href={href(q.page - 1)} className={link} rel="prev">{newestFirst ? 'Newer' : 'Previous'}</Link> : <span />}
            <span className="text-center text-muted-foreground tabular-nums">
                {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
                <span className="hidden sm:inline"> · page {q.page} of {pages}</span>
            </span>
            {q.page < pages ? <Link href={href(q.page + 1)} className={link} rel="next">{newestFirst ? 'Older' : 'Next'}</Link> : <span />}
        </nav>
    )
}
