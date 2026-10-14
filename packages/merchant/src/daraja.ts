// Daraja (M-PESA) calls that confirm and settle an order. The routes stay thin; the
// callback is unsigned, so nothing marks an order paid until `confirmDarajaPayment`
// has asked Safaricom directly. Decisions about the answer live in `payments.ts`.
import type { createClient } from '@mcloud/db/server'
import { stkQueryOutcome, type StkOutcome } from './payments'

type Db = Awaited<ReturnType<typeof createClient>>

const darajaBase = () =>
    process.env.DARAJA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'

interface DarajaConfig {
    consumerKey?: string
    consumerSecret?: string
    passkey?: string
    shortcode?: string | number
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Ask Safaricom whether this STK push succeeded. Network or auth trouble reads as `pending`. */
export async function queryStkPush(cfg: DarajaConfig, checkoutRequestId: string): Promise<StkOutcome> {
    if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.passkey || !cfg.shortcode) return 'pending'
    try {
        const base = darajaBase()
        const credentials = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64')
        const auth = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${credentials}` },
        })
        if (!auth.ok) return 'pending'
        const { access_token } = await auth.json()
        if (!access_token) return 'pending'

        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
        const password = Buffer.from(`${cfg.shortcode}${cfg.passkey}${timestamp}`).toString('base64')
        const res = await fetch(`${base}/mpesa/stkpushquery/v1/query`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                BusinessShortCode: cfg.shortcode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestId,
            }),
        })
        // A transaction still being processed answers with an error status and body, so the
        // body is read whatever the status is; `stkQueryOutcome` treats it as pending.
        const data = await res.json().catch(() => null)
        return stkQueryOutcome(data, checkoutRequestId)
    } catch (err) {
        console.error('Daraja STK query failed:', err)
        return 'pending'
    }
}

/** Confirm an order's STK push with Safaricom, using the order's store's own credentials. */
export async function confirmDarajaPayment(
    supabase: Db,
    order: { store_id: string; metadata: unknown },
): Promise<StkOutcome> {
    const meta = isRecord(order.metadata) ? order.metadata : {}
    const checkoutRequestId = meta.daraja_checkout_request_id
    if (typeof checkoutRequestId !== 'string' || !checkoutRequestId) return 'pending'

    const { data: integration } = await supabase
        .from('store_integrations')
        .select('config')
        .eq('store_id', order.store_id)
        .eq('provider', 'mpesa')
        .maybeSingle()

    const cfg = isRecord(integration?.config) ? (integration.config as DarajaConfig) : {}
    return queryStkPush(cfg, checkoutRequestId)
}

/**
 * Mark an order paid. Returns true only for the call that actually flipped it, so the
 * callback and the status poll can both run without notifying the merchant twice.
 */
export async function settleDarajaOrder(
    supabase: Db,
    order: { id: string; metadata: unknown },
    details: { mpesaCode?: unknown; amount?: unknown; phone?: unknown } = {},
): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- order metadata is free-form Json
    const meta = (isRecord(order.metadata) ? order.metadata : {}) as Record<string, any>
    const { data } = await supabase
        .from('orders')
        .update({
            status: 'paid',
            fulfillment_status: 'unfulfilled',
            metadata: {
                ...meta,
                payment_status: 'completed',
                mpesa_transaction_code: details.mpesaCode ?? meta.mpesa_transaction_code ?? null,
                mpesa_amount_paid: details.amount ?? meta.mpesa_amount_paid ?? null,
                mpesa_phone_used: details.phone ?? meta.mpesa_phone_used ?? null,
            },
        })
        .eq('id', order.id)
        .neq('status', 'paid')
        .select('id')
    return (data?.length ?? 0) > 0
}
