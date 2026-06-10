import { getStore } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import PaymentSettings from '@/components/store/payment-settings'

export default async function PaymentsPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    return <PaymentSettings storeId={store.id} slug={slug} />
}