import { notFound } from 'next/navigation'
import { createClient } from '@mcloud/db/server'
import AppsClient from './apps-client'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; traderSlug: string }> }) {
    const { orgSlug, traderSlug } = await params
    const supabase = await createClient()

    const { data: app } = await supabase
        .from('trading_apps')
        .select('slug, enabled_apps')
        .eq('slug', traderSlug)
        .single()

    if (!app) notFound()

    return <AppsClient app={app} orgSlug={orgSlug} traderSlug={traderSlug} />
}
