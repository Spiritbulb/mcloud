'use client'

import Link from 'next/link'
import { Minus, Plus, Loader2 } from 'lucide-react'
import type { ProductDetailPageProps } from '../types'

function fmt(amount: number, currency: string = 'KES') {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

export default function PhotographyProductDetailPage({
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
    const displayPrice = selectedVariant?.price ?? product.price
    const isInStock = selectedVariant
        ? selectedVariant.inventory_quantity > 0
        : (product.inventory_quantity > 0)
    const maxQty = selectedVariant?.inventory_quantity ?? product.inventory_quantity
    const hasDiscount = product.compare_at_price && product.compare_at_price > displayPrice

    const availableOptions: Record<string, Set<string>> = {}
    product.variants?.forEach(v => {
        Object.entries(v.options || {}).forEach(([k, val]) => {
            if (!availableOptions[k]) availableOptions[k] = new Set()
            availableOptions[k].add(val)
        })
    })

    const images = product.images ?? []
    const mainImage = images[currentImageIndex] ?? null

    return (
        <div
            className="min-h-screen bg-[#0c0c0c] text-[#f2f2f2]"
            style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
        >
            <div className="px-6 md:px-12 lg:px-20 pt-20 pb-20">
                {/* Back link */}
                <Link
                    href={`/store/${storeSlug}/products`}
                    className="inline-flex items-center gap-2 text-[9px] tracking-[0.35em] uppercase text-[#555] hover:text-[#c8965a] transition-colors mb-12 group"
                >
                    <span className="transition-transform group-hover:-translate-x-1 inline-block">←</span>
                    All Works
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-20">

                    {/* ── Left: Image Gallery ── */}
                    <div className="space-y-3">
                        {/* Main image */}
                        <div className="relative aspect-square bg-[#181818] overflow-hidden">
                            {mainImage ? (
                                <img
                                    src={mainImage}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-[#333] text-xs tracking-widest uppercase">No image</span>
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onImageChange(i)}
                                        className="flex-shrink-0 w-16 h-16 overflow-hidden border-b-2 transition-colors duration-200"
                                        style={{
                                            borderColor: i === currentImageIndex ? '#c8965a' : 'transparent',
                                        }}
                                    >
                                        <img
                                            src={img}
                                            alt={`View ${i + 1}`}
                                            className="w-full h-full object-cover"
                                            style={{ opacity: i === currentImageIndex ? 1 : 0.5 }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Right: Product Details ── */}
                    <div className="space-y-8 lg:pt-2">

                        {/* Title */}
                        <div>
                            <h1
                                className="text-4xl md:text-5xl font-normal leading-tight text-[#f2f2f2] mb-4"
                                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                                {product.name}
                            </h1>
                            <div className="w-8 h-px bg-[#c8965a]" />
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-4">
                            <span className="text-2xl text-[#c8965a] font-light">
                                {fmt(displayPrice)}
                            </span>
                            {hasDiscount && (
                                <span className="text-base text-[#444] line-through">
                                    {fmt(product.compare_at_price!)}
                                </span>
                            )}
                        </div>

                        {/* Description */}
                        {product.description && (
                            <p className="text-sm text-[#888] font-light leading-relaxed">
                                {product.description}
                            </p>
                        )}

                        {/* Stock status */}
                        <div className="flex items-center gap-2">
                            <div
                                className="w-1.5 h-1.5"
                                style={{ backgroundColor: isInStock ? '#4a9a5c' : '#c8965a' }}
                            />
                            <span className="text-[9px] tracking-[0.25em] uppercase text-[#666]">
                                {isInStock
                                    ? `${maxQty} available`
                                    : 'Sold out'}
                            </span>
                        </div>

                        <div className="h-px bg-[#1c1c1c]" />

                        {/* Variant options */}
                        {Object.keys(availableOptions).length > 0 && (
                            <div className="space-y-5">
                                {Object.entries(availableOptions).map(([name, values]) => (
                                    <div key={name}>
                                        <p className="text-[9px] tracking-[0.35em] uppercase text-[#555] mb-3">{name}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(values).map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => onOptionChange(name, val)}
                                                    className="px-4 py-1.5 text-[10px] tracking-widest uppercase border transition-all duration-200"
                                                    style={{
                                                        borderColor: selectedOptions[name] === val ? '#c8965a' : '#2a2a2a',
                                                        color: selectedOptions[name] === val ? '#c8965a' : '#666',
                                                        backgroundColor: selectedOptions[name] === val ? 'rgba(200,150,90,0.06)' : 'transparent',
                                                    }}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity */}
                        {isInStock && (
                            <div className="flex items-center gap-6">
                                <p className="text-[9px] tracking-[0.35em] uppercase text-[#555]">Qty</p>
                                <div className="flex items-center border border-[#1e1e1e]">
                                    <button
                                        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="w-9 h-9 flex items-center justify-center text-[#666] hover:text-[#f2f2f2] disabled:opacity-30 transition-colors"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-10 text-center text-sm tabular-nums text-[#f2f2f2]">
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() => onQuantityChange(Math.min(maxQty || 999, quantity + 1))}
                                        disabled={quantity >= maxQty}
                                        className="w-9 h-9 flex items-center justify-center text-[#666] hover:text-[#f2f2f2] disabled:opacity-30 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add to Cart CTA */}
                        <button
                            onClick={onAddToCart}
                            disabled={!isInStock || isAddingToCart}
                            className="w-full py-4 text-[10px] tracking-[0.4em] uppercase font-medium transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: isInStock ? '#c8965a' : '#1c1c1c',
                                color: isInStock ? '#0c0c0c' : '#555',
                            }}
                        >
                            {isAddingToCart && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isInStock ? 'Add to Cart' : 'Sold Out'}
                        </button>

                        {/* Tags */}
                        {product.metadata?.tags && product.metadata.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {product.metadata.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="text-[9px] tracking-[0.2em] uppercase text-[#444] border border-[#1e1e1e] px-2 py-1"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
