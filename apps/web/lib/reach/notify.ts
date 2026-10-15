import { sendPushToUsers } from '@/lib/merchant/send-push'
import type { ApprovalStatus } from '@mcloud/merchant/reach-approval'
import { reachDb } from './db'

// Best-effort pushes for Reach events. sendPushToUsers already swallows delivery errors, and every
// lookup here is wrapped too: a notification must never fail the request that caused it.

/** Everyone who works for a vendor in the app (anyone who joined with one of its keys). */
async function vendorStaff(vendorId: string): Promise<string[]> {
    const db = await reachDb()
    const { data } = await db.from('reach_vendor_members').select('user_id').eq('vendor_id', vendorId)
    return (data ?? []).map((m: { user_id: string }) => m.user_id)
}

export async function notifyVendorDecision(vendorId: string, name: string, status: ApprovalStatus, note: string | null) {
    try {
        const copy: Partial<Record<ApprovalStatus, { title: string; body: string }>> = {
            approved: { title: `${name} is live on Reach`, body: 'Shoppers in your area can now order from you.' },
            rejected: { title: `${name} needs changes`, body: note ?? 'Open the app to see what to fix.' },
            suspended: { title: `${name} has been paused`, body: note ?? 'Contact Reach support for details.' },
        }
        const message = copy[status]
        if (!message) return
        await sendPushToUsers(await vendorStaff(vendorId), { ...message, data: { type: 'listing', status } })
    } catch (e) {
        console.error('[reach notify] decision', e)
    }
}

export async function notifyVendorPaid(vendorId: string, amountKes: number, ref: string) {
    try {
        await sendPushToUsers(await vendorStaff(vendorId), {
            title: 'Payout sent',
            body: `KES ${amountKes.toLocaleString()} was sent to your M-Pesa (${ref}).`,
            data: { type: 'payout' },
        })
    } catch (e) {
        console.error('[reach notify] payout', e)
    }
}

/** A buyer's payment cleared: tell each vendor on the order to start preparing it. */
export async function notifyOrderPaid(orderId: string) {
    try {
        const db = await reachDb()
        const { data: payouts } = await db.from('reach_vendor_payouts').select('vendor_id').eq('order_id', orderId)
        const { data: order } = await db.from('orders').select('order_number').eq('id', orderId).maybeSingle()
        for (const p of payouts ?? []) {
            await sendPushToUsers(await vendorStaff(p.vendor_id), {
                title: 'New order',
                body: `${order?.order_number ?? 'An order'} is paid and waiting for you to deliver.`,
                data: { type: 'order', orderId },
            })
        }
    } catch (e) {
        console.error('[reach notify] order', e)
    }
}

/** A store asked to be listed: tell the platform admins there is something to review. */
export async function notifyAdminsOfRequest(storeName: string) {
    try {
        const db = await reachDb()
        const { data } = await db.from('users').select('id').eq('role', 'admin')
        await sendPushToUsers((data ?? []).map((u: { id: string }) => u.id), {
            title: 'New store to review',
            body: `${storeName} asked to be listed on Reach.`,
            data: { type: 'review' },
        })
    } catch (e) {
        console.error('[reach notify] admins', e)
    }
}
