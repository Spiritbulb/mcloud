import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import StoreFront from '@/components/store/Storefront'

export const revalidate = 60

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('name, description, logo_url')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) return { title: 'Store not found' }

    return {
        title: store.name,
        description: store.description ?? `Shop at ${store.name}`,
        openGraph: {
            title: store.name,
            description: store.description ?? '',
            images: store.logo_url ? [store.logo_url] : [],
        },
    }
}

export default async function StorePage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) notFound()

    const [{ data: products }, { data: collections }] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, track_inventory')
            .eq('store_id', store.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

        supabase
            .from('collections')
            .select('id, name, slug, description, image_url, position')
            .eq('store_id', store.id)
            .eq('is_active', true)
            .order('position', { ascending: true }),
    ])

    return (
        <StoreFront
            store={store}
            products={products ?? []}
            collections={collections ?? []}
        />
    )
}
