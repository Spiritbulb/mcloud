// GET   /api/mobile/stores/[slug]/mpesa — read manual M-Pesa config
// PATCH /api/mobile/stores/[slug]/mpesa — update manual fields (owner/admin)
// Auto/Daraja stays on the web.
import { NextResponse, type NextRequest } from 'next/server'
import { getMpesa, updateMpesa } from '@/lib/merchant/store-sections'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const result = await getMpesa(slug, auth.user.id)
    if (result.error === 'not_found') return fail(404, 'Store not found')
    if (result.error === 'forbidden') return fail(403, 'No access to this store')
    return NextResponse.json({ mpesa: result.data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) return fail(400, 'Invalid JSON body')

    const result = await updateMpesa(slug, auth.user.id, body)
    if (result.error) return fail(result.status, result.error === 'forbidden' ? 'Not authorized' : 'Update failed')
    return NextResponse.json({ mpesa: result.data })
}
