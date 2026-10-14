// @route-kind: admin
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'
import { revalidateStorefrontById } from '@/lib/revalidate-storefront'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

    const { id } = await params
    const { is_active } = await request.json()

    if (typeof is_active !== 'boolean') {
        return NextResponse.json({ error: 'is_active must be boolean' }, { status: 400 })
    }

    const { error } = await supabase
        .from('stores')
        .update({ is_active })
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await revalidateStorefrontById(id)
    return NextResponse.json({ ok: true })
}
