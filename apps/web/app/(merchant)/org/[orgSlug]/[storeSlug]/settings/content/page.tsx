import { redirect } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { getVertical } from '@mcloud/verticals'
import { getStoreSettingsData } from '@/lib/store-data'
import ContentClient from './content-client'

export default async function ContentPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params

    const session = await getSession()
    if (!session?.user) redirect('/auth/login')

    // getStoreSettingsData returns { error, data } where data is the stores row
    // (selected as `*`) plus user/role/allStores/org. So `type` and `settings`
    // are both present.
    const result = await getStoreSettingsData(session.user.id, storeSlug, orgSlug)
    if (result.error || !result.data) redirect(`/org/${orgSlug}/${storeSlug}/settings`)

    const store = result.data
    const vertical = getVertical(store.type)

    // Content authoring is for non-commerce verticals. A shop's home content is
    // edited under Design/General, so send a shop back rather than render an
    // empty page.
    if (vertical.commerce) redirect(`/org/${orgSlug}/${storeSlug}/settings`)

    const settings =
        store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings)
            ? (store.settings as Record<string, unknown>)
            : {}

    return <ContentClient slug={storeSlug} storeId={store.id} initialSettings={settings} />
}
