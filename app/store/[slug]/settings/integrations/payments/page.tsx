import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import PaymentSettings from '@/components/store/payment-settings'

export default async function PaymentsPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .single()
    if (!store) notFound()

    return <PaymentSettings storeId={store.id} />
}