import type { Metadata } from 'next'
import { getStore } from '@mcloud/db/server'
import { getVertical } from '@mcloud/verticals'
import { notFound, redirect } from 'next/navigation'
import { getReachStatus } from '@/lib/admin/reach-actions'
import ReachClient from './reach-client'

export const metadata: Metadata = {
    title: 'Reach marketplace',
}

export default async function ReachSettingsPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params
    const store = await getStore(storeSlug)
    if (!store) notFound()

    // Reach sells goods, so only commerce verticals get this page (hidden is not unreachable).
    if (!getVertical(store.type).commerce) redirect(`/org/${orgSlug}/${storeSlug}/settings`)

    const status = await getReachStatus(store.id)
    return <ReachClient storeId={store.id} storeName={store.name} initial={status.ok ? status : null} initialError={status.ok ? null : status.error} />
}
