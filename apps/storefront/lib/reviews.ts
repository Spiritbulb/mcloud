// lib/reviews.ts
// Per-product published-review aggregates (average rating + count) for storefront
// listings. One query for the whole page, then merged onto each product so cards
// can show real ratings instead of hardcoded placeholders.

import type { createClient } from '@mcloud/db/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export interface ReviewAggregate {
    rating: number
    review_count: number
}

/**
 * Fetch average rating + review count for the given products in a single query.
 * Returns a map keyed by product id; products with no published reviews are absent.
 */
export async function getReviewAggregates(
    supabase: SupabaseClient,
    storeId: string,
    productIds: string[]
): Promise<Map<string, ReviewAggregate>> {
    const result = new Map<string, ReviewAggregate>()
    if (productIds.length === 0) return result

    const { data, error } = await supabase
        .from('product_reviews')
        .select('product_id, rating')
        .eq('store_id', storeId)
        .eq('is_published', true)
        .in('product_id', productIds)

    if (error || !data) return result

    const totals = new Map<string, { sum: number; count: number }>()
    for (const row of data as { product_id: string; rating: number }[]) {
        const t = totals.get(row.product_id) ?? { sum: 0, count: 0 }
        t.sum += row.rating
        t.count += 1
        totals.set(row.product_id, t)
    }

    for (const [productId, { sum, count }] of totals) {
        result.set(productId, { rating: sum / count, review_count: count })
    }

    return result
}

/** Merge review aggregates onto product objects (immutably). */
export function withReviewAggregates<T extends { id: string }>(
    products: T[],
    aggregates: Map<string, ReviewAggregate>
): (T & ReviewAggregate)[] {
    return products.map((p) => {
        const agg = aggregates.get(p.id)
        return {
            ...p,
            rating: agg?.rating ?? null,
            review_count: agg?.review_count ?? 0,
        } as T & ReviewAggregate
    })
}
