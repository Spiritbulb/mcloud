import { getStore, createClient } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import BrandSettingsPage from './brand-settings-page'
import { draftFromStore } from './brand-logic'

export default async function BrandPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    const supabase = await createClient()
    const { data: theme } = await supabase
        .from('store_themes')
        .select('primary_color, secondary_color, accent_color, background_color, heading_font, body_font')
        .eq('store_id', store.id)
        .maybeSingle()

    const settings = (store.settings ?? {}) as Record<string, unknown>
    return (
        <BrandSettingsPage
            orgSlug={orgSlug}
            slug={store.slug}
            storeId={store.id}
            name={store.name}
            initial={draftFromStore(store, settings)}
            theme={theme}
        />
    )
}
