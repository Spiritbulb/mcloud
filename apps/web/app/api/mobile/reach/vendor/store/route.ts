// @route-kind: mobile
// GET   /api/mobile/reach/vendor/store — my store's Reach details (areas, payout phone, status)
// PATCH /api/mobile/reach/vendor/store — { description?, areaId?, extraAreaIds?, payoutPhone? }
// Owners/admins only; the store is the one this user is the vendor of (myManagedStore).
import { NextResponse, type NextRequest } from 'next/server'
import { getReachStatus, saveReachLocation } from '@mcloud/merchant/reach-listing'
import { reachDb } from '@/lib/reach/db'
import { myManagedStore } from '@/lib/reach/vendor-stores'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const mine = await myManagedStore(auth.user.id)
    if (!mine.ok) return fail(mine.status, mine.error)

    const db = await reachDb()
    const [status, { data: store }] = await Promise.all([
        getReachStatus(db, mine.storeId),
        db.from('stores').select('description').eq('id', mine.storeId).maybeSingle(),
    ])
    if (!status.ok) return fail(500, status.error)
    // Keys have their own route (owners only, masked); they are not part of the store details.
    const details = { ...status, keys: undefined, description: store?.description ?? null }
    return NextResponse.json({ store: details }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const mine = await myManagedStore(auth.user.id)
    if (!mine.ok) return fail(mine.status, mine.error)

    const body = (await req.json().catch(() => null)) as {
        description?: unknown
        areaId?: unknown
        extraAreaIds?: unknown
        payoutPhone?: unknown
    } | null
    if (!body) return fail(400, 'Invalid JSON body')
    const db = await reachDb()

    if (body.description !== undefined) {
        const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null
        const { error } = await db.from('stores').update({ description: description || null }).eq('id', mine.storeId)
        if (error) return fail(500, 'Could not save. Try again.')
    }
    if (body.areaId !== undefined) {
        const saved = await saveReachLocation(db, mine.storeId, {
            areaId: body.areaId,
            extraAreaIds: body.extraAreaIds ?? [],
            payoutPhone: body.payoutPhone ?? null,
        })
        if (!saved.ok) return fail(400, saved.error)
    }
    return NextResponse.json({ ok: true })
}
