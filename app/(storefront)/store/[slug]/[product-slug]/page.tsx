import '@/app/(storefront)/store/[slug]/storefront.css'
import { createClient } from '@/lib/server'
import { notFound } from 'next/navigation'
import { resolveTheme } from '@/src/themes/resolver'
import type { ProductDetailData, ProductVariant } from '@/src/themes/types'
import ProductDetailClient from './product-detail-client'

interface Props {
    params: Promise<{ slug: string; 'product-slug': string }>
}

export default async function ProductDetailPage({ params }: Props) {
    const { slug, 'product-slug': productSlug } = await params
    const supabase = await createClient()

    const { data: rawStore } = await supabase
        .from('stores')
        .select('*, theme:store_themes(puck_pages)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
    if (!rawStore) notFound()

    const { data: productData } = await supabase
        .from('products')
        .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, is_active, sku, metadata')
        .eq('store_id', rawStore.id)
        .eq('slug', productSlug)
        .eq('is_active', true)
        .single()
    if (!productData) notFound()

    const [{ data: variantsData }, { data: reviewStats }] = await Promise.all([
        supabase
            .from('product_variants')
            .select('id, name, price, inventory_quantity, options, sku, image_url, is_active, position')
            .eq('product_id', productData.id)
            .eq('is_active', true)
            .order('position', { ascending: true }),

        supabase
            .from('product_reviews')
            .select('rating')
            .eq('store_id', rawStore.id)
            .eq('is_published', true),
    ])

    const reviewCount = reviewStats?.length ?? 0
    const avgRating = reviewCount
        ? reviewStats!.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount
        : null

    const product: ProductDetailData = {
        ...productData,
        variants: (variantsData ?? []) as ProductVariant[],
        reviewCount,
        avgRating,
    }

    const themeId = (rawStore.settings as any)?.themeId ?? 'classic'
    const { ProductDetailPage: ProductDetailPageComponent } = await resolveTheme(themeId)

    return (
        <ProductDetailClient
            storeSlug={slug}
            storeId={rawStore.id}
            product={product}
            variants={(variantsData ?? []) as ProductVariant[]}
            currency={rawStore.currency ?? 'KES'}
            ProductDetailPage={ProductDetailPageComponent}
        />
    )
}
