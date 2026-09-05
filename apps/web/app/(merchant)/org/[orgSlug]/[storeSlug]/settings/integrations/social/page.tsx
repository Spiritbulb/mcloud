import { getStore } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import SocialSettingsPage from './social-settings-page'
import { getStorePlan } from '@/lib/plans-server';


export default async function SocialPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    
    if (!store) notFound()
    const plan = await getStorePlan(store.id)

    return <SocialSettingsPage store={store} plan={plan} />
}