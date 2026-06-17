// GET  /api/mobile/stores/[slug]/products — list products
// POST /api/mobile/stores/[slug]/products — create a product (owner/admin)
import { NextResponse, type NextRequest } from 'next/server'
import { createProduct, listProducts } from '@/lib/merchant/products'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const result = await listProducts(slug, auth.user.id)
    if (result.error === 'not_found') return fail(404, 'Store not found')
    if (result.error === 'forbidden') return fail(403, 'No access to this store')
    return NextResponse.json({ products: result.data, role: result.role }, {
        headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' },
    })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const body = (await req.json().catch(() => null)) as
        | { name?: string; price?: number; compare_at_price?: number | null; inventory_quantity?: number | null; track_inventory?: boolean; description?: string | null; sku?: string | null; barcode?: string | null }
        | null
    if (!body) return fail(400, 'Invalid JSON body')

    const result = await createProduct(slug, auth.user.id, body)
    if (result.error) return fail(result.status, result.error)
    return NextResponse.json({ product: result.data }, { status: 201 })
}
