// PATCH /api/mobile/reach/vendor/products/[productId] — vendor edits their own product
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { vendorIdFor } from '@/lib/reach/vendor'
import { fail, requireMobileUser } from '../../../../_lib'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const vendorId = await vendorIdFor(auth.user.id)
    if (!vendorId) return fail(403, 'Not a vendor')

    const { productId } = await params
    const patch = (await req.json().catch(() => null)) as {
        price?: number
        description?: string
        inventoryQuantity?: number
        trackInventory?: boolean
        images?: string[]
    } | null
    if (!patch) return fail(400, 'Invalid JSON body')

    const db = await reachDb()
    const { error } = await db.rpc('reach_update_vendor_product', {
        p_vendor_id: vendorId, // from the token, never from the app
        p_product_id: productId,
        p_price: patch.price ?? null,
        p_description: patch.description ?? null,
        p_inventory_quantity: patch.inventoryQuantity ?? null,
        p_track_inventory: patch.trackInventory ?? null,
        p_images: patch.images ?? null,
    })
    if (error) return fail(400, error.message)

    return NextResponse.json({ success: true })
}