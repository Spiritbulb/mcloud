// @route-kind: mobile
// GET /api/mobile/reach/vendor/products — the logged-in vendor's own products (their whole store, or their assigned ones)
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { vendorFor } from '@/lib/reach/vendor'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const vendor = await vendorFor(auth.user.id)
    if (!vendor) return fail(403, 'Not a vendor')

    const db = await reachDb()
    let query = db
        .from('products')
        .select('id, name, price, description, inventory_quantity, track_inventory, images, is_active')
        .order('name')

    if (vendor.storeId) {
        // A store-backed vendor manages every product of its store.
        query = query.eq('store_id', vendor.storeId)
    } else {
        const { data: links, error: linkErr } = await db
            .from('reach_product_vendors')
            .select('product_id')
            .eq('vendor_id', vendor.id)
        if (linkErr) return fail(500, linkErr.message)
        const productIds = (links ?? []).map((l: any) => l.product_id)
        if (!productIds.length) return NextResponse.json({ products: [] })
        query = query.in('id', productIds)
    }

    const { data, error } = await query
    if (error) return fail(500, error.message)

    const products = (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        description: p.description ?? null,
        inventoryQuantity: p.inventory_quantity ?? 0,
        trackInventory: p.track_inventory ?? true,
        images: Array.isArray(p.images) ? p.images : [],
        isActive: p.is_active,
    }))

    return NextResponse.json({ products }, { headers: { 'Cache-Control': 'no-store' } })
}