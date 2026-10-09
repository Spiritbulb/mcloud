import { getStore } from '@mcloud/db/server'
import { getVertical } from '@mcloud/verticals'
import { notFound, redirect } from 'next/navigation'
import ProductSettings from '@/components/store/product-settings'

export default async function ProductsPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    // This surface only exists for verticals that sell things. The nav already
    // hides it for the others, but hidden is not the same as unreachable.
    if (!getVertical(store.type).commerce) {
        redirect(`/org/${orgSlug}/${slug}/settings`)
    }

    return <ProductSettings storeId={store.id} currency={store.currency} />
}
