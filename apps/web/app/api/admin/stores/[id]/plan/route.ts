import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { action, plan: planInput } = await request.json()
    const plan: 'hobby' | 'pro' = planInput === 'hobby' ? 'hobby' : 'pro'

    if (action !== 'grant' && action !== 'revoke') {
        return NextResponse.json({ error: 'action must be "grant" or "revoke"' }, { status: 400 })
    }

    if (action === 'grant') {
        const { error: storeErr } = await supabase
            .from('stores')
            .update({ is_pro: true, pro_since: new Date().toISOString(), pro_expires_at: null })
            .eq('id', id)
        if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 })

        const { data: existingSub } = await supabase
            .from('store_subscriptions')
            .select('id')
            .eq('store_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (existingSub) {
            await supabase
                .from('store_subscriptions')
                .update({ status: 'active', plan })
                .eq('id', existingSub.id)
        } else {
            const { data: store } = await supabase
                .from('stores')
                .select('currency')
                .eq('id', id)
                .single()
            await supabase
                .from('store_subscriptions')
                .insert({
                    store_id: id,
                    status: 'active',
                    provider: 'admin',
                    amount: 0,
                    currency: store?.currency ?? 'KES',
                    plan,
                    period_start: new Date().toISOString(),
                })
        }
    } else {
        const { error: storeErr } = await supabase
            .from('stores')
            .update({ is_pro: false, pro_expires_at: new Date().toISOString() })
            .eq('id', id)
        if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 })

        await supabase
            .from('store_subscriptions')
            .update({ status: 'cancelled' })
            .eq('store_id', id)
            .eq('status', 'active')
    }

    return NextResponse.json({ ok: true })
}
