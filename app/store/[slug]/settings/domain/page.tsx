import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import DomainSettings from '@/components/store/domain-settings'

export default async function DomainPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('id, custom_domain')
        .eq('slug', slug)
        .single()
    if (!store) notFound()

    return <DomainSettings storeId={store.id} currentDomain={store.custom_domain} />
}