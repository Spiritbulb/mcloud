import { notFound } from 'next/navigation'
import { createClient } from '@mcloud/db/server'
import DomainClient from './domain-client'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; traderSlug: string }> }) {
    const { orgSlug, traderSlug } = await params
    const supabase = await createClient()

    const { data: app } = await supabase
        .from('trading_apps')
        .select('slug, custom_domain')
        .eq('slug', traderSlug)
        .single()

    if (!app) notFound()

    return <DomainClient app={app} orgSlug={orgSlug} traderSlug={traderSlug} />
}
