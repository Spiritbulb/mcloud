'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import type { ProductsPageProps, ProductItem } from '../types'

function fmt(amount: number, currency: string = 'KES') {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

function SkeletonCard() {
    return (
        <div className="aspect-square bg-[#181818] animate-pulse" />
    )
}

function PhotoCard({ product, storeSlug }: { product: ProductItem; storeSlug: string }) {
    const { addToCart } = useCart()
    const [hovered, setHovered] = useState(false)
    const image = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
    const inStock = product.inventory_quantity > 0

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault()
        if (!inStock) return
        addToCart({
            variantId: product.id,
            productId: product.id,
            name: product.name,
            price: product.price,
            image: image || '',
            quantity: 1,
        })
    }

    return (
        <Link
            href={`/store/${storeSlug}/${product.slug}`}
            className="block group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="relative aspect-square overflow-hidden bg-[#181818]">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[#333] text-xs tracking-widest uppercase">No image</span>
                    </div>
                )}

                {/* Hover overlay */}
                <div
                    className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 px-4"
                    style={{ opacity: hovered ? 1 : 0 }}
                >
                    <p
                        className="text-[#f2f2f2] text-sm font-serif text-center leading-snug"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        {product.name}
                    </p>
                    <p className="text-[#c8965a] text-xs tracking-widest">
                        {fmt(product.price)}
                    </p>
                    {inStock && (
                        <button
                            onClick={handleAdd}
                            className="mt-1 px-4 py-1.5 border border-[#c8965a] text-[#c8965a] text-[9px] tracking-[0.3em] uppercase hover:bg-[#c8965a] hover:text-black transition-colors duration-200"
                        >
                            Add to Cart
                        </button>
                    )}
                </div>

                {!inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-end justify-center pb-4">
                        <span className="text-[#555] text-[9px] tracking-[0.3em] uppercase border border-[#444] px-3 py-1">
                            Sold out
                        </span>
                    </div>
                )}

                {product.compare_at_price && product.compare_at_price > product.price && inStock && (
                    <span className="absolute top-3 right-3 text-[9px] tracking-[0.2em] uppercase text-[#c8965a] bg-black/80 px-2 py-0.5 border border-[#c8965a]/40">
                        Sale
                    </span>
                )}
            </div>
        </Link>
    )
}

export default function PhotographyProductsPage({ storeSlug, products, loading, error, onRetry }: ProductsPageProps) {
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0c0c0c] text-[#f2f2f2]" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
                <div className="px-6 md:px-12 lg:px-20 pt-24 pb-20">
                    <div className="mb-12">
                        <h1
                            className="text-5xl md:text-6xl font-normal text-[#f2f2f2] leading-none"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            All Works
                        </h1>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-1.5">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-6" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
                <div className="text-center space-y-4">
                    <p className="text-[10px] tracking-[0.35em] uppercase text-[#c8965a]">Error</p>
                    <p className="text-sm text-[#666] font-light">{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="text-[10px] tracking-[0.3em] uppercase text-[#f2f2f2] border-b border-[#c8965a]/50 pb-0.5 hover:border-[#c8965a] transition-colors"
                        >
                            Try again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0c0c0c] text-[#f2f2f2]" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
            <div className="px-6 md:px-12 lg:px-20 pt-24 pb-20">

                {/* Header */}
                <div className="mb-12 flex items-end justify-between">
                    <h1
                        className="text-5xl md:text-6xl font-normal text-[#f2f2f2] leading-none"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        All Works
                    </h1>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#555]">
                        {products.length} {products.length === 1 ? 'print' : 'prints'}
                    </p>
                </div>

                {/* Divider */}
                <div className="w-12 h-px bg-[#c8965a] mb-12" />

                {products.length === 0 ? (
                    <div className="py-32 text-center">
                        <p className="text-[11px] tracking-[0.3em] uppercase text-[#444]">No works available</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-1.5">
                        {products.map((product) => (
                            <PhotoCard
                                key={product.id}
                                product={product}
                                storeSlug={storeSlug}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
