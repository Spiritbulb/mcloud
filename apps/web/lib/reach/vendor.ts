import { storefrontUrl } from '@mcloud/merchant/storefront-url'
import { reachDb } from './db'

export interface VendorContext {
    id: string
    name: string
    /** The mcloud store behind this vendor. null for the legacy hand-linked vendors. */
    storeId: string | null
    storeSlug: string | null
    storeUrl: string | null
    /** Whether the owner has the store switched on in the marketplace. */
    listed: boolean
}

/**
 * The vendor a logged-in user manages, or null if they aren't one.
 *
 * reach_vendor_members is filled by reach_confirm_vendor when they enter a valid store key. The
 * key behind the membership must still be active, and the vendor too: that is what makes
 * "revoke key" on the store dashboard cut access immediately, with no cleanup step.
 */
export async function vendorFor(userId: string): Promise<VendorContext | null> {
    const db = await reachDb()
    const { data } = await db
        .from('reach_vendor_members')
        .select(
            'reach_courier_keys!inner(active), reach_vendors!inner(id, name, active, listed, store_id, stores(name, slug, custom_domain))',
        )
        .eq('user_id', userId)
        .eq('reach_courier_keys.active', true)
        .eq('reach_vendors.active', true)
        .limit(1)
        .maybeSingle()

    const v = data?.reach_vendors
    if (!v) return null
    const store = v.stores
    return {
        id: v.id,
        name: store?.name ?? v.name,
        storeId: v.store_id ?? null,
        storeSlug: store?.slug ?? null,
        storeUrl: store?.slug ? storefrontUrl(store.slug, store.custom_domain) : null,
        listed: !!v.listed,
    }
}

export async function vendorIdFor(userId: string): Promise<string | null> {
    return (await vendorFor(userId))?.id ?? null
}
