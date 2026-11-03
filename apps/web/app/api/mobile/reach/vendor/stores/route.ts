// @route-kind: mobile
// GET  /api/mobile/reach/vendor/stores — the stores this user manages, with their Reach status
// POST /api/mobile/reach/vendor/stores — "create a store": org (if none) + store + listing request
//      + this user as its vendor. Body: { name, areaId, payoutPhone? }.
import { NextResponse, type NextRequest } from 'next/server'
import { createAndJoin, listManagedStores } from '@/lib/reach/vendor-stores'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const stores = await listManagedStores(auth.user.id)
    return NextResponse.json({ stores }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const body = (await req.json().catch(() => null)) as { name?: unknown; areaId?: unknown; payoutPhone?: unknown } | null
    if (!body) return fail(400, 'Invalid JSON body')
    const result = await createAndJoin(auth.user.id, { name: body.name, areaId: body.areaId, payoutPhone: body.payoutPhone })
    if (!result.ok) return fail(result.status, result.error)
    return NextResponse.json({ slug: result.slug }, { status: 201 })
}
