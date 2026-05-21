import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import AppearanceSettingsPage from './appearance-settings-page'

export default async function AppearancePage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug } = await params
    const slug = storeSlug
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('*, theme:store_themes(*)')
        .eq('slug', slug)
        .single()
    if (!store) notFound()

    return <AppearanceSettingsPage store={store} />
}