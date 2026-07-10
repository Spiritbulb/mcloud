// app/api/store/[slug]/checkout/route.ts
// Server-authoritative checkout. Replaces the browser creating customers/orders/
// order_items directly with the anon key — which let a client set ANY price/total
// (pay KES 1 for a KES 50k cart) and forge order numbers.
//
// The client now sends only { productId, variantId, quantity } per line plus guest
// contact details and an idempotency key. This route:
//   - recomputes every price from the products/product_variants records (the only
//     trustworthy source) and computes the order total itself;
//   - generates the order_number server-side;
//   - dedupes on the client's idempotency key (stored in orders.metadata) so a
//     retry/double-submit returns the SAME order instead of creating a new one.
//
// Guest checkout: no auth required (matches today's behaviour). The customer is
// upserted by mpesa_phone within the store, exactly as before.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'
import { createOrderWithPayment, type OrderLineInput } from '@/lib/orders'

const noStore = { 'Cache-Control': 'no-store' }

interface LineInput {
    productId: string
    variantId?: string | null
    quantity: number
}
interface CheckoutBody {
    lines: LineInput[]
    guest: { mpesaPhone?: string; email?: string; whatsapp?: string }
    paymentMethod: 'mpesa' | 'paypal'
    idempotencyKey: string
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params

    let body: CheckoutBody
    try {
        body = (await req.json()) as CheckoutBody
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: noStore })
    }

    const { lines, guest = {}, paymentMethod, idempotencyKey } = body
    if (!Array.isArray(lines) || lines.length === 0) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400, headers: noStore })
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400, headers: noStore })
    }
    const method = paymentMethod === 'paypal' ? 'paypal' : 'mpesa'

    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const admin = await createClient()

    // ── Price authority: recompute every line from the real product/variant rows. ──
    // Fetch the products + variants referenced, scoped to this store, then price the
    // cart server-side. Any client-sent price is ignored entirely.
    const productIds = [...new Set(lines.map((l) => l.productId).filter(Boolean))]
    const variantIds = [...new Set(lines.map((l) => l.variantId).filter((v): v is string => !!v))]

    const { data: products } = await admin
        .from('products')
        .select('id, name, price, images')
        .eq('store_id', storeId)
        .in('id', productIds)
    const productMap = new Map((products ?? []).map((p) => [p.id, p]))

    const variantMap = new Map<string, { id: string; product_id: string; name: string; price: number; image_url: string | null }>()
    if (variantIds.length) {
        const { data: variants } = await admin
            .from('product_variants')
            .select('id, product_id, name, price, image_url')
            .in('id', variantIds)
        for (const v of variants ?? []) variantMap.set(v.id, v)
    }

    const items: {
        product_id: string
        variant_id: string | null
        quantity: number
        price: number
        total: number
        title: string
        variant_title: string | null
        image_url: string | null
    }[] = []

    for (const line of lines) {
        const qty = Math.max(1, Math.floor(Number(line.quantity) || 0))
        const product = productMap.get(line.productId)
        if (!product) {
            return NextResponse.json(
                { error: 'A product in your cart is no longer available.' },
                { status: 409, headers: noStore },
            )
        }
        // A variant is only honoured if it belongs to this product; otherwise we
        // price off the product. (The old client sent variantId === productId when
        // there was no real variant.)
        const variant =
            line.variantId && line.variantId !== line.productId ? variantMap.get(line.variantId) : undefined
        if (line.variantId && line.variantId !== line.productId && (!variant || variant.product_id !== product.id)) {
            return NextResponse.json(
                { error: 'A selected option is no longer available.' },
                { status: 409, headers: noStore },
            )
        }

        const price = Number(variant?.price ?? product.price)
        const firstImage = Array.isArray(product.images) ? (product.images[0] as string | undefined) : undefined
        items.push({
            product_id: product.id,
            variant_id: variant?.id ?? null,
            quantity: qty,
            price,
            total: price * qty,
            title: product.name,
            variant_title: variant?.name ?? null,
            image_url: variant?.image_url ?? firstImage ?? null,
        })
    }

    const orderLines: OrderLineInput[] = items.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
        price: i.price,
        title: i.title,
        variant_title: i.variant_title,
        image_url: i.image_url,
    }))

    const result = await createOrderWithPayment({
        storeId,
        guest: { mpesaPhone: guest.mpesaPhone, email: guest.email, whatsapp: guest.whatsapp },
        lines: orderLines,
        paymentMethod: method,
        idempotencyKey,
        source: 'storefront',
    })
    if (result.error !== null) {
        return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore })
    }
    return NextResponse.json(
        { orderNumber: result.orderNumber, total: result.total },
        { status: 201, headers: noStore },
    )
}
