// PATCH /api/mobile/stores/[slug]/orders/[orderId] — update fulfillment status
import { NextResponse, type NextRequest } from 'next/server'
import { updateOrderStatus } from '@/lib/merchant/store-sections'
import { fail, requireMobileUser } from '../../../../_lib'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; orderId: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const { slug, orderId } = await params
    const body = (await req.json().catch(() => null)) as { fulfillment_status?: string } | null
    if (!body?.fulfillment_status) return fail(400, 'fulfillment_status is required')

    const result = await updateOrderStatus(slug, auth.user.id, orderId, body.fulfillment_status)
    if (result.error) return fail(result.status, result.error === 'forbidden' ? 'Not authorized' : 'Order not found')
    return NextResponse.json({ order: result.data })
}
