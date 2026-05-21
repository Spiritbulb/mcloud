import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import BillingClient from '@/components/billing-client'

export default async function BillingPage({
    params,
    searchParams,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
    searchParams: Promise<{ upgraded?: string }>
}) {
    const { orgSlug, storeSlug } = await params
    const { upgraded } = await searchParams
    const session = await auth0.getSession()
    if (!session?.user) redirect(`/auth/login`)

    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('id, name, slug, is_pro')
        .eq('slug', storeSlug)
        .single()

    if (!store) redirect(`/org/${orgSlug}/${storeSlug}/settings`)

    if (upgraded === '1' && !store.is_pro) {
        await supabase.from('stores').update({ is_pro: true }).eq('id', store.id)
        await supabase
            .from('store_subscriptions')
            .update({ status: 'complete' })
            .eq('store_id', store.id)
            .eq('status', 'pending')
        redirect(`/org/${orgSlug}/${storeSlug}/settings/billing?activated=1`)
    }

    const { data: subscription } = await supabase
        .from('store_subscriptions')
        .select('status, amount, currency, created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return (
        <BillingClient
            store={store}
            subscription={subscription}
            justActivated={upgraded === '1'}
            slug={storeSlug}
        />
    )
}
