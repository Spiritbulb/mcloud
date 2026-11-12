// Pure helpers for the Reviews moderation screen (no server-only imports, so the
// client can use them and node:test can run them).

export const REVIEW_PAGE_SIZE = 20

export const REVIEW_FILTERS = ['pending', 'published', 'all'] as const
export type ReviewFilter = (typeof REVIEW_FILTERS)[number]

/** Whatever came from the client, narrowed to a filter. Unknown means the default, the queue that needs action. */
export function reviewFilterFrom(v: unknown): ReviewFilter {
    return REVIEW_FILTERS.includes(v as ReviewFilter) ? (v as ReviewFilter) : 'pending'
}

/** Inclusive row range for a 1-based page, as PostgREST `.range()` wants it. */
export function reviewRange(page: unknown): [number, number] {
    const n = typeof page === 'number' && Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
    const from = (n - 1) * REVIEW_PAGE_SIZE
    return [from, from + REVIEW_PAGE_SIZE - 1]
}

export type ReviewerRef = { first_name: string | null; last_name: string | null; email: string | null } | null

/** "Jane Mwangi", else the email, else a placeholder. Customer rows are created with empty names, so blank is common. */
export function reviewerName(c: ReviewerRef): string {
    const full = [c?.first_name, c?.last_name].map((s) => s?.trim()).filter(Boolean).join(' ')
    return full || c?.email?.trim() || 'Customer'
}

export function ratingStars(rating: number): string {
    const r = Math.min(5, Math.max(0, Math.round(rating)))
    return '★'.repeat(r) + '☆'.repeat(5 - r)
}
