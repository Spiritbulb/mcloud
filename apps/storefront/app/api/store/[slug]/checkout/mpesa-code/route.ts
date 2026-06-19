// app/api/store/[slug]/checkout/mpesa-code/route.ts
// Attaches a customer-submitted M-Pesa transaction code to an already-created
// order (the second half of the manual M-Pesa flow). Server-side so the browser
// no longer writes to orders with the anon key. Scoped to the store + order_number;
// merges into metadata without trusting any other order field from the client.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'

const noStore = { 'Cache-Control': 'no-store' }

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    let body: { orderNumber?: unknown; code?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: noStore })
    }
    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber : ''
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!orderNumber || !code) {
        return NextResponse.json({ error: 'orderNumber and code are required' }, { status: 400, headers: noStore })
    }

    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const admin = await createClient()
    const { data: order } = await admin
        .from('orders')
        .select('id, metadata')
        .eq('store_id', storeId)
        .eq('order_number', orderNumber)
        .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404, headers: noStore })

    const prevMeta = (order.metadata && typeof order.metadata === 'object' ? order.metadata : {}) as Record<string, unknown>
    await admin
        .from('orders')
        .update({
            metadata: {
                ...prevMeta,
                payment_method: 'MPESA',
                payment_status: 'submitted',
                mpesa_transaction_code: code,
            },
        })
        .eq('id', order.id)

    return NextResponse.json({ ok: true }, { headers: noStore })
}
