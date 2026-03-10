import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import SocialSettingsPage from './social-settings-page'

export default async function SocialPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('id, settings')
        .eq('slug', slug)
        .single()
    if (!store) notFound()

    return <SocialSettingsPage store={store} />
}