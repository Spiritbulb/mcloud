import type { Metadata } from 'next'
import { getSession } from '@mcloud/auth/server'
import { getTrackingOrders } from '@/lib/logistics-data'
import TrackingClient from './tracking-client'

export const metadata: Metadata = {
    title: 'Track orders',
}

export default async function TrackingPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params

    const session = await getSession()
    let initialData = null
    if (session?.user) {
        const result = await getTrackingOrders(session.user.id, storeSlug, orgSlug)
        if (!result.error) initialData = result.data
    }

    return <TrackingClient slug={storeSlug} orgSlug={orgSlug} initialData={initialData} />
}