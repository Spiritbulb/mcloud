import type { Metadata } from 'next'
import { getSession } from '@mcloud/auth/server'
import { getStoreOverview, getStoreSettingsData } from '@mcloud/merchant/store-data'
import { resolveThemeId, type StoreThemeId } from '@/lib/store-themes'
import SettingsHomeClient from './settings-home-client'

export const metadata: Metadata = {
    title: 'Overview',
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
    let themeId: StoreThemeId | null = null
    if (session?.user) {
        const [overview, settings] = await Promise.all([
            getStoreOverview(session.user.id, storeSlug, orgSlug),
            // Access-checked like the overview; only the theme id leaves the server.
            getStoreSettingsData(session.user.id, storeSlug, orgSlug),
        ])
        if (!overview.error) initialData = overview.data
        if (!settings.error && settings.data) themeId = resolveThemeId(settings.data.settings)
    }

    return <SettingsHomeClient slug={storeSlug} orgSlug={orgSlug} initialData={initialData} themeId={themeId} />
}
