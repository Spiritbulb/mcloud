// GET   /api/mobile/stores/[slug]/branding — read branding
// PATCH /api/mobile/stores/[slug]/branding — update name/logo/description (owner/admin)
import { NextResponse, type NextRequest } from 'next/server'
import { getBranding, updateBranding } from '@/lib/merchant/store-sections'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const result = await getBranding(slug, auth.user.id)
    if (result.error === 'not_found') return fail(404, 'Store not found')
    if (result.error === 'forbidden') return fail(403, 'No access to this store')
    return NextResponse.json({ branding: result.data }, {
        headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
    })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const body = (await req.json().catch(() => null)) as
        | { name?: string; logo_url?: string | null; description?: string | null }
        | null
    if (!body) return fail(400, 'Invalid JSON body')

    const result = await updateBranding(slug, auth.user.id, body)
    if (result.error) return fail(result.status, result.error === 'forbidden' ? 'Not authorized' : 'Invalid update')
    return NextResponse.json({ branding: result.data })
}
