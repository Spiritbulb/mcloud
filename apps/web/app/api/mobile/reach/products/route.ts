// GET /api/mobile/reach/products — active Reach products with vendor, stock and buyer price
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { REACH_STORE_ID, priceForBuyer } from '@/lib/reach/store-config'
import { fail, requireMobileUser } from '../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const db = await reachDb()
    const { data: products, error } = await db
        .from('products')
        .select('id, name, price, images, description, inventory_quantity, track_inventory')
        .eq('store_id', REACH_STORE_ID)
        .eq('is_active', true)
        .order('name')
    if (error) return fail(500, error.message)

    const { data: links, error: vErr } = await db
        .from('reach_product_vendors')
        .select('product_id, vendor_id, reach_vendors(name)')
    if (vErr) return fail(500, vErr.message)

    const vendorByProduct = new Map<string, { id: string; name: string }>(
        (links ?? []).map((v: any) => [v.product_id, { id: v.vendor_id, name: v.reach_vendors?.name ?? 'Unassigned' }]),
    )

    const shaped = (products ?? []).map((p: any) => {
        const vendor = vendorByProduct.get(p.id)
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
            vendorId: vendor?.id ?? null,
            vendorName: vendor?.name ?? 'Unassigned',
        }
    })

    return NextResponse.json({ products: shaped }, { headers: { 'Cache-Control': 'no-store' } })
}