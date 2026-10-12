// @route-kind: admin
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

    const { id } = await params
    const { role } = await request.json()

    if (role !== 'admin' && role !== 'user') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
}
