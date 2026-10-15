// @route-kind: mobile
// GET /api/mobile/reach/areas — the active delivery areas (towns and the areas inside them).
// Buyers pick where they are shopping from; merchants and the admin use the same list.
import { NextResponse, type NextRequest } from 'next/server'
import { loadAreas } from '@/lib/reach/catalog'
import { reachDb } from '@/lib/reach/db'
import { fail, requireMobileUser } from '../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    try {
        const areas = await loadAreas(await reachDb())
        return NextResponse.json({ areas }, { headers: { 'Cache-Control': 'private, max-age=300' } })
    } catch (e) {
        return fail(500, e instanceof Error ? e.message : 'Could not load areas')
    }
}
