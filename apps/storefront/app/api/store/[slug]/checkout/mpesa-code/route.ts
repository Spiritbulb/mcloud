// app/api/store/[slug]/checkout/mpesa-code/route.ts
// Attaches a customer-submitted M-Pesa transaction code to an already-created
// order (the second half of the manual M-Pesa flow). Server-side so the browser
// no longer writes to orders with the anon key. Scoped to the store + order_number;
// merges into metadata without trusting any other order field from the client.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'
import { getStoreManagerUserIds } from '@/lib/merchant/store-managers'
import { sendPushToUsers } from '@/lib/merchant/send-push'


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

const noStore = { 'Cache-Control': 'no-store', ...corsHeaders }

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
}


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
        .select('id, metadata, total, currency')
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

    // Notify store managers that a code needs verification — this is an action
    // prompt, not an informational "new order" push, since nothing is confirmed
    // yet. Best-effort, never blocks the customer-facing response.
    void (async () => {
        const userIds = await getStoreManagerUserIds(storeId)
        if (!userIds.length) return
        await sendPushToUsers(userIds, {
            title: 'Payment code submitted',
            body: `${orderNumber} · ${order.currency} ${Number(order.total).toLocaleString()}, verify M-Pesa code`,
            data: { storeSlug: slug, type: 'mpesa_code_submitted', orderId: order.id },
        })
    })().catch(() => {})

    return NextResponse.json({ ok: true }, { headers: noStore })
}