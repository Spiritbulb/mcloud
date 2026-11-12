'use server'
// Reviews moderation. Shoppers' reviews arrive unpublished (api/store/[slug]/reviews);
// these let the store's managers approve, hide or delete them. Every action authorizes
// against the store (./access) and scopes each query by store_id, so one store's manager
// can never touch another's reviews.
import { createClient } from '@mcloud/db/server'
import { requireManagedStore, type ActionResult } from './access'
import { revalidateStoreById } from '@/lib/revalidate-store'
import { reviewFilterFrom, reviewRange, type ReviewFilter, type ReviewerRef } from './review-logic'

export interface ReviewRow {
    id: string
    rating: number
    title: string | null
    body: string | null
    is_published: boolean
    is_verified_purchase: boolean
    created_at: string
    product: { name: string; slug: string } | null
    customer: ReviewerRef
}

const COLUMNS =
    'id, rating, title, body, is_published, is_verified_purchase, created_at, product:products(name, slug), customer:customers(first_name, last_name, email)'

export async function listReviews(storeId: string, filter: ReviewFilter, page: number) {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return { ok: false as const, error: gate.error }
    const supabase = await createClient()
    const f = reviewFilterFrom(filter)
    const [from, to] = reviewRange(page)

    let list = supabase
        .from('product_reviews')
        .select(COLUMNS, { count: 'exact' })
        .eq('store_id', gate.storeId)
        .order('created_at', { ascending: false })
        .range(from, to)
    if (f === 'pending') list = list.eq('is_published', false)
    if (f === 'published') list = list.eq('is_published', true)

    const count = (published: boolean) =>
        supabase.from('product_reviews').select('id', { count: 'exact', head: true })
            .eq('store_id', gate.storeId).eq('is_published', published)

    const [rows, pending, published] = await Promise.all([list, count(false), count(true)])
    if (rows.error) return { ok: false as const, error: 'Could not load reviews' }

    return {
        ok: true as const,
        reviews: (rows.data ?? []) as unknown as ReviewRow[],
        total: rows.count ?? 0,
        counts: { pending: pending.count ?? 0, published: published.count ?? 0 },
    }
}

export async function setReviewPublished(storeId: string, reviewId: string, published: boolean): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    if (typeof reviewId !== 'string' || !reviewId) return { ok: false, error: 'Missing review' }
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('product_reviews')
        .update({ is_published: !!published, updated_at: new Date().toISOString() })
        .eq('id', reviewId)
        .eq('store_id', gate.storeId)
        .select('id')
        .maybeSingle()
    if (error || !data) return { ok: false, error: 'Could not update the review.' }
    // Published reviews feed the rating shown on cached product pages.
    await revalidateStoreById(gate.storeId)
    return { ok: true }
}

export async function deleteReview(storeId: string, reviewId: string): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    if (typeof reviewId !== 'string' || !reviewId) return { ok: false, error: 'Missing review' }
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('store_id', gate.storeId)
        .select('id')
        .maybeSingle()
    if (error || !data) return { ok: false, error: 'Could not delete the review.' }
    await revalidateStoreById(gate.storeId)
    return { ok: true }
}
