// GET  /api/mobile/stores/[slug]/orders — list recent orders
// POST /api/mobile/stores/[slug]/orders — create a manual (in-person/cash) order
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { listOrders, shapeOrder } from '@/lib/merchant/store-sections'
import { requireStoreAccess, canManage } from '@/lib/merchant/stores'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const result = await listOrders(slug, auth.user.id)
    if (result.error === 'not_found') return fail(404, 'Store not found')
    if (result.error === 'forbidden') return fail(403, 'No access to this store')
    return NextResponse.json({ orders: result.data }, { headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=40' } })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const access = await requireStoreAccess(slug, auth.user.id)
    if (access.error === 'not_found') return fail(404, 'Store not found')
    if (access.error || !canManage(access.role)) return fail(403, 'Not authorized')

    const body = (await req.json().catch(() => null)) as {
        lines?: { product_id: string; quantity: number; price: number }[]
        customer_phone?: string | null
        customer_email?: string | null
    } | null

    if (!body?.lines?.length) return fail(400, 'lines is required')

    const supabase = await createClient()

    type ProductRow = { id: string; name: string; images?: string[] | null }

    // Resolve products to get titles and images for order_items
    const productIds = body.lines.map((l) => l.product_id)
    const { data: products } = (await supabase
        .from('products')
        .select('id, name, images')
        .in('id', productIds)
        .eq('store_id', access.storeId)) as { data: ProductRow[] | null }

    if (!products?.length) return fail(400, 'No valid products found')
    const productMap = Object.fromEntries(products.map((p) => [p.id, p])) as Record<string, ProductRow>

    const total = body.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
    const currency = 'KES'

    // Generate order number: manual- + timestamp suffix
    const orderNumber = `MNL-${Date.now().toString(36).toUpperCase()}`

    const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
            store_id: access.storeId,
            order_number: orderNumber,
            status: 'paid',
            fulfillment_status: 'unfulfilled',
            total,
            currency,
            customer_phone: body.customer_phone ?? null,
            customer_email: body.customer_email ?? null,
        })
        .select('id')
        .single()

    if (orderErr || !order) return fail(500, orderErr?.message ?? 'Could not create order')

    const items = body.lines
        .filter((l) => productMap[l.product_id])
        .map((l) => ({
            order_id: order.id,
            product_id: l.product_id,
            title: productMap[l.product_id].name,
            quantity: l.quantity,
            price: l.price,
            total: l.price * l.quantity,
            image_url: productMap[l.product_id].images?.[0] ?? null,
        }))

    if (items.length) await supabase.from('order_items').insert(items)

    const ORDER_COLS = 'id, order_number, status, fulfillment_status, total, currency, customer_phone, customer_email, created_at, order_items(id, title, quantity, price, image_url)'
    const { data: full } = await supabase.from('orders').select(ORDER_COLS).eq('id', order.id).single()

    return NextResponse.json({ order: full ? shapeOrder(full) : null }, { status: 201 })
}
