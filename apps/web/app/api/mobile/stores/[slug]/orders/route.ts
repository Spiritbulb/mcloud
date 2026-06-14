// GET /api/mobile/stores/[slug]/orders — list recent orders
import { NextResponse, type NextRequest } from 'next/server'
import { listOrders } from '@/lib/merchant/store-sections'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    const result = await listOrders(slug, auth.user.id)
    if (result.error === 'not_found') return fail(404, 'Store not found')
    if (result.error === 'forbidden') return fail(403, 'No access to this store')
    return NextResponse.json({ orders: result.data }, { headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=40' } })
}
