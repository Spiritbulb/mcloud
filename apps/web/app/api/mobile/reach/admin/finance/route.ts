// @route-kind: mobile
// GET /api/mobile/reach/admin/finance — what buyers paid, what Reach kept, and what each store is owed.
// Platform admins only. `allTime` is the ledger; `thisMonth` is for the headline number.
import { NextResponse, type NextRequest } from 'next/server'
import { requireReachAdmin } from '@/lib/reach/admin'
import { reachDb } from '@/lib/reach/db'
import { fail } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireReachAdmin(req)
    if (auth instanceof NextResponse) return auth

    const db = await reachDb()
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)

    const [all, month] = await Promise.all([
        db.rpc('reach_finance_summary', { p_since: null }),
        db.rpc('reach_finance_summary', { p_since: monthStart.toISOString() }),
    ])
    if (all.error) return fail(500, all.error.message)
    if (month.error) return fail(500, month.error.message)

    // Per-store rows come from the all-time ledger only (what is owed does not reset each month).
    return NextResponse.json(
        { allTime: all.data, thisMonth: { ...month.data, vendors: undefined } },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
