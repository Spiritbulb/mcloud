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
        .select('name, description, logo_url, settings')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) return { title: 'Store not found' }

    // Prefer logo, fall back to hero image for OG
    const ogImage =
        store.logo_url ??
        (store.settings as any)?.heroImage ??
        null

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

    const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!store) notFound()

    const [
        { data: products },
        { data: collections },
        { data: featuredProducts },
    ] = await Promise.all([
        // All active products
        supabase
            .from('products')
            .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, track_inventory')
            .eq('store_id', store.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

        // All active collections (excluding 'featured' — it's a special slug)
        supabase
            .from('collections')
            .select('id, name, slug, description, image_url, position')
            .eq('store_id', store.id)
            .eq('is_active', true)
            .neq('slug', 'featured')
            .order('position', { ascending: true }),

        // Featured products via collection_products join
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
            .eq('collections.store_id', store.id)
            .order('position', { ascending: true })
            .limit(8),
    ])

    // Flatten the featured join result
    const featured = (featuredProducts ?? [])
        .map((row: any) => row.products)
        .filter(Boolean)

    return (
        <StoreFront
            store={store}
            products={products ?? []}
            collections={collections ?? []}
            featuredProducts={featured.length > 0 ? featured : (products ?? []).slice(0, 8)}
        />
    )
}
