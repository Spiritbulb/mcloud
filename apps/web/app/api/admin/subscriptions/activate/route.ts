// @route-kind: admin
// app/api/admin/subscriptions/activate/route.ts
import { isPaidPlan } from '@mcloud/merchant/plans'
import { getStorePlan } from '@mcloud/merchant/plans-server'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

    const { subscription_id, store_id } = await request.json()

    await supabase
        .from('store_subscriptions')
        .update({ status: 'active' })
        .eq('id', subscription_id)

    // is_pro is a legacy cache of the resolved plan; keep it in step with the subscription rows.
    const plan = await getStorePlan(store_id)
    await supabase
        .from('stores')
        .update({ is_pro: isPaidPlan(plan) })
        .eq('id', store_id)

    return NextResponse.json({ ok: true })
}