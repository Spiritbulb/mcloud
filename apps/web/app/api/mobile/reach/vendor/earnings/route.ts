// @route-kind: mobile
// GET /api/mobile/reach/vendor/earnings — what Reach holds for this vendor, owes it, and has paid it.
//   held     paid by buyers, waiting for you to mark the order delivered
//   owed     delivered; Reach pays this to your M-Pesa
//   paidOut  already sent, with the most recent M-Pesa reference
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { vendorFor } from '@/lib/reach/vendor'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const vendor = await vendorFor(auth.user.id)
    if (!vendor) return fail(403, 'Not a vendor')

    const db = await reachDb()
    const { data, error } = await db
        .from('reach_vendor_payouts')
        .select('status, amount_kes, paid_out_at, payout_ref, orders!inner(status)')
        .eq('vendor_id', vendor.id)
        .eq('orders.status', 'paid')
        .in('status', ['held', 'released', 'paid_out'])
    if (error) return fail(500, error.message)

    let held = 0
    let owed = 0
    let paidOut = 0
    let last: { at: string; ref: string | null } | null = null
    for (const r of data ?? []) {
        if (r.status === 'held') held += r.amount_kes
        else if (r.status === 'released') owed += r.amount_kes
        else if (r.status === 'paid_out') {
            paidOut += r.amount_kes
            if (r.paid_out_at && (!last || r.paid_out_at > last.at)) last = { at: r.paid_out_at, ref: r.payout_ref ?? null }
        }
    }
    return NextResponse.json({ held, owed, paidOut, lastPayout: last }, { headers: { 'Cache-Control': 'no-store' } })
}
