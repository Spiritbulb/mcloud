import { notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import DerivClient from './deriv-client'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; traderSlug: string }> }) {
    const { orgSlug, traderSlug } = await params
    const supabase = await createClient()

    const { data: app } = await supabase
        .from('trading_apps')
        .select('slug, deriv_app_id, deriv_redirect_uri, deriv_oauth_scopes')
        .eq('slug', traderSlug)
        .single()

    if (!app) notFound()

    return <DerivClient app={app} orgSlug={orgSlug} traderSlug={traderSlug} />
}
