import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import OrderSettings from '@/components/store/order-settings'

export default async function OrdersPage({
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

    return <OrderSettings storeId={store.id} currency={store.currency} />
}