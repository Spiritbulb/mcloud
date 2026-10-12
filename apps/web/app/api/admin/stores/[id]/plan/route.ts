// @route-kind: admin
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

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

        // An admin grant owns its own row: update this store's active admin grant, or add one.
        // It never rewrites a paid (wallet) subscription row, which would corrupt billing history.
        const { data: existingGrant } = await supabase
            .from('store_subscriptions')
            .select('id')
            .eq('store_id', id)
            .eq('provider', 'admin')
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

        if (existingGrant) {
            await supabase.from('store_subscriptions').update({ plan }).eq('id', existingGrant.id)
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
