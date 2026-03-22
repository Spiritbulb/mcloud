'use client'

import '@/app/store/[slug]/storefront.css'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, ShoppingBag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/client'
import { useCart } from '@/contexts/CartContext'
import ClassicProductDetailPage from '../../../../src/themes/classic/ProductDetailPage'
import type { ProductDetailData, ProductVariant } from '../../../../src/themes/types'
import NoirProductDetailPage from '../../../../src/themes/noir/ProductDetailPage'
import MinimalProductDetailPage from '../../../../src/themes/minimal/ProductDetailPage'
import PhotographyProductDetailPage from '../../../../src/themes/photography/ProductDetailPage'
import PortfolioProductDetailPage from '../../../../src/themes/portfolio/ProductDetailPage'
import ServicesProductDetailPage from '../../../../src/themes/services/ProductDetailPage'
import RestaurantProductDetailPage from '../../../../src/themes/restaurant/ProductDetailPage'

const THEME_COMPONENTS: Record<string, React.ComponentType<any>> = {
    classic: ClassicProductDetailPage,
    noir: NoirProductDetailPage,
    minimal: MinimalProductDetailPage,
    photography: PhotographyProductDetailPage,
    portfolio: PortfolioProductDetailPage,
    services: ServicesProductDetailPage,
    restaurant: RestaurantProductDetailPage,
}

export default function ProductDetailContainer() {
    const params = useParams()
    const productSlug = params?.['product-slug'] as string
    const { storeSlug, addToCart, itemLoadingStates } = useCart()
    const supabase = createClient()

    const [product, setProduct] = useState<ProductDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
    const [quantity, setQuantity] = useState(1)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [themeId, setThemeId] = useState('classic')

    const fetchProduct = useCallback(async () => {
        try {
            setError(null)
            setLoading(true)
            if (!storeSlug || !productSlug) throw new Error('Store or product not available')

            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('id, settings, theme:store_themes(theme_id)')
                .eq('slug', storeSlug)
                .eq('is_active', true)
                .single()

            if (storeError || !store) throw new Error('Store not found')

            const resolvedTheme = (store as any).theme?.theme_id ?? (store.settings as any)?.themeId ?? 'classic'
            setThemeId(resolvedTheme)

            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, is_active, sku, metadata')
                .eq('store_id', store.id)
                .eq('slug', productSlug)
                .eq('is_active', true)
                .single()

            if (productError || !productData) {
                setError('Product not found')
                return
            }

            const { data: variantsData } = await supabase
                .from('product_variants')
                .select('id, name, price, inventory_quantity, options, sku, image_url, is_active, position')
                .eq('product_id', productData.id)
                .eq('is_active', true)
                .order('position', { ascending: true })

            const variants = variantsData || []
            setProduct({ ...productData, variants })

            if (variants.length > 0) {
                setSelectedVariant(variants[0])
                setSelectedOptions(variants[0].options || {})
            } else {
                setSelectedVariant({
                    id: productData.id,
                    name: 'Default',
                    price: productData.price,
                    inventory_quantity: productData.inventory_quantity,
                    options: {},
                    sku: productData.sku,
                    image_url: null,
                })
            }
        } catch (err: any) {
            console.error('Error fetching product:', err)
            setError(err.message || 'Failed to fetch product')
        } finally {
            setLoading(false)
        }
    }, [storeSlug, productSlug, supabase])

    useEffect(() => {
        if (productSlug) fetchProduct()
    }, [fetchProduct])

    useEffect(() => {
        if (product?.variants?.length && Object.keys(selectedOptions).length > 0) {
            const variant = product.variants.find((v) =>
                Object.entries(selectedOptions).every(([key, value]) => v.options?.[key] === value)
            )
            if (variant) setSelectedVariant(variant)
        }
    }, [selectedOptions, product])

    const handleAddToCart = async () => {
        if (!selectedVariant || !product) return
        await addToCart({
            variantId: selectedVariant.id,
            productId: product.id,
            name: `${product.name} - ${selectedVariant.name}`,
            price: selectedVariant.price,
            image: product.images[0] || '',
            quantity,
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: 'var(--sf-foreground)', opacity: 0.5 }} />
                    <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Loading product details...
                    </p>
                </div>
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="sf-card max-w-md w-full p-6 border space-y-3" style={{ borderColor: 'var(--sf-border-strong)' }}>
                    <p className="sf-heading font-semibold" style={{ color: 'var(--sf-foreground)' }}>Product Not Found</p>
                    <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        {error || "The product you're looking for doesn't exist."}
                    </p>
                    <Link
                        href="/products"
                        className="sf-pill sf-pill-inactive border inline-flex items-center gap-2 px-4 py-2 text-sm mt-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Products
                    </Link>
                </div>
            </div>
        )
    }

    const PageComponent = THEME_COMPONENTS[themeId] ?? ClassicProductDetailPage
    const variantLoading = selectedVariant?.id ? itemLoadingStates[selectedVariant.id] : false

    return (
        <PageComponent
            storeSlug={storeSlug ?? ''}
            product={product}
            selectedVariant={selectedVariant}
            selectedOptions={selectedOptions}
            quantity={quantity}
            currentImageIndex={currentImageIndex}
            onOptionChange={(name: string, val: string) =>
                setSelectedOptions((prev) => ({ ...prev, [name]: val }))
            }
            onQuantityChange={setQuantity}
            onImageChange={setCurrentImageIndex}
            onAddToCart={handleAddToCart}
            isAddingToCart={variantLoading ?? false}
        />
    )
}