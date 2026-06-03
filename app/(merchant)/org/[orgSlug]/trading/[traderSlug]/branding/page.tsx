import { notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import BrandingClient from './branding-client'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; traderSlug: string }> }) {
    const { orgSlug, traderSlug } = await params
    const supabase = await createClient()

    const { data: app } = await supabase
        .from('trading_apps')
        .select('slug, logo_url, primary_color')
        .eq('slug', traderSlug)
        .single()

    if (!app) notFound()

    return <BrandingClient app={app} orgSlug={orgSlug} traderSlug={traderSlug} />
}
