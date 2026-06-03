import { getStore } from '@/lib/server'
import { notFound } from 'next/navigation'
import ServiceSettings from '@/components/store/service-settings'

export default async function ServicePage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store || !store.is_active) notFound()

    return (
        <ServiceSettings
            storeId={store.id}
            currency={store.currency}
        />
    )
}