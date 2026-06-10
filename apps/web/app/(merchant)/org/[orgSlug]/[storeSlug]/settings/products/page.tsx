import { getStore } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import ProductSettings from '@/components/store/product-settings'

export default async function ProductsPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    return <ProductSettings storeId={store.id} currency={store.currency} />
}