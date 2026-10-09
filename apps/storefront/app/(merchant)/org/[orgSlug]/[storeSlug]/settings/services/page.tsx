import { getStore } from '@mcloud/db/server'
import { getVertical } from '@mcloud/verticals'
import { notFound, redirect } from 'next/navigation'
import ServiceSettings from '@/components/store/service-settings'

export default async function ServicePage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store || !store.is_active) notFound()

    // This surface only exists for verticals that sell things. The nav already
    // hides it for the others, but hidden is not the same as unreachable.
    if (!getVertical(store.type).commerce) {
        redirect(`/org/${orgSlug}/${slug}/settings`)
    }

    return (
        <ServiceSettings
            storeId={store.id}
            currency={store.currency}
        />
    )
}
