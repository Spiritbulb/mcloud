// @route-kind: mobile
// GET  /api/mobile/reach/admin/areas — every area, including switched-off ones.
// POST /api/mobile/reach/admin/areas — add a town (no parentId) or an area inside a town.
// Platform admins only. The buyer-facing list is /api/mobile/reach/areas.
import { NextResponse, type NextRequest } from 'next/server'
import { validateAreaInput } from '@mcloud/merchant/reach-areas'
import { requireReachAdmin } from '@/lib/reach/admin'
import { reachDb } from '@/lib/reach/db'
import { fail } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireReachAdmin(req)
    if (auth instanceof NextResponse) return auth
    const db = await reachDb()
    const { data, error } = await db
        .from('reach_areas')
        .select('id, parent_id, name, slug, lat, lng, active, sort')
        .order('sort')
        .order('name')
    if (error) return fail(500, error.message)
    return NextResponse.json({ areas: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
    const auth = await requireReachAdmin(req)
    if (auth instanceof NextResponse) return auth

    const body = (await req.json().catch(() => null)) as { name?: unknown; parentId?: unknown; lat?: unknown; lng?: unknown } | null
    const parsed = validateAreaInput({ name: body?.name, lat: body?.lat, lng: body?.lng })
    if (!parsed.ok) return fail(400, parsed.error)

    const db = await reachDb()
    let parentId: string | null = null
    if (body?.parentId) {
        const { data: parent } = await db.from('reach_areas').select('id, parent_id').eq('id', String(body.parentId)).maybeSingle()
        if (!parent) return fail(400, 'That town does not exist')
        if (parent.parent_id) return fail(400, 'Areas go inside a town, not inside another area')
        parentId = parent.id
    }

    // Two towns can each have a "Central"; the slug carries the town so it stays unique.
    let slug = parsed.slug
    if (parentId) {
        const { data: parent } = await db.from('reach_areas').select('slug').eq('id', parentId).single()
        slug = `${parent.slug}-${parsed.slug}`
    }
    const { data, error } = await db
        .from('reach_areas')
        .insert({ name: parsed.name, slug, parent_id: parentId, lat: parsed.lat, lng: parsed.lng })
        .select('id, parent_id, name, slug, lat, lng, active, sort')
        .single()
    if (error) return fail(error.code === '23505' ? 409 : 500, error.code === '23505' ? 'That area already exists' : error.message)
    return NextResponse.json({ area: data }, { status: 201 })
}
