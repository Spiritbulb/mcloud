import { areaLabel } from '@mcloud/merchant/reach-areas'
import type { ApprovalStatus } from '@mcloud/merchant/reach-approval'
import { storefrontUrl } from '@mcloud/merchant/storefront-url'
import { loadAreas } from './catalog'
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
    /** Reach's decision on the listing request. Buyers only see approved stores. */
    approvalStatus: ApprovalStatus
    /** Why a request was sent back (or a store paused). */
    reviewNote: string | null
    areaId: string | null
    /** "Westlands, Nairobi" */
    areaName: string | null
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
            'reach_courier_keys!inner(active), reach_vendors!inner(id, name, active, listed, approval_status, review_note, area_id, store_id, stores(name, slug, custom_domain))',
        )
        .eq('user_id', userId)
        .eq('reach_courier_keys.active', true)
        .eq('reach_vendors.active', true)
        .limit(1)
        .maybeSingle()

    const v = data?.reach_vendors
    if (!v) return null
    const store = v.stores
    const areaName = v.area_id ? areaLabel(await loadAreas(db).catch(() => []), v.area_id) || null : null
    return {
        id: v.id,
        name: store?.name ?? v.name,
        storeId: v.store_id ?? null,
        storeSlug: store?.slug ?? null,
        storeUrl: store?.slug ? storefrontUrl(store.slug, store.custom_domain) : null,
        listed: !!v.listed,
        approvalStatus: v.approval_status ?? 'draft',
        reviewNote: v.review_note ?? null,
        areaId: v.area_id ?? null,
        areaName,
    }
}

export async function vendorIdFor(userId: string): Promise<string | null> {
    return (await vendorFor(userId))?.id ?? null
}
