'use client'

import Link from 'next/link'
import {
    ArrowLeft, CheckCircle2, Minus, Plus, Loader2,
    ChevronLeft, ChevronRight, Tag,
} from 'lucide-react'
import type { ProductDetailPageProps } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string = 'KES') {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

// ─── Services Product Detail Page ─────────────────────────────────────────────

export default function ServicesProductDetailPage({
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
    const currentImage = product.images?.[currentImageIndex] ?? null
    const isInStock = (selectedVariant?.inventory_quantity ?? product.inventory_quantity ?? 1) > 0
    const maxQty = selectedVariant?.inventory_quantity ?? 99
    const displayPrice = selectedVariant ? selectedVariant.price : product.price
    const hasDiscount =
        product.compare_at_price && product.compare_at_price > displayPrice
    const tags = product.metadata?.tags ?? []
    const features = product.metadata?.features ?? []

    // Build variant option map
    const availableOptions: Record<string, Set<string>> = {}
    product.variants?.forEach((v) => {
        Object.entries(v.options ?? {}).forEach(([key, val]) => {
            if (!availableOptions[key]) availableOptions[key] = new Set()
            availableOptions[key].add(val)
        })
    })

    const prevImage = () => {
        if (product.images.length > 1) {
            onImageChange(
                currentImageIndex === 0 ? product.images.length - 1 : currentImageIndex - 1
            )
        }
    }

    const nextImage = () => {
        if (product.images.length > 1) {
            onImageChange(
                currentImageIndex === product.images.length - 1 ? 0 : currentImageIndex + 1
            )
        }
    }

    return (
        <div
            className="min-h-screen bg-[#f8fafc] text-[#0f172a]"
            style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
        >
            {/* ── Hero image (full-width banner) ── */}
            {currentImage && (
                <div className="relative w-full h-[45vh] max-h-[440px] overflow-hidden bg-[#e2e8f0]">
                    <img
                        src={currentImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f172a]/30" />

                    {/* Prev/next */}
                    {product.images.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-[#0f172a]" />
                            </button>
                            <button
                                onClick={nextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-[#0f172a]" />
                            </button>
                            {/* Dots */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {product.images.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onImageChange(i)}
                                        className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Content ── */}
            <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">

                {/* Back link */}
                <Link
                    href={`/store/${storeSlug}/products`}
                    className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#2563eb] transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Services
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">

                    {/* ── Left: thumbnail strip (if no hero image shown, show main image here) ── */}
                    {product.images.length > 1 && (
                        <div className="lg:col-span-2 order-last lg:order-first">
                            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[520px]">
                                {product.images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onImageChange(i)}
                                        className={`flex-shrink-0 w-16 h-16 lg:w-full lg:h-20 rounded-lg overflow-hidden border-2 transition-all ${i === currentImageIndex ? 'border-[#2563eb]' : 'border-[#e2e8f0] hover:border-[#2563eb]/50'}`}
                                    >
                                        <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* If no hero image and only one image, show it in a card here */}
                    {!currentImage && product.images.length > 0 && (
                        <div className="lg:col-span-5 order-first lg:order-first">
                            <div className="rounded-xl overflow-hidden border border-[#e2e8f0] bg-[#f1f5f9] aspect-square">
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    )}

                    {/* ── Right: Service info ── */}
                    <div className={`${product.images.length > 1 ? 'lg:col-span-10' : product.images.length === 1 && !currentImage ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6`}>

                        {/* Name + price */}
                        <div>
                            {hasDiscount && (
                                <span className="inline-block text-xs font-semibold bg-[#fef3c7] text-[#92400e] px-2.5 py-0.5 rounded mb-3">
                                    Special Rate
                                </span>
                            )}
                            <h1 className="text-3xl md:text-4xl font-bold text-[#0f172a] leading-tight tracking-tight mb-3">
                                {product.name}
                            </h1>
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-bold text-[#0f172a]">
                                    {fmt(displayPrice)}
                                </span>
                                {hasDiscount && (
                                    <span className="text-xl text-[#94a3b8] line-through">
                                        {fmt(product.compare_at_price!)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-[#e2e8f0]" />

                        {/* What's included */}
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#64748b] mb-4">
                                What's Included
                            </h2>
                            {product.metadata?.descriptionHtml ? (
                                <div
                                    className="prose prose-sm prose-slate max-w-none text-[#475569] leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: product.metadata.descriptionHtml }}
                                />
                            ) : product.description ? (
                                <div className="space-y-2">
                                    {product.description.split('\n').filter(Boolean).map((line, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <CheckCircle2 className="w-4 h-4 text-[#2563eb] flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-[#475569] leading-relaxed">{line}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[#94a3b8]">No description provided.</p>
                            )}
                        </div>

                        {/* Features from metadata */}
                        {features.length > 0 && (
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-widest text-[#64748b] mb-4">
                                    Features
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {features.map((feat: string) => (
                                        <div key={feat} className="flex items-start gap-2 bg-[#eff6ff] rounded-lg px-3 py-2.5">
                                            <CheckCircle2 className="w-4 h-4 text-[#2563eb] flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-[#1e40af] font-medium">{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Variant options */}
                        {Object.keys(availableOptions).length > 0 && (
                            <div className="space-y-4">
                                {Object.entries(availableOptions).map(([optName, vals]) => (
                                    <div key={optName}>
                                        <label className="text-xs font-semibold uppercase tracking-widest text-[#64748b] block mb-2">
                                            {optName}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(vals).map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => onOptionChange(optName, val)}
                                                    className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${selectedOptions[optName] === val
                                                        ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                                        : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#2563eb]/50'}`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Availability */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className={isInStock ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                                {isInStock ? 'Available' : 'Currently unavailable'}
                            </span>
                        </div>

                        {/* Quantity + CTA */}
                        {isInStock && (
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="inline-flex items-center border border-[#e2e8f0] rounded-lg overflow-hidden bg-white">
                                    <button
                                        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="w-10 h-11 flex items-center justify-center text-[#0f172a] hover:bg-[#f8fafc] disabled:opacity-30 transition-colors"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="px-4 text-sm font-semibold text-[#0f172a] select-none min-w-[3rem] text-center tabular-nums">
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() => onQuantityChange(Math.min(maxQty, quantity + 1))}
                                        disabled={quantity >= maxQty}
                                        className="w-10 h-11 flex items-center justify-center text-[#0f172a] hover:bg-[#f8fafc] disabled:opacity-30 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                <button
                                    onClick={onAddToCart}
                                    disabled={isAddingToCart}
                                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white font-bold px-8 py-3 rounded-lg transition-colors text-base shadow-md"
                                >
                                    {isAddingToCart ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" />Adding…</>
                                    ) : (
                                        <>Book Now</>
                                    )}
                                </button>
                            </div>
                        )}

                        {!isInStock && (
                            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-5 py-4 text-sm text-[#b91c1c]">
                                This service is not currently available. Please check back later.
                            </div>
                        )}

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="pt-4 border-t border-[#e2e8f0]">
                                <p className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-3">
                                    <Tag className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                                    Features
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
