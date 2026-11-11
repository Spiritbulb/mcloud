// apps/web/lib/palpluss-store-payments.ts
// Charging a store's shoppers through PalPluss: STK push straight to the merchant's own till or
// paybill. Used by the checkout routes (`payments/mpesa/stk-push` and `status`) and the webhook.
// The decisions (who is eligible, when an order is paid) are in `@mcloud/merchant/palpluss-store`.
// Rules as for Daraja: the amount is the stored order total, and an order is `paid` only from a
// PalPluss-confirmed amount that covers it (the webhook body is only a hint).
import { createClient } from '@mcloud/db/server'
import { settleDarajaOrder } from '@mcloud/merchant/daraja'
import { getStorePlan } from '@mcloud/merchant/plans-server'
import {
    channelMatches, channelName, channelSpecFromMpesa, darajaReady, palplussOutcome, palplussStkEligible,
    palplussStorePaymentsOn, type PalplussChannelSpec, type PalplussOutcome,
} from '@mcloud/merchant/palpluss-store'
import { createChannel, getTransaction, listChannels } from '@/lib/palpluss'

type Db = Awaited<ReturnType<typeof createClient>>

/**
 * The channel to charge for this store, or null when the store should keep using what it had
 * (Daraja, or the manual code). Null also when the platform switch is off, so nothing changes
 * until PALPLUSS_STORE_PAYMENTS=1.
 */
export async function palplussSpecForStore(supabase: Db, storeId: string): Promise<PalplussChannelSpec | null> {
    if (!palplussStorePaymentsOn()) return null
    const { data: integration } = await supabase
        .from('store_integrations')
        .select('config, is_active')
        .eq('store_id', storeId)
        .eq('provider', 'mpesa')
        .maybeSingle()
    // The merchant must have M-PESA switched on with chargeable manual details.
    if (!integration?.is_active) return null
    const spec = channelSpecFromMpesa(integration.config)
    const plan = await getStorePlan(storeId)
    const eligible = palplussStkEligible({
        switchOn: true,
        plan,
        spec,
        darajaReady: darajaReady(integration.config, integration.is_active),
    })
    return eligible ? spec : null
}

// Channel ids by store + details, so a push does not list channels every time. A restart or a
// changed till just looks the channel up again.
const channelCache = new Map<string, { id: string; at: number }>()
const CHANNEL_TTL_MS = 10 * 60_000

/** The PalPluss channel for these details, created on first use. */
export async function ensureChannel(storeId: string, spec: PalplussChannelSpec): Promise<string> {
    const cacheKey = `${storeId}|${spec.type}|${spec.shortcode}|${spec.accountNumber ?? ''}`
    const hit = channelCache.get(cacheKey)
    if (hit && Date.now() - hit.at < CHANNEL_TTL_MS) return hit.id

    const existing = (await listChannels('store')).find((c) => channelMatches(c, spec))
    const id =
        existing?.id ??
        (await createChannel({ name: channelName(storeId, spec), type: spec.type, shortcode: spec.shortcode, accountNumber: spec.accountNumber })).id
    channelCache.set(cacheKey, { id, at: Date.now() })
    return id
}

type OrderRow = { id: string; store_id: string; order_number: string; total: number; currency: string; status: string; metadata: unknown }

function metaOf(order: { metadata: unknown }): Record<string, unknown> {
    return typeof order.metadata === 'object' && order.metadata && !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, unknown>)
        : {}
}

/**
 * Ask PalPluss what happened to an order's transaction and act on it. Safe to call from the
 * webhook and the buyer's status poll at once: `justSettled` is true only for the call that
 * flipped the order to `paid`, so the caller notifies the merchant exactly once.
 */
export async function settlePalplussOrder(
    supabase: Db,
    order: OrderRow,
    hint: { mpesaReceipt?: string | null } = {},
): Promise<{ outcome: PalplussOutcome; justSettled: boolean }> {
    const meta = metaOf(order)
    const txId = meta.palpluss_transaction_id
    if (typeof txId !== 'string' || !txId) return { outcome: 'pending', justSettled: false }
    if (order.status === 'paid') return { outcome: 'paid', justSettled: false }

    const txn = await getTransaction(txId, 'store')
    const outcome = palplussOutcome(txn, order.total)

    if (outcome === 'paid') {
        // The receipt number is not in PalPluss's transaction read, so it comes from the webhook body
        // and only after PalPluss itself confirmed the payment. It is display data, not a decision.
        const justSettled = await settleDarajaOrder(supabase, order, { mpesaCode: hint.mpesaReceipt ?? null, amount: txn.amount })
        return { outcome, justSettled }
    }
    // A stale read must never overwrite an order another request already settled.
    if (outcome === 'underpaid') {
        console.error('PalPluss store payment: underpayment', { orderId: order.id, amount: txn.amount, total: order.total })
        await supabase.from('orders').update({ metadata: { ...meta, payment_status: 'underpaid', mpesa_amount_paid: txn.amount } }).eq('id', order.id).neq('status', 'paid')
    } else if (outcome === 'failed') {
        await supabase.from('orders').update({ metadata: { ...meta, payment_status: 'failed', palpluss_status: txn.status } }).eq('id', order.id).neq('status', 'paid')
    }
    return { outcome, justSettled: false }
}
