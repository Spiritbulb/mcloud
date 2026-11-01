// @route-kind: webhook — Safaricom posts unsigned; matched by CheckoutRequestID, then confirmed with Safaricom (STK Query) before settling
import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@mcloud/db/server'
import type { Json } from '@mcloud/db/types'
import { mpesaPaymentCovers } from '@mcloud/merchant/payments'
import { confirmDarajaPayment, settleDarajaOrder } from '@mcloud/merchant/daraja'
import { notifyPaidOrder } from '@/lib/merchant/notify-paid-order'

// Safaricom posts to this URL after STK push completes or fails.
// There is no signature, and the CheckoutRequestID is also handed to the buyer's browser,
// so the body is only a hint: an order is marked paid only after Safaricom itself confirms
// the transaction (STK Query). If that answer is not yet available the order stays pending
// and the buyer's status poll (`mpesa/status`) finishes the job.
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

        // Find the order by CheckoutRequestID stored in metadata.
        const { data: orders } = await supabase
            .from('orders')
            .select('id, status, metadata, store_id, order_number, total, currency')
            .eq('metadata->>daraja_checkout_request_id', CheckoutRequestID)
            .limit(1)

        const order = orders?.[0]
        if (!order) {
            console.warn('Daraja callback: no order found for CheckoutRequestID', CheckoutRequestID)
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        // Safaricom retries callbacks; a settled order is never processed twice.
        if (order.status === 'paid') {
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
        }

        if (ResultCode === 0) {
            // The body claims success. Extract what it says, but do not act on it yet.
            const items: Array<{ Name: string; Value: Json }> = CallbackMetadata?.Item ?? []
            const get = (name: string) => items.find(i => i.Name === name)?.Value

            const mpesaCode = get('MpesaReceiptNumber')
            const amount = get('Amount')
            const phone = get('PhoneNumber')
            const meta = (typeof order.metadata === 'object' && order.metadata ? order.metadata : {}) as Record<string, Json | undefined>

            if (!mpesaPaymentCovers(amount, order.total)) {
                console.error('Daraja callback: underpayment', { orderId: order.id, amount, total: order.total })
                await supabase.from('orders').update({
                    metadata: {
                        ...meta,
                        payment_status: 'underpaid',
                        mpesa_transaction_code: mpesaCode,
                        mpesa_amount_paid: amount,
                        mpesa_phone_used: phone,
                    },
                }).eq('id', order.id)
                return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
            }

            const outcome = await confirmDarajaPayment(supabase, order)
            if (outcome !== 'paid') {
                // Not confirmed (a forged callback, or Safaricom is still processing). Leave the
                // order pending; the status poll re-checks with Safaricom.
                console.warn('Daraja callback: success not confirmed by Safaricom', { orderId: order.id, outcome })
                return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
            }

            const settled = await settleDarajaOrder(supabase, order, { mpesaCode, amount, phone })
            if (settled) after(() => notifyPaidOrder(order))
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
