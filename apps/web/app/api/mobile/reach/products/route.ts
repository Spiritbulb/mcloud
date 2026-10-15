// @route-kind: mobile
// GET /api/mobile/reach/products?area=<areaId> — products of the approved stores that deliver to that area
// (all approved stores when no area is given), with vendor, stock and buyer price
import { NextResponse, type NextRequest } from 'next/server'
import { loadVendorIndex } from '@/lib/reach/catalog'
import { vendorForProduct } from '@/lib/reach/catalog-logic'
import { reachDb } from '@/lib/reach/db'
import { REACH_STORE_ID, priceForBuyer } from '@/lib/reach/store-config'
import { fail, requireMobileUser } from '../../_lib'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const db = await reachDb()

    // The area the buyer is shopping from (?area=<id>): only vendors that deliver there are shown.
    const areaId = req.nextUrl.searchParams.get('area')
    if (areaId && !UUID_RE.test(areaId)) return fail(400, 'Invalid area')

    let index
    try {
        index = await loadVendorIndex(db, areaId)
    } catch (e) {
        return fail(500, e instanceof Error ? e.message : 'Could not load vendors')
    }

    // Every active product of a listed store, plus the marketplace store's own (legacy) products.
    const storeIds = [...index.byStore.keys(), REACH_STORE_ID]
    const { data: products, error } = await db
        .from('products')
        .select('id, store_id, name, price, images, description, inventory_quantity, track_inventory')
        .in('store_id', storeIds)
        .eq('is_active', true)
        .order('name')
    if (error) return fail(500, error.message)

    const shaped = (products ?? [])
        .map((p: any) => ({ p, vendor: vendorForProduct(p, index) }))
        .filter((x: any) => x.vendor) // not on the marketplace: unlisted store, or an unassigned legacy product
        .map(({ p, vendor }: any) => {
            const tracked = p.track_inventory ?? true
            const qty = p.inventory_quantity ?? 0
            return {
                id: p.id,
                name: p.name,
                price: Number(p.price),
                buyerPrice: priceForBuyer(Number(p.price), REACH_STORE_ID),
                images: Array.isArray(p.images) ? p.images : [],
                description: p.description ?? null,
                inStock: !tracked || qty > 0,
                stockLeft: tracked ? qty : null,
                vendorId: vendor.id,
                vendorName: vendor.name,
                storeSlug: vendor.storeSlug,
                storeUrl: vendor.storeUrl,
            }
        })

    return NextResponse.json({ products: shaped }, { headers: { 'Cache-Control': 'no-store' } })
}