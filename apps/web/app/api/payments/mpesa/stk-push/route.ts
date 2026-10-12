// @route-kind: public — buyer-initiated; order, store, phone and amount are verified against the stored order
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { mpesaAmountDue, normalizeKenyanPhone, orderIsPayable } from '@mcloud/merchant/payments'

const DARAJA_BASE = process.env.DARAJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

async function getDarajaToken(consumerKey: string, consumerSecret: string): Promise<string> {
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${credentials}` },
    })
    if (!res.ok) throw new Error(`Daraja auth failed: ${res.status}`)
    const data = await res.json()
    return data.access_token
}

// A second prompt for the same order inside this window is refused, so the route cannot be
// used to spam a phone with payment prompts.
const REPUSH_WINDOW_MS = 60_000

export async function POST(req: NextRequest) {
    try {
        // `amount` from the client is deliberately ignored: the charge is the stored order total.
        const { storeSlug, phone, orderId } = await req.json()

        const normalizedPhone = normalizeKenyanPhone(phone)
        if (typeof storeSlug !== 'string' || typeof orderId !== 'string' || !orderId || !normalizedPhone) {
            return NextResponse.json({ success: false, error: 'Missing or invalid fields' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', storeSlug)
            .single()

        if (!store) return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 })

        // `orderId` is the order NUMBER the checkout returned; scoping by store stops one
        // store's credentials being used to charge another store's order.
        const { data: order } = await supabase
            .from('orders')
            .select('id, status, total, customer_phone, metadata')
            .eq('store_id', store.id)
            .eq('order_number', orderId)
            .maybeSingle()

        if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
        if (!orderIsPayable(order)) {
            return NextResponse.json({ success: false, error: 'Order is not awaiting payment' }, { status: 409 })
        }
        // Only the number the order was placed with may be prompted.
        if (normalizeKenyanPhone(order.customer_phone) !== normalizedPhone) {
            return NextResponse.json({ success: false, error: 'Phone does not match the order' }, { status: 403 })
        }
        const orderMeta = (typeof order.metadata === 'object' && order.metadata ? order.metadata : {}) as Record<string, any>
        const lastPush = Date.parse(orderMeta.daraja_pushed_at ?? '')
        if (Number.isFinite(lastPush) && Date.now() - lastPush < REPUSH_WINDOW_MS) {
            return NextResponse.json({ success: false, error: 'A payment prompt was just sent. Wait a minute to retry.' }, { status: 429 })
        }

        const { data: integration } = await supabase
            .from('store_integrations')
            .select('config, is_active')
            .eq('store_id', store.id)
            .eq('provider', 'mpesa')
            .single()

        if (!integration?.is_active) {
            return NextResponse.json({ success: false, error: 'M-PESA not enabled for this store' }, { status: 400 })
        }

        const cfg = integration.config as Record<string, any>
        if (!cfg?.darajaEnabled || !cfg?.consumerKey || !cfg?.consumerSecret || !cfg?.passkey || !cfg?.shortcode) {
            return NextResponse.json({ success: false, error: 'Daraja not fully configured for this store' }, { status: 400 })
        }

        const token = await getDarajaToken(cfg.consumerKey, cfg.consumerSecret)

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
        const password = Buffer.from(`${cfg.shortcode}${cfg.passkey}${timestamp}`).toString('base64')

        const callbackUrl = 'https://mcloud.co.ke/api/payments/mpesa/callback'

        const body = {
            BusinessShortCode: cfg.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: cfg.mpesa_type === 'paybill' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline',
            Amount: mpesaAmountDue(order.total),
            PartyA: normalizedPhone,
            PartyB: cfg.shortcode,
            PhoneNumber: normalizedPhone,
            CallBackURL: callbackUrl,
            AccountReference: orderId.slice(0, 12),
            TransactionDesc: `Order ${orderId.slice(0, 12)}`,
        }

        const stkRes = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        const stkData = await stkRes.json()

        if (!stkRes.ok || stkData.ResponseCode !== '0') {
            console.error('STK push error:', stkData)
            return NextResponse.json({
                success: false,
                error: stkData.errorMessage || stkData.ResultDesc || 'STK push failed',
            }, { status: 502 })
        }

        // Record the CheckoutRequestID so the callback can match it back to this order.
        await supabase.from('orders').update({
            metadata: {
                ...orderMeta,
                daraja_checkout_request_id: stkData.CheckoutRequestID,
                daraja_pushed_at: new Date().toISOString(),
                payment_method: 'daraja',
                payment_status: 'pending',
            },
        }).eq('id', order.id)

        return NextResponse.json({
            success: true,
            checkoutRequestId: stkData.CheckoutRequestID,
            customerMessage: stkData.CustomerMessage,
        })

    } catch (error) {
        console.error('STK push error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Server error',
        }, { status: 500 })
    }
}
