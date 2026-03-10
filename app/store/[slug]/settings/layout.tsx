import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import SettingsShell from './settings-shell'

async function getStore(slug: string) {
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('*, theme:store_themes(*)')
        .eq('slug', slug)
        .single()
    return store
}

export default async function SettingsLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const store = await getStore(slug)

    return <SettingsShell store={store}>{children}</SettingsShell>
}