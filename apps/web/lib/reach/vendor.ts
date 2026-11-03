import { areaLabel } from '@mcloud/merchant/reach-areas'
import type { ApprovalStatus } from '@mcloud/merchant/reach-approval'
import { storefrontUrl } from '@mcloud/merchant/storefront-url'
import { requireStoreAccessById } from '@mcloud/merchant/stores'
import { loadAreas } from './catalog'
import { reachDb } from './db'
import { membershipActive } from './shop-logic'

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
 * reach_vendor_members is filled by reach_confirm_vendor when they enter a valid store key, or by
 * reach_join_as_owner (no key) when a store owner creates or lists their store from the app. A key
 * member needs the key to still be active, an owner-member needs to still manage the store, and the
 * vendor must be active: so "revoke key" and "remove from org" both cut access immediately, with no
 * cleanup step (see membershipActive).
 */
export async function vendorFor(userId: string): Promise<VendorContext | null> {
    const db = await reachDb()
    const { data } = await db
        .from('reach_vendor_members')
        .select(
            'key_id, reach_courier_keys(active), reach_vendors!inner(id, name, active, listed, approval_status, review_note, area_id, store_id, stores(name, slug, custom_domain))',
        )
        .eq('user_id', userId)
        .eq('reach_vendors.active', true)
        .limit(1)
        .maybeSingle()

    const v = data?.reach_vendors
    if (!v) return null
    const hasStoreAccess =
        !data.key_id && !!v.store_id && (await requireStoreAccessById(v.store_id, userId)).error === null
    if (!membershipActive({ keyId: data.key_id ?? null, keyActive: data.reach_courier_keys?.active ?? null, hasStoreAccess })) return null
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
