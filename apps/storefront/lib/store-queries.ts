// Per-request deduplicated reads for a public store render. layout.tsx, generateMetadata
// and page.tsx all need the same rows; React cache() makes them one query each per render
// instead of one per caller.
//
// These use the cookie-free client on purpose: reading cookies() or headers() anywhere in
// a page's render tree makes the whole page dynamic, and a public store page that is
// dynamic runs a function on every view instead of being served from the CDN.
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@mcloud/db/server'
import { getStorePlan } from '@mcloud/merchant/plans-server'

/** The cache tag every cached page of a store carries. One tag purges all of them. */
export const storeTag = (slug: string) => `store:${slug}`

/**
 * The store row by slug (any is_active state), or null.
 *
 * Wrapped in the data cache with the store's tag on purpose: every public page of a store
 * renders under the same layout, which calls this, so each page's cached HTML inherits the
 * tag. revalidateStore() then clears the whole store in one call. (revalidatePath cannot:
 * it matches one URL, not a store's pages, and the layout's data is baked into all of them.)
 */
const loadStoreRow = (slug: string) =>
    unstable_cache(
        async () => {
            const { data } = await createPublicClient()
                .from('stores')
                .select('*')
                .eq('slug', slug)
                .single()
            return data
        },
        ['store-row', slug],
        { tags: [storeTag(slug)], revalidate: 300 },
    )()

export const getStoreRow = cache(loadStoreRow)

export const getStoreTheme = cache(async (storeId: string) => {
    const { data } = await createPublicClient()
        .from('store_themes')
        .select('*')
        .eq('store_id', storeId)
        .single()
    return data
})

/** The store's effective plan (best active, unexpired subscription), once per render. */
export const getStorePlanCached = cache(async (storeId: string) => getStorePlan(storeId))
