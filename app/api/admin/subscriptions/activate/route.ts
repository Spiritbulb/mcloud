// app/api/admin/subscriptions/activate/route.ts
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()

    const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.sub)
        .single()

    if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { subscription_id, store_id } = await request.json()

    await supabase
        .from('store_subscriptions')
        .update({ status: 'complete' })
        .eq('id', subscription_id)

    await supabase
        .from('stores')
        .update({ is_pro: true })
        .eq('id', store_id)

    return NextResponse.json({ ok: true })
}