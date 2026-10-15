/* eslint-disable @typescript-eslint/no-explicit-any -- the reach_* tables are not in the generated database types */
import { storefrontUrl } from '@mcloud/merchant/storefront-url'
import type { Area } from '@mcloud/merchant/reach-areas'
import { isSellable } from '@mcloud/merchant/reach-approval'
import { buildVendorIndex, vendorDelivers, type ListedVendor, type VendorIndex } from './catalog-logic'
import { REACH_STORE_ID } from './store-config'
import type { VendorContext } from './vendor'

/**
 * Every vendor buyers may currently see: active, switched on by its owner, approved by Reach, placed
 * in an area (legacy vendors excepted) and, for a store-backed vendor, with a store that is still
 * active. Pass `areaId` to keep only the vendors that deliver there.
 */
export async function loadListedVendors(db: any, areaId?: string | null): Promise<ListedVendor[]> {
    const { data, error } = await db
        .from('reach_vendors')
        .select(
            'id, name, store_id, area_id, listed, active, approval_status, stores(name, slug, custom_domain, is_active), reach_vendor_areas(area_id)',
        )
        .eq('active', true)
        .eq('listed', true)
        .eq('approval_status', 'approved')
    if (error) throw new Error(error.message)

    const vendors: ListedVendor[] = (data ?? [])
        .filter((v: any) => !v.store_id || v.stores?.is_active !== false)
        .filter((v: any) => isSellable({ ...v, legacy: !v.store_id }))
        .map((v: any) => ({
            id: v.id,
            name: v.stores?.name ?? v.name,
            storeId: v.store_id ?? null,
            storeSlug: v.stores?.slug ?? null,
            storeUrl: v.stores?.slug ? storefrontUrl(v.stores.slug, v.stores.custom_domain) : null,
            areaIds: [...new Set<string>([v.area_id, ...(v.reach_vendor_areas ?? []).map((a: any) => a.area_id)].filter(Boolean))],
            legacy: !v.store_id,
        }))
    if (!areaId) return vendors

    const areas = await loadAreas(db)
    return vendors.filter((v) => vendorDelivers(v, areas, areaId))
}

export async function loadAreas(db: any): Promise<Area[]> {
    const { data, error } = await db
        .from('reach_areas')
        .select('id, parent_id, name, slug, lat, lng, active')
        .eq('active', true)
        .order('sort')
        .order('name')
    if (error) throw new Error(error.message)
    return data ?? []
}

export async function loadVendorIndex(db: any, areaId?: string | null): Promise<VendorIndex> {
    const vendors = await loadListedVendors(db, areaId)
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
