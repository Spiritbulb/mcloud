'use client'

import { useCallback, useEffect, useState } from 'react'
import { deleteReview, listReviews, setReviewPublished, type ReviewRow } from '@/lib/admin/review-actions'
import { REVIEW_PAGE_SIZE, ratingStars, reviewerName, type ReviewFilter } from '@/lib/admin/review-logic'
import { Badge, Status } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { Tabs } from '@mcloud/ui/kit/tabs'

const EMPTY: Record<ReviewFilter, { title: string; description: string }> = {
    pending: { title: 'Nothing waiting for approval', description: 'New reviews from your customers show up here first. They only appear on your site once you approve them.' },
    published: { title: 'No published reviews yet', description: 'Approved reviews appear on the product page.' },
    all: { title: 'No reviews yet', description: 'Customers who are signed in can review a product from its page.' },
}

export default function ReviewsClient({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
    const [filter, setFilter] = useState<ReviewFilter>('pending')
    const [page, setPage] = useState(1)
    const [reviews, setReviews] = useState<ReviewRow[]>([])
    const [total, setTotal] = useState(0)
    const [counts, setCounts] = useState({ pending: 0, published: 0 })
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null)

    // `loading` is switched on by the handlers that change what is shown (tab, page), not here:
    // setting state synchronously inside an effect-driven load re-renders for nothing.
    const load = useCallback(async () => {
        const res = await listReviews(storeId, filter, page)
        if (res.ok) {
            setReviews(res.reviews)
            setTotal(res.total)
            setCounts(res.counts)
            setLoadError(null)
        } else {
            setLoadError(res.error)
        }
        setLoading(false)
    }, [storeId, filter, page])

    useEffect(() => { load() }, [load])

    const togglePublished = async (r: ReviewRow) => {
        setBusyId(r.id)
        const res = await setReviewPublished(storeId, r.id, !r.is_published)
        setBusyId(null)
        setActionError(res.ok ? null : res.error)
        load()
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return
        setBusyId(deleteTarget.id)
        const res = await deleteReview(storeId, deleteTarget.id)
        setBusyId(null)
        setDeleteTarget(null)
        setActionError(res.ok ? null : res.error)
        load()
    }

    const pages = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE))
    const waiting = counts.pending

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reviews"
                description={waiting > 0 ? `${waiting} waiting for your approval` : 'Approve what customers say before it appears on your site.'}
            />

            <Tabs
                label="Review status"
                value={filter}
                onChange={(id) => { setLoading(true); setFilter(id as ReviewFilter); setPage(1) }}
                items={[
                    { id: 'pending', label: 'Waiting for approval', count: counts.pending },
                    { id: 'published', label: 'Published', count: counts.published },
                    { id: 'all', label: 'All', count: counts.pending + counts.published },
                ]}
            />

            {actionError && <Notice tone="error">{actionError}</Notice>}

            <Panel flush>
                {loadError && !loading ? (
                    <LoadError message={loadError} onRetry={load} />
                ) : loading && reviews.length === 0 ? (
                    <div className="flex justify-center p-10"><Spinner size={18} /></div>
                ) : reviews.length === 0 ? (
                    <EmptyState icon="reviews" title={EMPTY[filter].title} description={EMPTY[filter].description} />
                ) : (
                    <ul className="divide-y divide-border">
                        {reviews.map((r) => (
                            <li key={r.id} className="space-y-2 p-4">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="text-[15px] tracking-wider text-amber-500" role="img" aria-label={`${r.rating} out of 5 stars`}>{ratingStars(r.rating)}</span>
                                    {r.title && <span className="text-[14px] font-medium">{r.title}</span>}
                                    <Status tone={r.is_published ? 'success' : 'warning'}>{r.is_published ? 'Published' : 'Waiting'}</Status>
                                    {r.is_verified_purchase && <Badge tone="info">Verified purchase</Badge>}
                                </div>
                                {r.body && <p className="whitespace-pre-line text-[14px] leading-relaxed">{r.body}</p>}
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-[13px] text-muted-foreground">
                                        {reviewerName(r.customer)} on{' '}
                                        {r.product
                                            ? <a href={`/store/${storeSlug}/${r.product.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">{r.product.name}</a>
                                            : 'a deleted product'}
                                        {' · '}{new Date(r.created_at).toLocaleDateString()}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant={r.is_published ? 'secondary' : 'primary'} disabled={busyId === r.id} onClick={() => togglePublished(r)}>
                                            <Icon name={r.is_published ? 'visibility_off' : 'check'} size={15} />
                                            {r.is_published ? 'Unpublish' : 'Approve'}
                                        </Button>
                                        <Button size="sm" variant="ghost" aria-label="Delete review" disabled={busyId === r.id} onClick={() => setDeleteTarget(r)}>
                                            <Icon name="delete" size={15} />
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {pages > 1 && (
                    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
                        <span>Page {page} of {pages}</span>
                        <div className="flex gap-2">
                            <Button size="sm" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((p) => p - 1) }}>Previous</Button>
                            <Button size="sm" disabled={page >= pages || loading} onClick={() => { setLoading(true); setPage((p) => p + 1) }}>Next</Button>
                        </div>
                    </div>
                )}
            </Panel>

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Delete this review?"
                description="It is removed for good. If you only want it off your site, unpublish it instead."
                confirmLabel="Delete review"
                busy={busyId !== null && deleteTarget?.id === busyId}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
