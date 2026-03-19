'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, Plus, Minus, Loader2, ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import type { ProductDetailPageProps } from '../types'

function fmt(amount: number) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount)
}

function cn(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(' ')
}

export default function PortfolioProductDetailPage({
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
    const currentPrice = selectedVariant?.price ?? product.price
    const hasDiscount = product.compare_at_price && product.compare_at_price > currentPrice
    const inStock = (selectedVariant?.inventory_quantity ?? product.inventory_quantity) > 0
    const maxQty = selectedVariant?.inventory_quantity ?? product.inventory_quantity
    const tags: string[] = product.metadata?.tags ?? []

    const availableOptions: Record<string, Set<string>> = {}
    product.variants?.forEach(v => {
        Object.entries(v.options ?? {}).forEach(([k, val]) => {
            if (!availableOptions[k]) availableOptions[k] = new Set()
            availableOptions[k].add(val)
        })
    })

    return (
        <div className="min-h-screen bg-white text-[#111111] font-sans">

            {/* ── NAV ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                    <Link
                        href={`/store/${storeSlug}/products`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#111111] transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        All Work
                    </Link>
                    <Link
                        href={`/store/${storeSlug}/cart`}
                        className="flex items-center gap-2 bg-[#6366f1] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-[#4f46e5] transition-colors"
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Cart
                    </Link>
                </div>
            </nav>

            <div className="pt-16">
                {/* ── HERO IMAGE ── */}
                {product.images.length > 0 && (
                    <div className="relative w-full h-[50vh] md:h-[60vh] bg-gray-50 overflow-hidden">
                        <img
                            src={product.images[currentImageIndex] ?? product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />

                        {/* Image navigation */}
                        {product.images.length > 1 && (
                            <>
                                <button
                                    onClick={() => onImageChange(currentImageIndex === 0 ? product.images.length - 1 : currentImageIndex - 1)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white flex items-center justify-center shadow-md transition-all hover:scale-105"
                                >
                                    <ChevronLeft className="w-5 h-5 text-[#111111]" />
                                </button>
                                <button
                                    onClick={() => onImageChange(currentImageIndex === product.images.length - 1 ? 0 : currentImageIndex + 1)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white flex items-center justify-center shadow-md transition-all hover:scale-105"
                                >
                                    <ChevronRight className="w-5 h-5 text-[#111111]" />
                                </button>

                                {/* Dot indicators */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                    {product.images.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onImageChange(i)}
                                            className={cn(
                                                'rounded-full transition-all duration-200',
                                                i === currentImageIndex
                                                    ? 'w-6 h-2 bg-white'
                                                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                                            )}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── DETAIL BLOCK ── */}
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
                    <div className="grid lg:grid-cols-2 gap-16 xl:gap-24">

                        {/* ── Left: Thumbnails (if multi-image) ── */}
                        {product.images.length > 1 && (
                            <div className="hidden lg:block">
                                <div className="grid grid-cols-3 gap-3">
                                    {product.images.map((img, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onImageChange(i)}
                                            className={cn(
                                                'aspect-video overflow-hidden border-2 transition-all duration-200',
                                                i === currentImageIndex
                                                    ? 'border-[#6366f1]'
                                                    : 'border-transparent opacity-50 hover:opacity-80 hover:border-gray-200'
                                            )}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Right: Details ── */}
                        <div className={product.images.length > 1 ? '' : 'lg:col-span-2 max-w-2xl'}>
                            {/* Eyebrow */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-6 h-0.5 bg-[#6366f1]" />
                                <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#6366f1]">
                                    {product.metadata?.productType ?? 'Project'}
                                </span>
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl md:text-5xl font-black text-[#111111] leading-tight mb-4">
                                {product.name}
                            </h1>

                            {/* Price */}
                            <div className="flex items-baseline gap-4 mb-8">
                                <span className="text-2xl font-black text-[#111111]">{fmt(currentPrice)}</span>
                                {hasDiscount && (
                                    <>
                                        <span className="text-base text-gray-300 line-through">{fmt(product.compare_at_price!)}</span>
                                        <span className="text-xs font-bold uppercase tracking-widest bg-[#6366f1] text-white px-2.5 py-1">
                                            Sale
                                        </span>
                                    </>
                                )}
                            </div>

                            <div className="w-full h-px bg-gray-100 mb-8" />

                            {/* Description */}
                            {product.description && (
                                <div className="mb-8">
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        {product.description}
                                    </p>
                                </div>
                            )}

                            {/* Tags */}
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#6366f1] border border-[#6366f1]/20 bg-[#6366f1]/5 px-3 py-1"
                                        >
                                            <Tag className="w-2.5 h-2.5" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Variant options */}
                            {Object.keys(availableOptions).length > 0 && (
                                <div className="space-y-6 mb-8">
                                    {Object.entries(availableOptions).map(([name, values]) => (
                                        <div key={name}>
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{name}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.from(values).map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => onOptionChange(name, val)}
                                                        className={cn(
                                                            'px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-all duration-150',
                                                            selectedOptions[name] === val
                                                                ? 'border-[#6366f1] bg-[#6366f1] text-white'
                                                                : 'border-gray-200 text-gray-500 hover:border-[#6366f1]/50 hover:text-[#6366f1]'
                                                        )}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Stock indicator */}
                            <div className="flex items-center gap-2 mb-6">
                                <div className={cn('w-2 h-2 rounded-full', inStock ? 'bg-green-400' : 'bg-gray-300')} />
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                    {inStock ? 'Available' : 'Sold out'}
                                </span>
                            </div>

                            {/* Quantity + Add to cart */}
                            {inStock && (
                                <div className="flex items-stretch gap-3 mb-6">
                                    {/* Qty controls */}
                                    <div className="flex items-stretch border-2 border-gray-200">
                                        <button
                                            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                            disabled={quantity <= 1}
                                            className="w-10 flex items-center justify-center text-gray-400 hover:text-[#111111] disabled:opacity-30 transition-colors"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-12 flex items-center justify-center text-sm font-black border-x-2 border-gray-200">
                                            {quantity}
                                        </span>
                                        <button
                                            onClick={() => onQuantityChange(Math.min(maxQty, quantity + 1))}
                                            disabled={quantity >= maxQty}
                                            className="w-10 flex items-center justify-center text-gray-400 hover:text-[#111111] disabled:opacity-30 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Add to cart button */}
                                    <button
                                        onClick={onAddToCart}
                                        disabled={isAddingToCart}
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#6366f1] text-white font-bold text-sm uppercase tracking-widest hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors py-3 px-6"
                                    >
                                        {isAddingToCart ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ShoppingBag className="w-4 h-4" />
                                        )}
                                        {isAddingToCart ? 'Adding…' : 'Add to Cart'}
                                    </button>
                                </div>
                            )}

                            {!inStock && (
                                <button
                                    disabled
                                    className="w-full py-4 border-2 border-gray-200 text-gray-300 font-bold text-sm uppercase tracking-widest cursor-not-allowed"
                                >
                                    Sold Out
                                </button>
                            )}

                            {/* Back link */}
                            <div className="mt-8 pt-8 border-t border-gray-100">
                                <Link
                                    href={`/store/${storeSlug}/products`}
                                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#6366f1] transition-colors group"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                    Back to all work
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
