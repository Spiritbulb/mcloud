import { createClient } from '@/lib/server'
import type { Metadata } from 'next'

interface Props {
    params: Promise<{ slug: string; 'product-slug': string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, 'product-slug': productSlug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores').select('id, name')
        .eq('slug', slug).eq('is_active', true).single()
    if (!store) return { title: 'Product' }

    const { data: product } = await supabase
        .from('products').select('name, description, images')
        .eq('store_id', store.id).eq('slug', productSlug).single()
    if (!product) return { title: store.name }

    const image = (product.images as string[] | null)?.[0] ?? null

    return {
        title: `${product.name} — ${store.name}`,
        description: product.description ?? `Buy ${product.name} at ${store.name}`,
        openGraph: {
            title: `${product.name} — ${store.name}`,
            description: product.description ?? '',
            images: image ? [image] : [],
        },
    }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
