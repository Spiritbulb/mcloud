import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import GeneralSettingsPage from './general-settings-page'

export default async function GeneralPage({
    params,
}: {
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { storeSlug: slug } = await params
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .single()
    if (!store) notFound()

    return <GeneralSettingsPage store={store} />
}