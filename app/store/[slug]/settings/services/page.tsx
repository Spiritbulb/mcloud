import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import ServiceSettings from '@/components/store/service-settings'

export default async function ServicePage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id, slug, currency, settings')   // added slug + settings to match every other settings page
        .eq('slug', slug)
        .eq('is_active', true)                     // guard: only load active stores
        .single()

    if (!store) notFound()

    return (
        <ServiceSettings
            storeId={store.id}
            currency={store.currency}
        />
    )
}