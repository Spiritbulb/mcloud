import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import BillingClient from './billing-client'

export default async function OrgBillingPage({
    params,
}: {
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/billing`))

    const userId = session.user.id
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', userId)
        .maybeSingle()

    if (!membership) notFound()

    const canManage = membership.role === 'owner' || membership.role === 'admin'

    const [{ data: wallet }, { data: stores }] = await Promise.all([
        supabase
            .from('org_wallets')
            .select('balance_cents')
            .eq('org_id', org.id)
            .maybeSingle(),
        supabase
            .from('stores')
            .select('id, name, slug, logo_url, is_pro, pro_expires_at')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false }),
    ])

    const storeList = stores ?? []

    // Latest subscription row per store, so each card can show real
    // period_end / status rather than relying only on the is_pro flag.
    type SubscriptionRow = {
        store_id: string
        plan: string | null
        status: string
        period_end: string | null
        created_at: string | null
    }

    const { data: subs } = storeList.length
        ? await supabase
            .from('store_subscriptions')
            .select('store_id, plan, status, period_end, created_at')
            .in('store_id', storeList.map((s) => s.id))
            .order('created_at', { ascending: false })
        : { data: [] as SubscriptionRow[] }

    const latestSubByStore = new Map<string, SubscriptionRow>()
    for (const row of subs ?? []) {
        if (!latestSubByStore.has(row.store_id)) latestSubByStore.set(row.store_id, row)
    }

    const storesWithPlan = storeList.map((s) => ({
        ...s,
        subscription: latestSubByStore.get(s.id) ?? null,
    }))

    return (
        <BillingClient
            orgSlug={orgSlug}
            orgName={org.name}
            balanceCents={wallet?.balance_cents ?? 0}
            stores={storesWithPlan}
            canManage={canManage}
        />
    )
}