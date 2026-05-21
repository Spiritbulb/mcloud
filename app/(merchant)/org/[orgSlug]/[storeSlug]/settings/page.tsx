import type { Metadata } from 'next'
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
    return <SettingsHomeClient slug={storeSlug} orgSlug={orgSlug} />
}
