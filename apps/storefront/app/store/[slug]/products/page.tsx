import '@/app/store/[slug]/storefront.css'
import { createClient } from '@mcloud/db/server'
import { notFound } from 'next/navigation'
import { castStore, castProductItems } from '@/lib/db-cast'
import { getReviewAggregates, withReviewAggregates } from '@/lib/reviews'
import { resolveTheme } from '@mcloud/themes/resolver'

export const revalidate = 60

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores').select('name, description')
        .eq('slug', slug).eq('is_active', true).single()
    if (!store) return { title: 'Products' }
    return {
        title: `Products — ${store.name}`,
        description: store.description ?? `Browse all products at ${store.name}`,
    }
}

export default async function ProductsPage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: rawStore } = await supabase
        .from('stores').select('*')
        .eq('slug', slug).eq('is_active', true).single()
    if (!rawStore) notFound()

    const [
        { data: rawProducts },
        { data: rawServices },
    ] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, track_inventory, sku, metadata, is_active')
            .eq('store_id', rawStore.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100),

        (supabase as any)
            .from('services')
            .select('id, name, slug, description, price, is_active, sku, metadata')
            .eq('store_id', rawStore.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(50),
    ])

    const store = castStore(rawStore)
    const baseProducts = castProductItems(rawProducts ?? [])
    const services = (rawServices ?? []) as any[]

    const aggregates = await getReviewAggregates(
        supabase,
        rawStore.id,
        baseProducts.map((p) => p.id)
    )
    const products = withReviewAggregates(baseProducts, aggregates)

    const themeId = (store?.settings?.themeId as string) ?? 'classic'
    const { ProductsPage: ProductsPageComponent } = await resolveTheme(themeId)

    return (
        <ProductsPageComponent
            storeSlug={slug}
            storeId={rawStore.id}
            products={products}
            services={services}
            currency={rawStore.currency ?? 'KES'}
        />
    )
}
