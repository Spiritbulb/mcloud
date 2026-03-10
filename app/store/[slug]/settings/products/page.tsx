import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import ProductSettings from '@/components/store/product-settings'

export default async function ProductsPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('id, currency')
        .eq('slug', slug)
        .single()
    if (!store) notFound()

    return <ProductSettings storeId={store.id} currency={store.currency} />
}