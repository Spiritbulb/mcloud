import '@/app/store/[slug]/storefront.css'
import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import { castStore, castProducts } from '@/lib/db-cast'
import { engine } from '@/lib/liquid'

export const revalidate = 60

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('name, description')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

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
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (!rawStore) notFound()

    const { data: rawProducts } = await supabase
        .from('products')
        .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, track_inventory, sku, metadata')
        .eq('store_id', rawStore.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100)

    const store = castStore(rawStore)
    const products = castProducts(rawProducts ?? [])

    const html = await engine.renderFile('classic/templates/products', {
        store,
        products,
    })

    return <div data-liquid dangerouslySetInnerHTML={{ __html: html }} />
}