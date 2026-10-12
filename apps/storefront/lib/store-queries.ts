// Per-request deduplicated reads for a public store render. layout.tsx, generateMetadata
// and page.tsx all need the same rows; React cache() makes them one query each per request
// instead of one per caller. (Cross-request caching is a separate step.)
import { cache } from 'react'
import { createClient, getStore } from '@mcloud/db/server'
import { getStorePlan } from '@mcloud/merchant/plans-server'

/** The store row by slug (any is_active state), or null. */
export const getStoreRow = getStore

export const getStoreTheme = cache(async (storeId: string) => {
    const supabase = await createClient()
    const { data } = await supabase
        .from('store_themes')
        .select('*')
        .eq('store_id', storeId)
        .single()
    return data
})

/** The store's effective plan (best active, unexpired subscription), once per request. */
export const getStorePlanCached = cache(async (storeId: string) => getStorePlan(storeId))
