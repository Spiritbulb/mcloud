import type { Metadata } from 'next'
import { getStore } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import AnalyticsClient from './analytics-client'

export const metadata: Metadata = {
    title: 'Settings — Analytics',
}

export default async function AnalyticsPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    return <AnalyticsClient slug={slug} storeName={store.name} />
}
