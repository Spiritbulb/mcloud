import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'

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

export async function POST(req: NextRequest) {
    try {
        const { storeSlug, phone, orderId, amount } = await req.json()

        if (!storeSlug || !phone || !orderId || !amount) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', storeSlug)
            .single()

        if (!store) return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 })

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

        // Normalize phone to 254XXXXXXXXX
        const normalizedPhone = phone.replace(/^0/, '254').replace(/^\+/, '')

        const callbackUrl = 'https://mcloud.co.ke/api/payments/mpesa/callback'

        const body = {
            BusinessShortCode: cfg.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: cfg.mpesa_type === 'paybill' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline',
            Amount: Math.ceil(amount),
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

        // Merge CheckoutRequestID into order metadata so the callback can match it
        const { data: order } = await supabase
            .from('orders')
            .select('metadata')
            .eq('id', orderId)
            .single()

        await supabase.from('orders').update({
            metadata: {
                ...(typeof order?.metadata === 'object' && order?.metadata ? order.metadata : {}),
                daraja_checkout_request_id: stkData.CheckoutRequestID,
                payment_method: 'daraja',
                payment_status: 'pending',
            },
        }).eq('id', orderId)

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
