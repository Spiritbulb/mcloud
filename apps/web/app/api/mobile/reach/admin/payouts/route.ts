// @route-kind: mobile
// POST /api/mobile/reach/admin/payouts — record that you paid a store what it is owed.
// Body: { vendorId, ref } where `ref` is the M-Pesa confirmation code you sent it under. Reach pays
// by hand for now: this only records it. It settles every delivered order the store was owed for in
// one step (reach_mark_vendor_paid) and never pays the same order twice. Platform admins only.
import { NextResponse, type NextRequest } from 'next/server'
import { requireReachAdmin } from '@/lib/reach/admin'
import { reachDb } from '@/lib/reach/db'
import { notifyVendorPaid } from '@/lib/reach/notify'
import { fail } from '../../../_lib'

export async function POST(req: NextRequest) {
    const auth = await requireReachAdmin(req)
    if (auth instanceof NextResponse) return auth

    const body = (await req.json().catch(() => null)) as { vendorId?: string; ref?: string } | null
    const vendorId = typeof body?.vendorId === 'string' ? body.vendorId : ''
    const ref = typeof body?.ref === 'string' ? body.ref.trim().toUpperCase() : ''
    if (!vendorId) return fail(400, 'vendorId is required')
    if (ref.length < 3 || ref.length > 40) return fail(400, 'Enter the M-Pesa confirmation code')

    const db = await reachDb()
    const { data, error } = await db.rpc('reach_mark_vendor_paid', { p_vendor_id: vendorId, p_ref: ref, p_admin: auth.user.id })
    if (error) {
        if (error.message?.includes('nothing_owed')) return fail(409, 'This store has nothing waiting to be paid')
        if (error.message?.includes('ref_required')) return fail(400, 'Enter the M-Pesa confirmation code')
        return fail(500, error.message)
    }

    await notifyVendorPaid(vendorId, Number(data), ref)
    return NextResponse.json({ ok: true, paid: Number(data) })
}
