// Which Reach vendor sells a product. Pure so the rule has one tested home; the database
// loading lives in catalog.ts.
//
// Two kinds of vendor exist:
//   - store-backed: a merchant's own store, listed from its dashboard. Every active product of that
//     store is sold by that vendor.
//   - legacy: hand-made vendors whose products sit in the marketplace's own store and are assigned
//     one by one in reach_product_vendors.

export interface ListedVendor {
    id: string
    /** Display name: the store's name for a store-backed vendor. */
    name: string
    storeId: string | null
    storeSlug: string | null
    storeUrl: string | null
}

export interface VendorIndex {
    /** Only vendors that are active AND listed (and whose store is active). */
    byStore: Map<string, ListedVendor>
    byId: Map<string, ListedVendor>
    /** Legacy assignments, product id -> vendor id. */
    legacyLinks: Map<string, string>
    marketplaceStoreId: string
}

export function buildVendorIndex(
    vendors: ListedVendor[],
    legacyLinks: { product_id: string; vendor_id: string }[],
    marketplaceStoreId: string,
): VendorIndex {
    return {
        byStore: new Map(vendors.filter((v) => v.storeId).map((v) => [v.storeId!, v])),
        byId: new Map(vendors.map((v) => [v.id, v])),
        legacyLinks: new Map(legacyLinks.map((l) => [l.product_id, l.vendor_id])),
        marketplaceStoreId,
    }
}

/** The listed vendor selling this product, or null when it is not on the marketplace. */
export function vendorForProduct(
    product: { id: string; store_id: string },
    index: VendorIndex,
): ListedVendor | null {
    if (product.store_id === index.marketplaceStoreId) {
        const vendorId = index.legacyLinks.get(product.id)
        return (vendorId && index.byId.get(vendorId)) || null
    }
    return index.byStore.get(product.store_id) ?? null
}
