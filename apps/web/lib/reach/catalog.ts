/* eslint-disable @typescript-eslint/no-explicit-any -- the reach_* tables are not in the generated database types */
import { storefrontUrl } from '@mcloud/merchant/storefront-url'
import { buildVendorIndex, type ListedVendor, type VendorIndex } from './catalog-logic'
import { REACH_STORE_ID } from './store-config'
import type { VendorContext } from './vendor'

/**
 * Every vendor currently on the marketplace: active, switched on by its owner, and (for a
 * store-backed vendor) with a store that is still active.
 */
export async function loadListedVendors(db: any): Promise<ListedVendor[]> {
    const { data, error } = await db
        .from('reach_vendors')
        .select('id, name, store_id, stores(name, slug, custom_domain, is_active)')
        .eq('active', true)
        .eq('listed', true)
    if (error) throw new Error(error.message)

    return (data ?? [])
        .filter((v: any) => !v.store_id || v.stores?.is_active !== false)
        .map((v: any) => ({
            id: v.id,
            name: v.stores?.name ?? v.name,
            storeId: v.store_id ?? null,
            storeSlug: v.stores?.slug ?? null,
            storeUrl: v.stores?.slug ? storefrontUrl(v.stores.slug, v.stores.custom_domain) : null,
        }))
}

export async function loadVendorIndex(db: any): Promise<VendorIndex> {
    const vendors = await loadListedVendors(db)
    const { data: links, error } = await db.from('reach_product_vendors').select('product_id, vendor_id')
    if (error) throw new Error(error.message)
    return buildVendorIndex(vendors, links ?? [], REACH_STORE_ID)
}

/**
 * Of `productIds`, the ones this vendor sells. Used to show a vendor only their own lines of an
 * order that may also hold other vendors' items.
 */
export async function ownedProductIds(db: any, vendor: VendorContext, productIds: string[]): Promise<Set<string>> {
    if (!productIds.length) return new Set()
    if (vendor.storeId) {
        const { data, error } = await db.from('products').select('id').eq('store_id', vendor.storeId).in('id', productIds)
        if (error) throw new Error(error.message)
        return new Set((data ?? []).map((p: any) => p.id))
    }
    const { data, error } = await db
        .from('reach_product_vendors')
        .select('product_id')
        .eq('vendor_id', vendor.id)
        .in('product_id', productIds)
    if (error) throw new Error(error.message)
    return new Set((data ?? []).map((l: any) => l.product_id))
}
