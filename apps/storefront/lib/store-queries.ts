// Per-request deduplicated reads for a public store render. layout.tsx, generateMetadata
// and page.tsx all need the same rows; React cache() makes them one query each per request
// instead of one per caller. (Cross-request caching is a separate step.)
import { cache } from 'react'
import { createClient, getStore } from '@mcloud/db/server'

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

export const getLatestSubscription = cache(async (storeId: string) => {
    const supabase = await createClient()
    const { data } = await supabase
        .from('store_subscriptions')
        .select('plan, status')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    return data
})
