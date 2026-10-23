// @route-kind: admin
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'
import { revalidateStorefrontById } from '@/lib/revalidate-storefront'
import { recordAudit } from '@/lib/audit'
import { clientIp } from '@/lib/audit-logic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

    const { id } = await params
    const { is_active } = await request.json()

    if (typeof is_active !== 'boolean') {
        return NextResponse.json({ error: 'is_active must be boolean' }, { status: 400 })
    }

    const { data: prev } = await supabase.from('stores').select('is_active').eq('id', id).single()

    const { error } = await supabase
        .from('stores')
        .update({ is_active })
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await revalidateStorefrontById(id)
    await recordAudit({
        actor: auth.user,
        action: 'store.status.set',
        targetType: 'store',
        targetId: id,
        summary: is_active ? 'Reactivated store' : 'Suspended store',
        before: { is_active: prev?.is_active ?? null },
        after: { is_active },
        ip: clientIp(request.headers),
    })
    return NextResponse.json({ ok: true })
}
