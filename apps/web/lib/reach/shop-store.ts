/* eslint-disable @typescript-eslint/no-explicit-any -- the reach_* tables are not in the generated database types */
// One store's page in the Reach app: its branding, the areas it delivers to, its collections and
// products. Only stores buyers may see (listed, approved, active) are ever returned.
import { areaLabel } from '@mcloud/merchant/reach-areas'
import { loadAreas, loadListedVendors } from './catalog'
import { BUYER_PRODUCT_COLS, toBuyerProduct, type ListedVendor } from './catalog-logic'

export interface ShopStore {
    slug: string
    name: string
    logoUrl: string | null
    bannerUrl: string | null
    accent: string | null
    description: string | null
    areas: string[]
    categories: { slug: string; name: string }[]
}

/** The listed vendor behind a store slug, or null when buyers may not see that store. */
export async function listedVendorForSlug(db: any, slug: string): Promise<ListedVendor | null> {
    const vendors = await loadListedVendors(db)
    return vendors.find((v) => v.storeSlug === slug && v.storeId) ?? null
}

export async function loadShopStore(db: any, vendor: ListedVendor): Promise<ShopStore | null> {
    const [{ data: store }, { data: collections }, areas] = await Promise.all([
        db.from('stores').select('slug, name, logo_url, description, settings').eq('id', vendor.storeId).maybeSingle(),
        db
            .from('collections')
            .select('slug, name')
            .eq('store_id', vendor.storeId)
            .eq('is_active', true)
            .order('position')
            .order('name'),
        loadAreas(db),
    ])
    if (!store) return null
    const settings = (store.settings ?? {}) as Record<string, unknown>
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)
    return {
        slug: store.slug,
        name: store.name,
        logoUrl: store.logo_url ?? null,
        bannerUrl: str(settings.heroImage),
        accent: str(settings.primaryColor),
        description: store.description ?? null,
        areas: vendor.areaIds.map((id) => areaLabel(areas, id)).filter(Boolean),
        categories: (collections ?? []).map((c: any) => ({ slug: c.slug, name: c.name })),
    }
}

export async function loadShopStoreProducts(
    db: any,
    vendor: ListedVendor,
    filter: { q?: string | null; category?: string | null },
) {
    let ids: string[] | null = null
    if (filter.category) {
        const { data } = await db
            .from('collections')
            .select('collection_products(product_id)')
            .eq('store_id', vendor.storeId)
            .eq('slug', filter.category)
            .eq('is_active', true)
            .maybeSingle()
        ids = (data?.collection_products ?? []).map((cp: any) => cp.product_id)
        if (!ids!.length) return []
    }

    let query = db.from('products').select(BUYER_PRODUCT_COLS).eq('store_id', vendor.storeId).eq('is_active', true)
    if (ids) query = query.in('id', ids)
    const q = filter.q?.trim()
    // Escape ilike wildcards so the search is literal.
    if (q) query = query.ilike('name', `%${q.slice(0, 80).replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    const { data, error } = await query.order('name').limit(200)
    if (error) throw new Error(error.message)
    return (data ?? []).map((p: any) => toBuyerProduct(p, vendor))
}
