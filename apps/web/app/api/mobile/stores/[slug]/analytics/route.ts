// GET /api/mobile/stores/[slug]/analytics?days=30 — analytics summary (RPC)
import { NextResponse, type NextRequest } from 'next/server'
import { getAnalytics } from '@/lib/merchant/store-sections'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const days = Number(req.nextUrl.searchParams.get('days')) || 30
    const result = await getAnalytics(slug, auth.user.id, Math.min(Math.max(days, 1), 365))
    if (result.error === 'not_found') return fail(404, 'Store not found')
    if (result.error === 'forbidden') return fail(403, 'No access to this store')
    return NextResponse.json({ analytics: result.data }, {
        headers: { 'Cache-Control': 'no-store' },
    })
}
