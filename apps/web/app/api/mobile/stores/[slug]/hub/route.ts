// GET    /api/mobile/stores/[slug]/hub — single store + the viewer's role.
// DELETE /api/mobile/stores/[slug]/hub — delete the store (owner only). The body
//        must echo { confirm: "<exact store name>" } as a server-side safety gate.
import { NextResponse, type NextRequest } from 'next/server'
import { getStoreHub } from '@/lib/merchant/stores'
import { deleteStore } from '@/lib/merchant/store-sections'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const result = await getStoreHub(slug, auth.user.id)

    if (result.error === 'not_found') return fail(404, 'Store not found')
    if (result.error === 'forbidden') return fail(403, 'No access to this store')

    return NextResponse.json({ store: result.store }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    })
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params

    // Safety gate: the client must send the exact store name to confirm.
    const body = (await req.json().catch(() => null)) as { confirm?: string } | null
    const hub = await getStoreHub(slug, auth.user.id)
    if (hub.error === 'not_found') return fail(404, 'Store not found')
    if (hub.error !== null) return fail(403, 'No access to this store')
    if (!body?.confirm || body.confirm.trim() !== hub.store.name) {
        return fail(400, 'Confirmation text does not match the store name')
    }

    const result = await deleteStore(slug, auth.user.id)
    if (result.error) return fail(result.status, result.error)
    return NextResponse.json({ success: true })
}
