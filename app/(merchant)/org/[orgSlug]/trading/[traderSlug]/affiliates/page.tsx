import { notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import AffiliatesClient from './affiliates-client'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; traderSlug: string }> }) {
    const { orgSlug, traderSlug } = await params
    const supabase = await createClient()

    const { data: app } = await supabase
        .from('trading_apps')
        .select('slug, faq_affiliate_link, affiliate_link')
        .eq('slug', traderSlug)
        .single()

    if (!app) notFound()

    return <AffiliatesClient app={app} orgSlug={orgSlug} traderSlug={traderSlug} />
}
