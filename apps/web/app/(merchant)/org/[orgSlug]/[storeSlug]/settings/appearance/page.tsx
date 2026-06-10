import { getStore, createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import AppearanceSettingsPage from './appearance-settings-page'

export default async function AppearancePage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const store = await getStore(slug)
    if (!store) notFound()

    const supabase = await createClient()
    const { data: theme } = await supabase
        .from('store_themes')
        .select('*')
        .eq('store_id', store.id)
        .single()

    return <AppearanceSettingsPage store={{ ...store, theme }} />
}
