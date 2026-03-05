'use client'

import '@/app/store/[slug]/storefront.css'
import { useEffect, useState, useCallback } from 'react'
import { useCart } from '@/contexts/CartContext'
import { createClient } from '@/lib/client'
import ClassicProductsPage from '../../../../src/themes/classic/ProductsPage'

import type { ProductItem } from '../../../../src/themes/types'
import NoirProductsPage from '../../../../src/themes/noir/ProductsPage'
import MinimalProductsPage from '../../../../src/themes/minimal/ProductsPage'

const THEME_COMPONENTS: Record<string, React.ComponentType<any>> = {
    classic: ClassicProductsPage,
    noir: NoirProductsPage,
    minimal: MinimalProductsPage,
}


export default function ProductsPage() {
    const { storeSlug } = useCart()
    const supabase = createClient()

    const [products, setProducts] = useState<ProductItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [themeId, setThemeId] = useState<string>('classic')

    const fetchData = useCallback(async () => {
        try {
            setError(null)
            setLoading(true)
            if (!storeSlug) throw new Error('Store slug not available')

            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('id, settings, theme:store_themes(theme_id)')
                .eq('slug', storeSlug)
                .eq('is_active', true)
                .single()

            if (storeError || !store) throw new Error('Store not found')

            // Resolve theme
            const resolvedTheme = (store as any).theme?.theme_id ?? (store.settings as any)?.themeId ?? 'classic'
            setThemeId(resolvedTheme)

            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, is_active, sku, metadata')
                .eq('store_id', store.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(100)

            if (productsError) throw productsError

            const fetched = productsData || []
            if (fetched.length === 0) setError('No products available at the moment')
            setProducts(fetched)
        } catch (err: any) {
            console.error('Error fetching products:', err)
            setError(err.message || 'Failed to load products. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [storeSlug, supabase])

    useEffect(() => { fetchData() }, [fetchData])

    const PageComponent = THEME_COMPONENTS[themeId] ?? ClassicProductsPage

    return (
        <PageComponent
            storeSlug={storeSlug ?? ''}
            products={products}
            loading={loading}
            error={error}
            onRetry={fetchData}
        />
    )
}