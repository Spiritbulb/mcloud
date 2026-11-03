// @route-kind: customer
// GET /api/mobile/reach/shop/stores/[slug]/products?q=&category= — that store's products at buyer
// prices, optionally searched by name or filtered to one collection (by slug).
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { listedVendorForSlug, loadShopStoreProducts } from '@/lib/reach/shop-store'
import { fail, requireReachShopper } from '../../../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireReachShopper(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const sp = req.nextUrl.searchParams
    try {
        const db = await reachDb()
        const vendor = await listedVendorForSlug(db, slug)
        if (!vendor) return fail(404, 'Store not found')
        const products = await loadShopStoreProducts(db, vendor, { q: sp.get('q'), category: sp.get('category') })
        return NextResponse.json({ products }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (e) {
        return fail(500, e instanceof Error ? e.message : 'Could not load products')
    }
}
