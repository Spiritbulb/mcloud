import { notFound } from 'next/navigation'
import { createClient } from '@/lib/server'
import GeneralClient from './general-client'

export default async function Page({ params }: { params: Promise<{ orgSlug: string; traderSlug: string }> }) {
    const { orgSlug, traderSlug } = await params
    const supabase = await createClient()

    const { data: app } = await supabase
        .from('trading_apps')
        .select('id, slug, brand_name, is_active')
        .eq('slug', traderSlug)
        .single()

    if (!app) notFound()

    return <GeneralClient app={{ ...app, is_active: app.is_active ?? false }} orgSlug={orgSlug} traderSlug={traderSlug} />
}
