// GET /api/mobile/stores/[slug]/today — combined unfulfilled orders + today's
// analytics in one request. Replaces the two parallel fetches the Today tab was
// making, cutting auth checks and Supabase round trips in half.
import { NextResponse, type NextRequest } from 'next/server'
import { getTodayData } from '@/lib/merchant/store-sections'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const result = await getTodayData(slug, auth.user.id)
    if (result.error === 'not_found') return fail(404, 'Store not found')
    if (result.error === 'forbidden') return fail(403, 'No access to this store')

    return NextResponse.json(result.data, {
        headers: { 'Cache-Control': 'no-store' },
    })
}
