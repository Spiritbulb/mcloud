// PATCH  /api/mobile/stores/[slug]/products/[productId] — update (owner/admin)
// DELETE /api/mobile/stores/[slug]/products/[productId] — delete (owner/admin)
import { NextResponse, type NextRequest } from 'next/server'
import { deleteProduct, updateProduct } from '@/lib/merchant/products'
import { fail, requireMobileUser } from '../../../../_lib'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; productId: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug, productId } = await params
    const body = (await req.json().catch(() => null)) as
        | { name?: string; price?: number; compare_at_price?: number | null; inventory_quantity?: number | null; track_inventory?: boolean; is_active?: boolean; images?: string[]; description?: string | null; sku?: string | null; barcode?: string | null }
        | null
    if (!body) return fail(400, 'Invalid JSON body')

    const result = await updateProduct(slug, auth.user.id, productId, body)
    if (result.error) return fail(result.status, result.error)
    return NextResponse.json({ product: result.data })
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; productId: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug, productId } = await params
    const result = await deleteProduct(slug, auth.user.id, productId)
    if (result.error) return fail(result.status, result.error)
    return NextResponse.json({ success: true })
}
