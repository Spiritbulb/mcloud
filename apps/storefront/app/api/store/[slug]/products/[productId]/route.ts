// @route-kind: public — public storefront read
// app/api/store/[slug]/products/[productId]/route.ts
// Minimal public product details for client components/external apps that need
// to display a product's name/price/image without going through the full
// commerce cart flow — same pattern as /info (service-role read, non-sensitive
// fields only). Simple GET, no CORS headers needed (unlike checkout/mpesa-code)
// since simple cross-origin GETs don't trigger a preflight.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { computeSeats, countTaken } from '@/lib/seats'

// TODO: tighten to specific origins once known cross-origin consumers are fixed
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const noStore = { 'Cache-Control': 'no-store', ...corsHeaders }

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string; productId: string }> },
) {
    const { slug, productId } = await params
    const admin = await createClient()

    const { data: store } = await admin
        .from('stores')
        .select('id, currency')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })
    }

    const { data: product } = await admin
        .from('products')
        .select('id, name, description, price, images, is_active, inventory_quantity, track_inventory')
        .eq('id', productId)
        .eq('store_id', store.id)
        .eq('is_active', true)
        .single()

    if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: noStore })
    }

    // Seats left for products that track inventory. See lib/seats.ts: stock is only
    // decremented for paid reach orders, so every other booking is subtracted here.
    let taken = 0
    if (product.track_inventory !== false) {
        const { data: items } = await admin
            .from('order_items')
            .select('quantity, order:orders!inner(store_id, status, source)')
            .eq('product_id', product.id)
            .eq('order.store_id', store.id)
        taken = countTaken((items ?? []) as unknown as Parameters<typeof countTaken>[0])
    }
    const { trackInventory, seatsLeft } = computeSeats({
        trackInventory: product.track_inventory,
        capacity: product.inventory_quantity,
        taken,
    })

    return NextResponse.json(
        {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: store.currency,
            image: Array.isArray(product.images) ? product.images[0] ?? null : null,
            trackInventory,
            taken,
            seatsLeft,
        },
        { headers: noStore },
    )
}