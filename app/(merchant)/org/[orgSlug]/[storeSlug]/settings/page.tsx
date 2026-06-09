import type { Metadata } from 'next'
import { auth0 } from '@/lib/auth0'
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
    const session = await auth0.getSession()
    let initialData = null
    if (session?.user) {
        const result = await getStoreOverview(session.user.sub, storeSlug)
        if (!result.error) initialData = result.data
    }

    return <SettingsHomeClient slug={storeSlug} orgSlug={orgSlug} initialData={initialData} />
}
