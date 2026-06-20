import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import { redirect } from 'next/navigation'
import BillingClient from '@/components/billing-client'

export default async function BillingPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/${storeSlug}/settings/billing`))

    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('id, name, slug, is_pro')
        .eq('slug', storeSlug)
        .single()

    if (!store) redirect(`/org/${orgSlug}/${storeSlug}/settings`)

    const { data: subscription } = await supabase
        .from('store_subscriptions')
        .select('status, amount, currency, created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return <BillingClient store={store} subscription={subscription} />
}
