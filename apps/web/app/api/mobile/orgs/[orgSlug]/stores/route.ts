// GET  /api/mobile/orgs/[orgSlug]/stores — list stores in an org (member only).
// POST /api/mobile/orgs/[orgSlug]/stores — create a store (owner/admin only).
//
// Reuses the exact same authz + validation logic as the web server actions
// (lib/merchant/stores.ts), so rules can't drift between web and mobile.
import { NextResponse, type NextRequest } from 'next/server'
import { createStoreForUser, listOrgStores } from '@/lib/merchant/stores'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orgSlug: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { orgSlug } = await params
    const result = await listOrgStores(orgSlug, auth.user.id)

    if (result.error === 'not_found') return fail(404, 'Org not found')
    if (result.error === 'not_member') return fail(403, 'Not a member of this org')

    return NextResponse.json({ orgId: result.orgId, role: result.role, stores: result.stores }, {
        headers: { 'Cache-Control': 'no-store' },
    })
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orgSlug: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { orgSlug } = await params

    // Resolve org + confirm membership (gives us orgId without trusting the body).
    const org = await listOrgStores(orgSlug, auth.user.id)
    if (org.error === 'not_found') return fail(404, 'Org not found')
    if (org.error !== null) return fail(403, 'Not a member of this org')

    const body = (await req.json().catch(() => null)) as { name?: string; slug?: string } | null
    if (!body) return fail(400, 'Invalid JSON body')

    const result = await createStoreForUser(
        { orgId: org.orgId, name: body.name ?? '', slug: body.slug ?? '' },
        auth.user.id,
    )
    if (result.error) {
        // Authorization failure → 403; validation/conflict → 400.
        const status = result.error.startsWith('Only owners') ? 403 : 400
        return fail(status, result.error)
    }

    return NextResponse.json({ success: true, slug: result.slug }, { status: 201 })
}
