// @route-kind: mobile
// PATCH /api/mobile/reach/admin/areas/[areaId] — rename, move the map point, or switch an area off.
// Switching off hides it from buyers' pickers; stores keep the link, nothing is deleted.
// Platform admins only.
import { NextResponse, type NextRequest } from 'next/server'
import { validateAreaInput } from '@mcloud/merchant/reach-areas'
import { requireReachAdmin } from '@/lib/reach/admin'
import { reachDb } from '@/lib/reach/db'
import { fail } from '../../../../_lib'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ areaId: string }> }) {
    const auth = await requireReachAdmin(req)
    if (auth instanceof NextResponse) return auth

    const { areaId } = await params
    const body = (await req.json().catch(() => null)) as { name?: unknown; lat?: unknown; lng?: unknown; active?: unknown } | null
    if (!body) return fail(400, 'Invalid JSON body')

    const patch: Record<string, unknown> = {}
    if (body.name !== undefined || body.lat !== undefined || body.lng !== undefined) {
        const parsed = validateAreaInput({ name: body.name, lat: body.lat, lng: body.lng })
        if (!parsed.ok) return fail(400, parsed.error)
        // The slug is an identifier other things may rely on, so renaming never changes it.
        Object.assign(patch, { name: parsed.name, lat: parsed.lat, lng: parsed.lng })
    }
    if (typeof body.active === 'boolean') patch.active = body.active
    if (!Object.keys(patch).length) return fail(400, 'Nothing to change')

    const db = await reachDb()
    const { data, error } = await db.from('reach_areas').update(patch).eq('id', areaId).select('id').maybeSingle()
    if (error) return fail(500, error.message)
    if (!data) return fail(404, 'Area not found')
    return NextResponse.json({ ok: true })
}
