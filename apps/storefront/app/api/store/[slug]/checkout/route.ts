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

    // ── Idempotency: if this key already produced an order, return it unchanged. ──
    const { data: prior } = await admin
        .from('orders')
        .select('id, order_number')
        .eq('store_id', storeId)
        .eq('metadata->>idempotency_key', idempotencyKey)
        .maybeSingle()
    if (prior) {
        return NextResponse.json({ orderNumber: prior.order_number }, { headers: noStore })
    }

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

    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const total = subtotal // tax/shipping/discount are 0 today, matching prior behaviour

    // ── Customer upsert (guest, matched by mpesa_phone within the store). ─────────
    const phoneKey = guest.mpesaPhone?.trim() || null
    const emailKey = guest.email?.trim() || null
    const whatsapp = guest.whatsapp?.trim() || phoneKey

    let customerId: string
    // Match the guest by mpesa_phone within the store. .eq() can't take null, so
    // for a null phone (e.g. PayPal with no phone) match the null-phone row via
    // .is() — mirroring the prior maybeSingle lookup behaviour.
    const customerLookup = admin.from('customers').select('id').eq('store_id', storeId)
    const { data: existing } = await (
        phoneKey ? customerLookup.eq('mpesa_phone', phoneKey) : customerLookup.is('mpesa_phone', null)
    ).maybeSingle()

    if (existing) {
        customerId = existing.id
        await admin
            .from('customers')
            .update({ ...(emailKey && { email: emailKey }), whatsapp_number: whatsapp })
            .eq('id', customerId)
    } else {
        const { data: created, error: ce } = await admin
            .from('customers')
            .insert({
                store_id: storeId,
                mpesa_phone: phoneKey,
                email: emailKey,
                whatsapp_number: whatsapp,
                first_name: 'Guest',
                last_name: '',
            })
            .select('id')
            .single()
        if (ce || !created) {
            return NextResponse.json({ error: 'Could not start checkout' }, { status: 500, headers: noStore })
        }
        customerId = created.id
    }

    // ── Create the order (server-generated number, server-computed total). ────────
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`
    const { data: order, error: orderError } = await admin
        .from('orders')
        .insert({
            store_id: storeId,
            customer_id: customerId,
            order_number: orderNumber,
            status: 'pending',
            fulfillment_status: 'unfulfilled',
            subtotal,
            tax: 0,
            shipping: 0,
            discount: 0,
            total,
            currency: 'KES',
            customer_email: emailKey,
            customer_phone: phoneKey,
            source: 'storefront',
            metadata: {
                idempotency_key: idempotencyKey,
                payment_method: method === 'mpesa' ? 'MPESA' : 'PayPal',
                payment_status: 'pending',
                mpesa_phone: phoneKey,
                whatsapp_number: whatsapp,
            },
        })
        .select('id, order_number')
        .single()

    if (orderError || !order) {
        return NextResponse.json({ error: 'Could not create order' }, { status: 500, headers: noStore })
    }

    const { error: itemsError } = await admin.from('order_items').insert(
        items.map((i) => ({ order_id: order.id, ...i })),
    )
    if (itemsError) {
        return NextResponse.json({ error: 'Could not create order items' }, { status: 500, headers: noStore })
    }

    return NextResponse.json(
        { orderNumber: order.order_number, total },
        { status: 201, headers: noStore },
    )
}
