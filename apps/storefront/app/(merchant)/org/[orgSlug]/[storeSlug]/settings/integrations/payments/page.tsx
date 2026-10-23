import { createClient, getStore } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import PaymentSettings from '@/components/store/payment-settings'
import { getStorePlan } from '@mcloud/merchant/plans-server';

export default async function PaymentsPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    
    if (!store) notFound()
    const plan = await getStorePlan(store.id)
    // Access is checked by the settings layout, which does not render this page without it.
    const { data: org } = store.org_id
        ? await (await createClient()).from('orgs').select('name').eq('id', store.org_id).maybeSingle()
        : { data: null }
    return <PaymentSettings storeId={store.id} slug={slug} plan={plan} orgName={org?.name ?? 'Your organization'} />
}