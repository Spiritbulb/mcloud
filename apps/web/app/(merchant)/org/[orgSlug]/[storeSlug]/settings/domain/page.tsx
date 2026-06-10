import { getStore } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import DomainSettings from '@/components/store/domain-settings'

export default async function DomainPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    return <DomainSettings storeId={store.id} currentDomain={store.custom_domain} />
}