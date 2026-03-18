// app/store/[slug]/page.tsx

import '@/app/store/[slug]/storefront.css'
import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import StoreFront from '@/components/store/Storefront'
import { castStore, castProducts, castCollections } from '@/lib/db-cast'

export const revalidate = 60

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('name, description, logo_url, settings')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) return { title: 'Store not found' }

    const settings = (store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings))
        ? store.settings as Record<string, unknown>
        : {}

    const ogImage = store.logo_url ?? (settings.heroImage as string | undefined) ?? null

    return {
        title: store.name,
        description: store.description ?? `Shop at ${store.name}`,
        openGraph: {
            title: store.name,
            description: store.description ?? '',
            images: ogImage ? [ogImage] : [],
        },
    }
}

export default async function StorePage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: rawStore } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!rawStore) notFound()

    const [
        { data: rawProducts },
        { data: rawCollections },
        { data: featuredRows },
    ] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, track_inventory')
            .eq('store_id', rawStore.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

        supabase
            .from('collections')
            .select('id, name, slug, description, image_url, position')
            .eq('store_id', rawStore.id)
            .eq('is_active', true)
            .neq('slug', 'featured')
            .order('position', { ascending: true }),

        supabase
            .from('collection_products')
            .select(`
                position,
                products (
                    id, name, slug, description, price, compare_at_price,
                    images, inventory_quantity, track_inventory
                )
            `)
            .eq('collections.slug', 'featured')
            .eq('collections.store_id', rawStore.id)
            .order('position', { ascending: true })
            .limit(8),
    ])

    const store = castStore(rawStore)
    const products = castProducts(rawProducts ?? [])
    const collections = castCollections(rawCollections ?? [])

    const featured = castProducts(
        (featuredRows ?? [])
            .map((row: any) => row.products)
            .filter(Boolean)
    )

    return (
        <StoreFront
            store={store}
            products={products}
            collections={collections}
            featuredProducts={featured.length > 0 ? featured : products.slice(0, 8)}
        />
    )
}