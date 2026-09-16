import type { Metadata } from 'next'
import { getSession } from '@mcloud/auth/server'
import { getDeliverySettings } from '@/lib/logistics-data'
import LogisticsSettingsClient from './logistics-settings-client'

export const metadata: Metadata = {
    title: 'Logistics',
}

export default async function LogisticsSettingsPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params

    const session = await getSession()
    let initialData = null
    if (session?.user) {
        const result = await getDeliverySettings(session.user.id, storeSlug, orgSlug)
        if (!result.error) initialData = result.data
    }

    return <LogisticsSettingsClient slug={storeSlug} orgSlug={orgSlug} initialData={initialData} />
}