// Drop the cached public pages of one store so the next visit rebuilds them.
// Call after any write that changes what a visitor sees: products, pages, theme,
// settings, plan, activation. The time-based `revalidate` on each page is only the
// backstop for a write path that forgot to call this.
import { revalidateTag } from 'next/cache'
import { storeTag } from './store-queries'
import { createPublicClient } from '@mcloud/db/server'

export function revalidateStore(slug: string | null | undefined) {
    if (!slug) return
    try {
        // Every cached page of the store carries this tag (see getStoreRow). expire: 0 makes
        // the next visit rebuild instead of serving the old page while it refreshes.
        revalidateTag(storeTag(slug), { expire: 0 })
    } catch (err) {
        // Revalidation is an optimisation for freshness; a failure must never fail the write.
        console.error('[storefront] revalidate failed:', err)
    }
}

/** For writers keyed by store id (the admin actions), which don't have the slug to hand. */
export async function revalidateStoreById(storeId: string) {
    try {
        const { data } = await createPublicClient().from('stores').select('slug').eq('id', storeId).maybeSingle()
        revalidateStore(data?.slug)
    } catch (err) {
        console.error('[storefront] revalidate lookup failed:', err)
    }
}
