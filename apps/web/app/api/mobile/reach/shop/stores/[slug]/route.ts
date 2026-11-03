// @route-kind: customer
// GET /api/mobile/reach/shop/stores/[slug] — one store's page in the Reach app (branding, areas,
// categories). 404 unless buyers may see the store (listed, approved, active).
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { listedVendorForSlug, loadShopStore } from '@/lib/reach/shop-store'
import { fail, requireReachShopper } from '../../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireReachShopper(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    try {
        const db = await reachDb()
        const vendor = await listedVendorForSlug(db, slug)
        const store = vendor ? await loadShopStore(db, vendor) : null
        if (!store) return fail(404, 'Store not found')
        return NextResponse.json({ store }, { headers: { 'Cache-Control': 'private, max-age=60' } })
    } catch (e) {
        return fail(500, e instanceof Error ? e.message : 'Could not load the store')
    }
}
