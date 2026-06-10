import { getStore } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import GeneralSettingsPage from './general-settings-page'

export default async function GeneralPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    return <GeneralSettingsPage store={store} />
}