import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getStoreManagerUserIds } from '@/lib/merchant/store-managers'
import { sendPushToUsers } from '@/lib/merchant/send-push'

// Safaricom posts to this URL after STK push completes or fails.
// No auth header — Safaricom doesn't send one. We validate by matching
// CheckoutRequestID to an order we created.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const result = body?.Body?.stkCallback

        if (!result) {
            console.warn('Daraja callback: unexpected payload shape', body)
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        const { ResultCode, CheckoutRequestID, CallbackMetadata } = result

        // Always ack Safaricom immediately regardless of outcome
        const supabase = await createClient()

        // Find the order by CheckoutRequestID stored in metadata. Widened select —
        // push needs store_id/order_number/total/currency, not just id/metadata.
        const { data: orders } = await supabase
            .from('orders')
            .select('id, metadata, store_id, order_number, total, currency')
            .eq('metadata->>daraja_checkout_request_id', CheckoutRequestID)
            .limit(1)

        const order = orders?.[0]
        if (!order) {
            console.warn('Daraja callback: no order found for CheckoutRequestID', CheckoutRequestID)
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        if (ResultCode === 0) {
            // Payment succeeded — extract M-PESA receipt number from metadata items
            const items: Array<{ Name: string; Value: any }> = CallbackMetadata?.Item ?? []
            const get = (name: string) => items.find(i => i.Name === name)?.Value

            const mpesaCode = get('MpesaReceiptNumber')
            const amount = get('Amount')
            const phone = get('PhoneNumber')

            await supabase.from('orders').update({
                status: 'paid',
                fulfillment_status: 'unfulfilled',
                metadata: {
                    ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}),
                    payment_status: 'completed',
                    mpesa_transaction_code: mpesaCode,
                    mpesa_amount_paid: amount,
                    mpesa_phone_used: phone,
                },
            }).eq('id', order.id)

            // Notify store managers of the new paid order. Best-effort — payment
            // is already recorded above regardless of whether this succeeds.
            // Needs the store's slug (not just id) for the notification's tap
            // target — resolve it here since `order` only carries store_id.
            void (async () => {
                const { data: store } = await supabase
                    .from('stores')
                    .select('slug')
                    .eq('id', order.store_id)
                    .single()
                if (!store) return
                const userIds = await getStoreManagerUserIds(order.store_id)
                if (!userIds.length) return
                await sendPushToUsers(userIds, {
                    title: 'New order',
                    body: `${order.order_number} · ${order.currency} ${Number(order.total).toLocaleString()}`,
                    data: { storeSlug: store.slug, type: 'new_order', orderId: order.id },
                })
            })().catch(() => {})
        } else {
            // Payment failed or cancelled
            await supabase.from('orders').update({
                metadata: {
                    ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}),
                    payment_status: 'failed',
                    daraja_result_code: ResultCode,
                    daraja_result_desc: result.ResultDesc,
                },
            }).eq('id', order.id)
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })

    } catch (error) {
        console.error('Daraja callback error:', error)
        // Still ack — Safaricom will retry if we return an error
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }
}