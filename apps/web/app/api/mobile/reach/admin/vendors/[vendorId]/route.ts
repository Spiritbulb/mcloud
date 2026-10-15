// @route-kind: mobile
// PATCH /api/mobile/reach/admin/vendors/[vendorId] — decide a listing request, or change a listed store.
// Body: { decision: 'approve' | 'reject' | 'suspend' | 'reinstate', note?, areaId? }. `areaId` places the
// store before approving (needed for grandfathered stores that have none). Platform admins only.
import { NextResponse, type NextRequest } from 'next/server'
import { adminDecide, type AdminDecision } from '@mcloud/merchant/reach-approval'
import { requireReachAdmin } from '@/lib/reach/admin'
import { loadAreas } from '@/lib/reach/catalog'
import { reachDb } from '@/lib/reach/db'
import { notifyVendorDecision } from '@/lib/reach/notify'
import { fail } from '../../../../_lib'

const DECISIONS: AdminDecision[] = ['approve', 'reject', 'suspend', 'reinstate']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ vendorId: string }> }) {
    const auth = await requireReachAdmin(req)
    if (auth instanceof NextResponse) return auth

    const { vendorId } = await params
    const body = (await req.json().catch(() => null)) as { decision?: string; note?: string; areaId?: string } | null
    const decision = body?.decision as AdminDecision
    if (!DECISIONS.includes(decision)) return fail(400, 'Invalid decision')
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 300) : null

    const db = await reachDb()
    const { data: vendor, error } = await db
        .from('reach_vendors')
        .select('id, name, approval_status, area_id, store_id')
        .eq('id', vendorId)
        .maybeSingle()
    if (error) return fail(500, error.message)
    if (!vendor) return fail(404, 'Store not found')

    let areaId: string | null = vendor.area_id
    if (typeof body?.areaId === 'string') {
        const areas = await loadAreas(db).catch(() => [])
        if (!areas.some((a) => a.id === body.areaId)) return fail(400, 'That area does not exist')
        areaId = body.areaId
    }

    const next = adminDecide({ approval_status: vendor.approval_status, area_id: areaId }, decision, note)
    if (!next.ok) return fail(409, next.error)

    // Guard on the status we read, so two admins cannot both act on the same request.
    const { data: updated, error: upErr } = await db
        .from('reach_vendors')
        .update({
            approval_status: next.status,
            area_id: areaId,
            reviewed_at: new Date().toISOString(),
            reviewed_by: auth.user.id,
            review_note: decision === 'approve' || decision === 'reinstate' ? null : note,
        })
        .eq('id', vendorId)
        .eq('approval_status', vendor.approval_status)
        .select('id')
    if (upErr) return fail(500, upErr.message)
    if (!updated?.length) return fail(409, 'Someone else already decided this request')

    await notifyVendorDecision(vendorId, vendor.name, next.status, note)
    return NextResponse.json({ ok: true, approvalStatus: next.status })
}
