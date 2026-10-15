// @route-kind: mobile
// GET /api/mobile/reach/admin/vendors?status=pending|approved|rejected|suspended|draft — the stores on
// (or asking to join) the marketplace, for the Reach admin screens. Platform admins only.
import { NextResponse, type NextRequest } from 'next/server'
import { areaLabel } from '@mcloud/merchant/reach-areas'
import { loadAreas } from '@/lib/reach/catalog'
import { requireReachAdmin } from '@/lib/reach/admin'
import { reachDb } from '@/lib/reach/db'
import { fail } from '../../../_lib'

const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'suspended']

export async function GET(req: NextRequest) {
    const auth = await requireReachAdmin(req)
    if (auth instanceof NextResponse) return auth

    const status = req.nextUrl.searchParams.get('status')
    if (status && !STATUSES.includes(status)) return fail(400, 'Invalid status')

    const db = await reachDb()
    let query = db
        .from('reach_vendors')
        .select(
            'id, name, store_id, area_id, listed, active, approval_status, requested_at, reviewed_at, review_note, payout_phone, created_at, stores(name, slug, logo_url), reach_courier_keys(active)',
        )
        .order('requested_at', { ascending: true, nullsFirst: false })
        .limit(200)
    if (status) query = query.eq('approval_status', status)
    const { data, error } = await query
    if (error) return fail(500, error.message)

    const areas = await loadAreas(db).catch(() => [])
    const storeIds = (data ?? []).map((v: any) => v.store_id).filter(Boolean)
    const productCount = new Map<string, number>()
    if (storeIds.length) {
        const { data: prods } = await db.from('products').select('store_id').in('store_id', storeIds).eq('is_active', true)
        for (const p of prods ?? []) productCount.set(p.store_id, (productCount.get(p.store_id) ?? 0) + 1)
    }

    const vendors = (data ?? []).map((v: any) => ({
        id: v.id,
        name: v.stores?.name ?? v.name,
        storeSlug: v.stores?.slug ?? null,
        logoUrl: v.stores?.logo_url ?? null,
        legacy: !v.store_id,
        areaId: v.area_id ?? null,
        areaName: v.area_id ? areaLabel(areas, v.area_id) || null : null,
        listed: !!v.listed,
        active: !!v.active,
        approvalStatus: v.approval_status,
        requestedAt: v.requested_at,
        reviewedAt: v.reviewed_at,
        reviewNote: v.review_note ?? null,
        payoutPhone: v.payout_phone ?? null,
        activeProducts: v.store_id ? productCount.get(v.store_id) ?? 0 : null,
        activeKeys: (v.reach_courier_keys ?? []).filter((k: any) => k.active).length,
    }))
    return NextResponse.json({ vendors }, { headers: { 'Cache-Control': 'no-store' } })
}
