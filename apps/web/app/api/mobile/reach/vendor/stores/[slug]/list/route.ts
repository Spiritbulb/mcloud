// @route-kind: mobile
// POST /api/mobile/reach/vendor/stores/[slug]/list — list a store this user manages on Reach and
// make them its vendor (also how an owner switches between their stores). Body: { areaId?, payoutPhone? };
// areaId is required the first time a store is listed. Gate: requireStoreAccess + canManage in listAndJoin.
import { NextResponse, type NextRequest } from 'next/server'
import { listAndJoin } from '@/lib/reach/vendor-stores'
import { fail, requireMobileUser } from '../../../../../_lib'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const { slug } = await params
    const body = ((await req.json().catch(() => null)) ?? {}) as { areaId?: unknown; payoutPhone?: unknown }
    const result = await listAndJoin(auth.user.id, slug, { areaId: body.areaId, payoutPhone: body.payoutPhone })
    if (!result.ok) return fail(result.status, result.error)
    return NextResponse.json({ slug: result.slug })
}
