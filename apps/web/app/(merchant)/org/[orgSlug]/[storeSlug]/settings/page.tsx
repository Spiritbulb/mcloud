import type { Metadata } from 'next'
import { getSession } from '@mcloud/auth/server'
import { getStoreOverview } from '@/lib/store-data'
import SettingsHomeClient from './settings-home-client'

export const metadata: Metadata = {
    title: 'Settings — Overview',
}

export default async function SettingsHomePage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params

    // Fetch the overview during the server render so the dashboard arrives with
    // its data — no post-mount client round-trip, no skeleton flash.
    const session = await getSession()
    let initialData = null
    if (session?.user) {
        const result = await getStoreOverview(session.user.id, storeSlug, orgSlug)
        if (!result.error) initialData = result.data
    }

    return <SettingsHomeClient slug={storeSlug} orgSlug={orgSlug} initialData={initialData} />
}
