// @route-kind: admin
// app/api/admin/subscriptions/activate/route.ts
import { isPaidPlan } from '@mcloud/merchant/plans'
import { getStorePlan } from '@mcloud/merchant/plans-server'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'
import { revalidateStorefrontById } from '@/lib/revalidate-storefront'
import { recordAudit } from '@/lib/audit'
import { clientIp } from '@/lib/audit-logic'

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

    const { subscription_id, store_id } = await request.json()

    const { data: prev } = await supabase
        .from('store_subscriptions')
        .select('status')
        .eq('id', subscription_id)
        .maybeSingle()

    const { error } = await supabase
        .from('store_subscriptions')
        .update({ status: 'active' })
        .eq('id', subscription_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // is_pro is a legacy cache of the resolved plan; keep it in step with the subscription rows.
    const plan = await getStorePlan(store_id)
    await supabase
        .from('stores')
        .update({ is_pro: isPaidPlan(plan) })
        .eq('id', store_id)

    await revalidateStorefrontById(store_id)
    await recordAudit({
        actor: auth.user,
        action: 'subscription.activate',
        targetType: 'subscription',
        targetId: String(subscription_id),
        summary: `Activated subscription for store ${store_id} (plan now ${plan})`,
        before: { status: prev?.status ?? null },
        after: { status: 'active', plan, store_id },
        ip: clientIp(request.headers),
    })
    return NextResponse.json({ ok: true })
}