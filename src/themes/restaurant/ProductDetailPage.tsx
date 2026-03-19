'use client'

import Link from 'next/link'
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Minus,
    Plus,
    ShoppingBag,
    Loader2,
} from 'lucide-react'
import type { ProductDetailPageProps } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string = 'KES') {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount)
}

// ─── Restaurant Product Detail Page ───────────────────────────────────────────

export default function RestaurantProductDetailPage({
    storeSlug,
    product,
    selectedVariant,
    selectedOptions,
    quantity,
    currentImageIndex,
    onOptionChange,
    onQuantityChange,
    onImageChange,
    onAddToCart,
    isAddingToCart,
}: ProductDetailPageProps) {
    const currentImage = product.images[currentImageIndex] ?? null
    const displayPrice = selectedVariant?.price ?? product.price
    const hasDiscount =
        product.compare_at_price && product.compare_at_price > displayPrice
    const isInStock = (selectedVariant?.inventory_quantity ?? product.inventory_quantity) > 0
    const maxQty = selectedVariant?.inventory_quantity ?? product.inventory_quantity

    const availableOptions: Record<string, Set<string>> = {}
    product.variants?.forEach((variant) => {
        Object.entries(variant.options ?? {}).forEach(([key, val]) => {
            if (!availableOptions[key]) availableOptions[key] = new Set()
            availableOptions[key].add(val)
        })
    })

    const prevImage = () => {
        if (product.images.length > 1) {
            onImageChange(
                currentImageIndex === 0
                    ? product.images.length - 1
                    : currentImageIndex - 1
            )
        }
    }

    const nextImage = () => {
        if (product.images.length > 1) {
            onImageChange(
                currentImageIndex === product.images.length - 1
                    ? 0
                    : currentImageIndex + 1
            )
        }
    }

    return (
        <div className="min-h-screen bg-[#faf7f2]">
            {/* Hero image */}
            {currentImage && (
                <div className="relative w-full h-[50vh] max-h-[520px] bg-[#f0e8e0] overflow-hidden">
                    <img
                        src={currentImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                    {/* Image nav arrows */}
                    {product.images.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-[#2c1810] flex items-center justify-center shadow-md transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={nextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-[#2c1810] flex items-center justify-center shadow-md transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {product.images.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onImageChange(i)}
                                        className={`h-1.5 rounded-full transition-all duration-200 ${
                                            i === currentImageIndex
                                                ? 'w-8 bg-white'
                                                : 'w-2 bg-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Thumbnail strip */}
            {product.images.length > 1 && (
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 flex gap-2 overflow-x-auto pb-1">
                    {product.images.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => onImageChange(i)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                                i === currentImageIndex
                                    ? 'border-[#c8622a] shadow-md'
                                    : 'border-[#e8ddd4] opacity-70 hover:opacity-100'
                            }`}
                        >
                            <img
                                src={img}
                                alt={`${product.name} ${i + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                {/* Back link */}
                <Link
                    href={`/store/${storeSlug}/products`}
                    className="inline-flex items-center gap-2 text-sm text-[#6b4c3b] hover:text-[#c8622a] transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to menu
                </Link>

                <div className="grid md:grid-cols-2 gap-10 md:gap-14">
                    {/* Left: product details */}
                    <div className="space-y-5">
                        {hasDiscount && (
                            <span className="inline-block bg-[#c8622a] text-white text-xs font-medium tracking-wide uppercase px-3 py-1 rounded-full">
                                Special offer
                            </span>
                        )}

                        <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#2c1810] leading-tight">
                            {product.name}
                        </h1>

                        {/* Price */}
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-bold text-[#c8622a]">
                                {fmt(displayPrice)}
                            </span>
                            {hasDiscount && (
                                <span className="text-lg line-through text-[#6b4c3b]/60">
                                    {fmt(product.compare_at_price!)}
                                </span>
                            )}
                        </div>

                        <div className="h-px bg-[#e8ddd4]" />

                        {/* Description */}
                        {product.description && (
                            <div className="text-[#4a2e20] leading-relaxed text-base">
                                {product.metadata?.descriptionHtml ? (
                                    <div
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: product.metadata.descriptionHtml,
                                        }}
                                    />
                                ) : (
                                    <p>{product.description}</p>
                                )}
                            </div>
                        )}

                        {/* Tags */}
                        {product.metadata?.tags && product.metadata.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {product.metadata.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-xs text-[#c8622a] bg-[#c8622a]/10 px-3 py-1 rounded-full font-medium"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: add to cart */}
                    <div className="space-y-5">
                        {/* Stock indicator */}
                        <div className="flex items-center gap-2 text-sm">
                            <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                    isInStock ? 'bg-green-500' : 'bg-red-400'
                                }`}
                            />
                            <span
                                className={isInStock ? 'text-green-700' : 'text-red-600'}
                            >
                                {isInStock
                                    ? `Available — ${maxQty} left`
                                    : 'Currently unavailable'}
                            </span>
                        </div>

                        {/* Variant options */}
                        {Object.keys(availableOptions).length > 0 && (
                            <div className="space-y-4">
                                {Object.entries(availableOptions).map(([optionName, values]) => (
                                    <div key={optionName}>
                                        <label className="block text-xs font-medium text-[#6b4c3b] uppercase tracking-wider mb-2">
                                            {optionName}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(values).map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => onOptionChange(optionName, val)}
                                                    className={`capitalize text-sm font-medium px-4 py-2 rounded-full border transition-all duration-200 ${
                                                        selectedOptions[optionName] === val
                                                            ? 'bg-[#c8622a] border-[#c8622a] text-white'
                                                            : 'bg-white border-[#e8ddd4] text-[#2c1810] hover:border-[#c8622a]'
                                                    }`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity selector */}
                        {isInStock && (
                            <div>
                                <label className="block text-xs font-medium text-[#6b4c3b] uppercase tracking-wider mb-2">
                                    Quantity
                                </label>
                                <div className="inline-flex items-center border border-[#e8ddd4] rounded-full overflow-hidden bg-white">
                                    <button
                                        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="w-10 h-10 flex items-center justify-center text-[#2c1810] hover:bg-[#faf7f2] disabled:opacity-30 transition-colors"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-10 text-center text-sm font-medium text-[#2c1810] select-none tabular-nums">
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() =>
                                            onQuantityChange(Math.min(maxQty, quantity + 1))
                                        }
                                        disabled={quantity >= maxQty}
                                        className="w-10 h-10 flex items-center justify-center text-[#2c1810] hover:bg-[#faf7f2] disabled:opacity-30 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add to order button */}
                        <button
                            onClick={onAddToCart}
                            disabled={!isInStock || isAddingToCart}
                            className="w-full flex items-center justify-center gap-2.5 bg-[#c8622a] hover:bg-[#b05520] disabled:bg-[#c8622a]/40 text-white font-medium text-base py-4 rounded-xl transition-colors duration-200 shadow-sm"
                        >
                            {isAddingToCart ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Adding to order…
                                </>
                            ) : (
                                <>
                                    <ShoppingBag className="w-5 h-5" />
                                    {isInStock ? 'Add to Order' : 'Sold Out'}
                                </>
                            )}
                        </button>

                        {isInStock && (
                            <Link
                                href={`/store/${storeSlug}/cart`}
                                className="block text-center text-sm text-[#6b4c3b] hover:text-[#c8622a] underline underline-offset-2 transition-colors"
                            >
                                View your order →
                            </Link>
                        )}

                        {/* Trust badges */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#e8ddd4]">
                            {[
                                { emoji: '🔒', label: 'Secure Payment' },
                                { emoji: '⚡', label: 'Quick Prep' },
                                { emoji: '🌿', label: 'Fresh Ingredients' },
                                { emoji: '😊', label: 'Satisfaction Guaranteed' },
                            ].map(({ emoji, label }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2 text-xs text-[#6b4c3b]"
                                >
                                    <span>{emoji}</span>
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
