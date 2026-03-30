// src/themes/classic/ReviewsSection.tsx
'use client'

import { useState, useEffect } from 'react'
import { Star, BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { useParams, useRouter } from 'next/navigation'

interface Review {
    id: string
    rating: number
    title: string | null
    body: string | null
    is_verified_purchase: boolean
    helpful_count: number
    created_at: string
    customer: { first_name: string; last_name: string } | null
}

function StarRow({ rating, interactive = false, onChange }: {
    rating: number
    interactive?: boolean
    onChange?: (r: number) => void
}) {
    const [hovered, setHovered] = useState(0)
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    className={cn(
                        'h-4 w-4 transition-colors',
                        (interactive ? (hovered || rating) : rating) >= i
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-none',
                        interactive && 'cursor-pointer'
                    )}
                    style={{ color: (interactive ? (hovered || rating) : rating) >= i ? undefined : 'var(--sf-foreground)', opacity: (interactive ? (hovered || rating) : rating) >= i ? undefined : 0.2 }}
                    onMouseEnter={() => interactive && setHovered(i)}
                    onMouseLeave={() => interactive && setHovered(0)}
                    onClick={() => interactive && onChange?.(i)}
                />
            ))}
        </div>
    )
}

function ReviewCard({ review }: { review: Review }) {
    const name = review.customer
        ? `${review.customer.first_name} ${review.customer.last_name?.charAt(0) ?? ''}.`.trim()
        : 'Anonymous'

    const date = new Date(review.created_at).toLocaleDateString('en-KE', {
        year: 'numeric', month: 'short', day: 'numeric',
    })

    return (
        <div className="space-y-2 pb-6" style={{ borderBottom: '1px solid var(--sf-border)' }}>
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <StarRow rating={review.rating} />
                    {review.title && (
                        <p className="text-sm font-medium" style={{ color: 'var(--sf-foreground)' }}>
                            {review.title}
                        </p>
                    )}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    {date}
                </span>
            </div>

            <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--sf-foreground-subtle)' }}>
                {review.body}
            </p>

            <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    {name}
                </span>
                {review.is_verified_purchase && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--sf-accent)' }}>
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified purchase
                    </span>
                )}
            </div>
        </div>
    )
}

function RatingSummary({ reviews }: { reviews: Review[] }) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    const counts = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
    }))

    return (
        <div className="flex gap-8 items-center">
            <div className="text-center flex-shrink-0">
                <p className="text-4xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                    {avg.toFixed(1)}
                </p>
                <StarRow rating={Math.round(avg)} />
                <p className="text-xs mt-1" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </p>
            </div>
            <div className="flex-1 space-y-1.5">
                {counts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2">
                        <span className="text-xs w-4 text-right flex-shrink-0" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {star}
                        </span>
                        <Star className="h-3 w-3 flex-shrink-0 fill-amber-400 text-amber-400" />
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sf-muted)' }}>
                            <div
                                className="h-full rounded-full bg-amber-400 transition-all"
                                style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                            />
                        </div>
                        <span className="text-xs w-4 flex-shrink-0" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {count}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ReviewForm({ storeSlug, productId, customerId, onSubmitted, onCancel }: {
    storeSlug: string
    productId: string
    customerId: string
    onSubmitted: () => void
    onCancel: () => void
}) {
    const [rating, setRating] = useState(0)
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!rating) { setError('Please select a rating'); return }
        if (!body.trim()) { setError('Please write your review'); return }

        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch(`/api/store/${storeSlug}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    customer_id: customerId,
                    rating,
                    title: title.trim() || undefined,
                    review_body: body.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to submit review')
            onSubmitted()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const inputClass = "w-full px-3 py-2 text-sm font-light bg-transparent outline-none"
    const inputStyle = {
        border: '1px solid var(--sf-border-strong)',
        color: 'var(--sf-foreground)',
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-5" style={{ border: '1px solid var(--sf-border)', backgroundColor: 'var(--sf-muted)' }}>
            <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    Your rating
                </label>
                <StarRow rating={rating} interactive onChange={setRating} />
            </div>

            <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    Title <span style={{ color: 'var(--sf-foreground-subtle)' }}>(optional)</span>
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarise your experience"
                    className={inputClass}
                    style={inputStyle}
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    Review <span style={{ color: 'var(--sf-foreground)' }}>*</span>
                </label>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    placeholder="What did you think of this product?"
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                />
            </div>

            {error && (
                <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
            )}

            <div className="flex gap-3">
                <Button
                    type="submit"
                    disabled={submitting}
                    className="sf-btn-primary"
                    size="sm"
                >
                    {submitting ? 'Submitting...' : 'Submit review'}
                </Button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-sm sf-pill sf-pill-inactive border px-4 py-1.5"
                >
                    Cancel
                </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                Reviews are published after moderation.
            </p>
        </form>
    )
}

export function ReviewsSection({ productId, storeSlug, onReviewSubmitted }: { productId: string; storeSlug: string, onReviewSubmitted?: () => void }) {
    const [reviews, setReviews] = useState<Review[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const { user } = useCustomerAuth()
    const params = useParams<{ slug: string }>()
    const router = useRouter()

    const handleWriteReview = () => {
        if (!user) {
            router.push(`/store/${params.slug}/account/login?redirect=back`)
            return
        }
        setShowForm(true)
    }

    useEffect(() => {
        fetch(`/api/store/${storeSlug}/reviews?product_id=${productId}`)
            .then((r) => r.json())
            .then((d) => { setReviews(d.reviews || []); setLoading(false) })
    }, [productId, storeSlug])

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-20">
            <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} className="mb-10" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-8">
                <h2 className="sf-heading text-2xl font-light">
                    {reviews.length === 0 && !loading ? 'No reviews yet' : 'Reviews'}
                </h2>
                {!showForm && !submitted && (
                    <button
                        onClick={handleWriteReview}
                        className="sf-pill sf-pill-inactive border px-4 py-1.5 text-sm flex-shrink-0"
                    >
                        {user ? 'Write a review' : 'Login to write a review'}
                    </button>
                )}
            </div>

            {/* Submitted confirmation */}
            {submitted && (
                <div className="mb-8 p-4 text-sm" style={{ border: '1px solid var(--sf-border)', color: 'var(--sf-foreground-subtle)' }}>
                    Thanks for your review! It'll appear here once approved.
                </div>
            )}

            {/* Form */}
            {showForm && user && (
                <ReviewForm
                    storeSlug={storeSlug}
                    productId={productId}
                    customerId={user.id}
                    onSubmitted={() => {
                        setShowForm(false)
                        setSubmitted(true)
                        onReviewSubmitted?.()
                    }}
                    onCancel={() => setShowForm(false)}
                />
            )}
            {/* Empty state */}
            {!loading && reviews.length === 0 && (
                <div className="text-center py-12 space-y-3">
                    <div className="flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} className="h-6 w-6" style={{ color: 'var(--sf-foreground)', opacity: 0.15 }} />
                        ))}
                    </div>
                    <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Be the first to review this product
                    </p>
                    <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)', opacity: 0.7 }}>
                        Share your experience and help other shoppers decide
                    </p>

                </div>
            )}

            {/* Rating summary — only show when there are reviews */}
            {reviews.length > 0 && (
                <>
                    <div className="mb-8">
                        <RatingSummary reviews={reviews} />
                    </div>
                    <div className="space-y-6">
                        {reviews.map((review) => (
                            <ReviewCard key={review.id} review={review} />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}