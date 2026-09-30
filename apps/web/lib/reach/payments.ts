import { getTransaction } from '@/lib/palpluss'
import { reachDb } from './db'

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'expired'

const MAP = {
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
} as const

/**
 * Asks PalPluss for the real state of a payment and settles it if it's final.
 * We never trust the webhook body for status or amount, only for "go look".
 * Safe to call repeatedly: reach_settle_payment only lets the first call win.
 */
export async function reconcilePayment(paymentId: string, receipt?: string | null): Promise<PaymentStatus> {
    const db = await reachDb()
    const { data: pay } = await db
        .from('reach_payments')
        .select('id, status, amount_kes, palpluss_transaction_id')
        .eq('id', paymentId)
        .single()
    if (!pay) throw new Error('Payment not found')
    if (pay.status !== 'pending') return pay.status as PaymentStatus
    if (!pay.palpluss_transaction_id) return 'pending'

    const txn = await getTransaction(pay.palpluss_transaction_id)
    const next = MAP[txn.status as keyof typeof MAP]
    if (!next) return 'pending' // still PENDING at PalPluss

    if (next === 'success' && Number(txn.amount) !== pay.amount_kes) {
        // Money arrived but not the amount we expected. Leave it pending for a human to look at.
        console.error('[reach] amount mismatch', { paymentId, expected: pay.amount_kes, got: txn.amount })
        return 'pending'
    }

    const { error } = await db.rpc('reach_settle_payment', {
        p_payment_id: pay.id,
        p_status: next,
        p_receipt: next === 'success' ? receipt ?? null : null,
        p_reason: next === 'success' ? null : `palpluss:${txn.status}`,
    })
    if (error) throw error
    return next
}