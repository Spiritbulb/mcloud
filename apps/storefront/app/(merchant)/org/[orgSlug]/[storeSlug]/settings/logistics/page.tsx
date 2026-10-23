import type { Metadata } from 'next'
import { getSession } from '@mcloud/auth/server'
import { getStore } from '@mcloud/db/server'
import { getDeliverySettings } from '@mcloud/merchant/logistics-data'
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
    const store = initialData ? await getStore(storeSlug) : null

    return <LogisticsSettingsClient slug={storeSlug} currency={store?.currency ?? 'KES'} initialData={initialData} />
}
