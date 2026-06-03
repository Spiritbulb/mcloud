'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import type { ProductDetailData, ProductVariant } from '@/src/themes/types'
import type { ThemeComponents } from '@/src/themes/resolver'
import { trackView, trackAddToCart } from '../lib/analytics'

interface Props {
    storeSlug: string
    storeId: string
    product: ProductDetailData
    variants: ProductVariant[]
    currency: string
    ProductDetailPage: ThemeComponents['ProductDetailPage']
}

export default function ProductDetailClient({
    storeSlug,
    storeId,
    product,
    variants,
    currency,
    ProductDetailPage,
}: Props) {
    const { addToCart, itemLoadingStates } = useCart()
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
        variants.length > 0 ? variants[0] : {
            id: product.id,
            name: 'Default',
            price: product.price,
            inventory_quantity: product.inventory_quantity,
            options: {},
            sku: product.sku,
            image_url: null,
        }
    )
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
        variants.length > 0 ? (variants[0].options ?? {}) : {}
    )
    const [quantity, setQuantity] = useState(1)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    useEffect(() => {
        if (product?.id) trackView(storeSlug, product.id)
    }, [storeSlug, product.id])

    useEffect(() => {
        if (variants.length > 0 && Object.keys(selectedOptions).length > 0) {
            const variant = variants.find(v =>
                Object.entries(selectedOptions).every(([key, value]) => v.options?.[key] === value)
            )
            if (variant) setSelectedVariant(variant)
        }
    }, [selectedOptions, variants])

    const handleAddToCart = async () => {
        if (!selectedVariant) return
        trackAddToCart(storeSlug, product.id)
        await addToCart({
            variantId: selectedVariant.id,
            productId: product.id,
            name: `${product.name} - ${selectedVariant.name}`,
            price: selectedVariant.price,
            image: product.images[0] || '',
            quantity,
        })
    }

    const isAddingToCart = itemLoadingStates[selectedVariant?.id ?? ''] ?? false

    return (
        <ProductDetailPage
            storeSlug={storeSlug}
            storeId={storeId}
            product={product}
            selectedVariant={selectedVariant}
            selectedOptions={selectedOptions}
            quantity={quantity}
            currentImageIndex={currentImageIndex}
            onOptionChange={(name, value) => setSelectedOptions(prev => ({ ...prev, [name]: value }))}
            onQuantityChange={setQuantity}
            onImageChange={setCurrentImageIndex}
            onAddToCart={handleAddToCart}
            isAddingToCart={isAddingToCart}
            onReviewSubmitted={() => {}}
        />
    )
}
