// @route-kind: admin
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'
import { revalidateStorefrontById } from '@/lib/revalidate-storefront'
import { getStorePlan } from '@mcloud/merchant/plans-server'
import { recordAudit } from '@/lib/audit'
import { clientIp } from '@/lib/audit-logic'

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

    const before = await getStorePlan(id)

    if (action === 'grant') {
        // Subscription first, and every write checked. This used to flip the store's legacy is_pro
        // flag first and ignore the subscription insert's result, so when the insert failed (the
        // provider check constraint did not allow 'admin') the store was left flagged but with no
        // subscription: Free, with a "successful" response. The subscription is what grants the plan.
        const { data: existingGrant } = await supabase
            .from('store_subscriptions')
            .select('id')
            .eq('store_id', id)
            .eq('provider', 'admin')
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

        // An admin grant owns its own row: update this store's active admin grant, or add one.
        // It never rewrites a paid (wallet) subscription row, which would corrupt billing history.
        if (existingGrant) {
            const { error } = await supabase.from('store_subscriptions').update({ plan }).eq('id', existingGrant.id)
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        } else {
            const { data: store } = await supabase
                .from('stores')
                .select('currency')
                .eq('id', id)
                .single()
            const { error } = await supabase
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
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const { error: storeErr } = await supabase
            .from('stores')
            .update({ is_pro: true, pro_since: new Date().toISOString(), pro_expires_at: null })
            .eq('id', id)
        if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 })
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

    await revalidateStorefrontById(id)
    const after = await getStorePlan(id)
    await recordAudit({
        actor: auth.user,
        action: action === 'grant' ? 'store.plan.grant' : 'store.plan.revoke',
        targetType: 'store',
        targetId: id,
        summary: action === 'grant' ? `Granted ${plan} (was ${before})` : `Revoked paid plan (was ${before})`,
        before: { plan: before },
        after: { plan: after },
        ip: clientIp(request.headers),
    })
    return NextResponse.json({ ok: true })
}
