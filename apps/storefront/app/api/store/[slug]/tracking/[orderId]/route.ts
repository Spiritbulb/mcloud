// @route-kind: member
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { FULFILLMENT_STATUSES, updateOrderTracking } from '@mcloud/merchant/logistics-data'
import { canManage, requireStoreAccess } from '@mcloud/merchant/stores'

// PATCH /api/store/[slug]/tracking/[orderId]
// Body: { tracking_number?: string | null, fulfillment_status?: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' }
// Payment status is not settable here; the Orders screen owns it.
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; orderId: string }> }
) {
    const { slug, orderId } = await params
    const session = await getSession()
    if (!session?.user) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    // Store member or member of the store's org, with a managing role (same as the order actions).
    const access = await requireStoreAccess(slug, session.user.id)
    if (access.error === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (access.error || !canManage(access.role)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const fields: Parameters<typeof updateOrderTracking>[2] = {}
    if (body && 'tracking_number' in body) {
        const raw = body.tracking_number
        if (raw !== null && typeof raw !== 'string') return NextResponse.json({ error: 'Invalid tracking number' }, { status: 400 })
        const trimmed = typeof raw === 'string' ? raw.trim() : ''
        if (trimmed.length > 100) return NextResponse.json({ error: 'Tracking number is too long' }, { status: 400 })
        fields.tracking_number = trimmed || null
    }
    if (body && 'fulfillment_status' in body) {
        const status = FULFILLMENT_STATUSES.find((s) => s === body.fulfillment_status)
        if (!status) return NextResponse.json({ error: 'Invalid fulfillment status' }, { status: 400 })
        fields.fulfillment_status = status
    }
    if (Object.keys(fields).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const { data, error } = await updateOrderTracking(access.storeId, orderId, fields)

    if (error) {
        console.error('[tracking update]', error.code, error.message)
        const notFound = error.code === 'PGRST116' || error.code === '22P02'
        return NextResponse.json({ error: notFound ? 'not_found' : 'unknown' }, { status: notFound ? 404 : 500 })
    }

    return NextResponse.json(data)
}
