import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { updateOrderTracking } from '@/lib/logistics-data'

// PATCH /api/store/[slug]/tracking/[orderId]
// Body: { tracking_number?: string | null, status?: string }
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; orderId: string }> }
) {
    const { slug, orderId } = await params
    const session = await getSession()
    if (!session?.user) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: memberships } = await supabase
        .from('store_members')
        .select('store_id, store:stores(slug)')
        .eq('user_id', session.user.id)

    const membership = memberships?.find((m) => {
        const s = Array.isArray(m.store) ? m.store[0] : m.store
        return s?.slug === slug
    })
    if (!membership?.store_id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { data, error } = await updateOrderTracking(membership.store_id, orderId, {
        tracking_number: body.tracking_number,
        status: body.status,
    })

    if (error) {
        console.error('[tracking update]', error.code, error.message)
        return NextResponse.json({ error: 'unknown' }, { status: 500 })
    }

    return NextResponse.json(data)
}