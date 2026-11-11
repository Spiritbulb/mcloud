// Pure rules for charging a store's shoppers through PalPluss (STK push straight to the
// merchant's own till or paybill), used by the web checkout routes. No I/O here: the routes
// call PalPluss; the decisions about WHO is eligible and WHEN an order counts as paid live
// here so they are tested once. Money rules are the same as Daraja: the amount comes from the
// stored order, and an order is paid only from a PalPluss-confirmed amount that covers it.
import { mpesaPaymentCovers } from './payments'
import type { Plan } from './plans'

/** The kill switch. Unset means every store behaves exactly as before. Read at runtime. */
export function palplussStorePaymentsOn(env: Record<string, string | undefined> = process.env): boolean {
    return env.PALPLUSS_STORE_PAYMENTS === '1'
}

export interface PalplussChannelSpec {
    type: 'PAYBILL' | 'TILL_NUMBER'
    shortcode: string
    /** Paybill account number; null for a till. */
    accountNumber: string | null
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const SHORTCODE = /^\d{5,7}$/

/**
 * The channel a store's manual M-PESA details describe, or null when they cannot be charged
 * (no number, a malformed number, or a paybill without an account number).
 */
export function channelSpecFromMpesa(cfg: unknown): PalplussChannelSpec | null {
    if (!isRecord(cfg)) return null
    const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')
    if (cfg.mpesa_type === 'paybill') {
        const shortcode = str(cfg.mpesa_paybill)
        const account = str(cfg.mpesa_account)
        if (!SHORTCODE.test(shortcode) || !account) return null
        return { type: 'PAYBILL', shortcode, accountNumber: account }
    }
    const shortcode = str(cfg.mpesa_till)
    if (!SHORTCODE.test(shortcode)) return null
    return { type: 'TILL_NUMBER', shortcode, accountNumber: null }
}

/** Does the store's own Daraja setup work (on, and every credential present)? Mirrors the stk-push route. */
export function darajaReady(cfg: unknown, isActive: boolean | null | undefined): boolean {
    if (!isActive || !isRecord(cfg)) return false
    return !!(cfg.darajaEnabled && cfg.consumerKey && cfg.consumerSecret && cfg.passkey && cfg.shortcode)
}

export interface PalplussChannel {
    id: string
    type: string
    shortcode: string
    accountNumber: string | null
}

/** Does an existing PalPluss channel already describe exactly this spec? */
export function channelMatches(ch: PalplussChannel, spec: PalplussChannelSpec): boolean {
    return ch.type === spec.type && String(ch.shortcode) === spec.shortcode && (ch.accountNumber ?? '') === (spec.accountNumber ?? '')
}

/** A readable, per-store channel name. The store id keeps channels of different stores apart. */
export function channelName(storeId: string, spec: PalplussChannelSpec): string {
    return `mcloud ${storeId.slice(0, 8)} ${spec.type === 'PAYBILL' ? 'paybill' : 'till'} ${spec.shortcode}`
}

/**
 * Should this store's shoppers get an STK push through PalPluss? Only when the platform switch
 * is on, the store is on Pro, it has chargeable manual details, and it does NOT already have
 * its own working Daraja credentials (those keep winning: they are the merchant's own rail).
 */
export function palplussStkEligible(input: {
    switchOn: boolean
    plan: Plan
    spec: PalplussChannelSpec | null
    darajaReady: boolean
}): boolean {
    return input.switchOn && input.plan === 'pro' && input.spec !== null && !input.darajaReady
}

export type PalplussOutcome = 'paid' | 'underpaid' | 'failed' | 'pending'

/**
 * Decide an order's fate from what PalPluss itself reports (never from a webhook body).
 * Anything unclear is `pending`, never `paid`.
 */
export function palplussOutcome(txn: { status?: unknown; amount?: unknown }, orderTotal: number): PalplussOutcome {
    switch (txn.status) {
        case 'SUCCESS':
            return mpesaPaymentCovers(txn.amount, orderTotal) ? 'paid' : 'underpaid'
        case 'FAILED':
        case 'CANCELLED':
        case 'EXPIRED':
        case 'REVERSED':
            return 'failed'
        default:
            return 'pending'
    }
}

/**
 * What the integrations endpoint tells a caller about M-PESA when the store is charged through
 * PalPluss. Checkout only understands "STK on" as `darajaEnabled`, so shoppers are told that.
 * Managers keep their real `darajaEnabled` (the Payments screen shows the Daraja keys' real
 * state) and get `platformStk: true` instead; checkout reads `darajaEnabled || platformStk`,
 * so the owner testing their own store sees the same form as a shopper.
 */
export function withPlatformStk<T extends Record<string, unknown>>(view: T | null, platformStk: boolean, manager: boolean): T | null {
    if (!view || !platformStk) return view
    return manager ? { ...view, platformStk: true } : { ...view, darajaEnabled: true }
}
