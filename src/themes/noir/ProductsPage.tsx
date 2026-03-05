'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, X, ShoppingBag, Loader2, BadgeCheck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '@/contexts/CartContext'
import type { ProductsPageProps, ProductItem } from '../types'

// Re-export Grain from shared location or inline
function Grain() {
    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[100] opacity-[0.032] mix-blend-overlay"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            }}
        />
    )
}

function NoirProductCard({ product }: { product: ProductItem }) {
    const { addToCart } = useCart()
    const [isLoading, setIsLoading] = useState(false)
    const [hovered, setHovered] = useState(false)

    const imageUrl = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
    const stock = product.inventory_quantity
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
    const discount = hasDiscount ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100) : 0

    const handleAdd = async () => {
        setIsLoading(true)
        try {
            addToCart({ variantId: product.id, productId: product.id, name: product.name, price: product.price, image: imageUrl || '', quantity: 1 })
        } finally { setIsLoading(false) }
    }

    return (
        <div
            className="group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Image */}
            <div className="relative overflow-hidden aspect-[3/4] bg-[#0e0e0e]">
                {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-85 group-hover:opacity-100 w-full h-full" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-[#2a2a2a]" />
                    </div>
                )}

                {hasDiscount && (
                    <span className="absolute top-3 right-3 text-[9px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-2 py-1 bg-black/80">
                        -{discount}%
                    </span>
                )}
                {stock === 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[9px] tracking-[0.3em] uppercase text-[#666] border border-[#333] px-3 py-1.5">Sold out</span>
                    </div>
                )}

                {/* Add to cart — appears on hover */}
                {stock > 0 && (
                    <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
                        transition={{ duration: 0.25 }}
                        onClick={handleAdd}
                        disabled={isLoading}
                        className="absolute bottom-4 left-4 right-4 bg-[#c9a96e] text-black text-[10px] tracking-[0.3em] uppercase py-2.5 hover:bg-[#e0c084] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Add to cart
                    </motion.button>
                )}
            </div>

            {/* Text */}
            <div className="pt-3 space-y-0.5">
                <h3 className="text-sm font-light text-[#e8e2d9] leading-snug tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {product.name}
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#c9a96e] tracking-wide">KSh {product.price.toLocaleString()}</span>
                    {hasDiscount && <span className="text-xs text-[#444] line-through">KSh {product.compare_at_price!.toLocaleString()}</span>}
                </div>
                {stock > 0 && stock <= 5 && (
                    <p className="text-[9px] tracking-[0.2em] uppercase text-[#666] flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />{stock} remaining
                    </p>
                )}
            </div>
        </div>
    )
}

export default function NoirProductsPage({ products, loading, error, onRetry }: ProductsPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        clearTimeout((handleSearch as any)._t)
            ; (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(value), 300)
    }

    const filtered = products.filter(p => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    })

    if (loading) {
        return (
            <div className="min-h-screen bg-[#080808] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#c9a96e] to-transparent mx-auto animate-pulse" />
                    <p className="text-[9px] tracking-[0.4em] uppercase text-[#555]">Loading</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#080808] flex items-center justify-center px-8">
                <div className="text-center space-y-4 max-w-sm">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]">Error</p>
                    <p className="text-sm text-[#666] font-light">{error}</p>
                    {onRetry && (
                        <button onClick={onRetry} className="text-[10px] tracking-[0.3em] uppercase text-[#e8e2d9] border-b border-[#c9a96e]/50 pb-0.5 hover:border-[#c9a96e] transition-colors">
                            Try again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#080808] text-[#e8e2d9]" style={{ fontFamily: "'Jost', sans-serif" }}>
            <Grain />

            <div className="px-8 md:px-16 lg:px-24 pt-28 pb-20">
                {/* Header */}
                <div className="mb-16 flex items-end justify-between gap-6 flex-wrap">
                    <div>
                        <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e] mb-3">The full edit</p>
                        <h1
                            className="text-6xl md:text-8xl font-normal uppercase leading-none text-white"
                            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                        >
                            All Pieces
                        </h1>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-3 border-b border-[#222] pb-1">
                        <Search className="w-3.5 h-3.5 text-[#555]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Search the collection…"
                            className="bg-transparent text-sm text-[#e8e2d9] placeholder:text-[#444] outline-none w-48 tracking-wide"
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}>
                                <X className="w-3.5 h-3.5 text-[#555] hover:text-[#c9a96e] transition-colors" />
                            </button>
                        )}
                    </div>
                </div>

                {debouncedSearch && (
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#555] mb-10">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{debouncedSearch}"
                    </p>
                )}

                {/* Grid */}
                {filtered.length === 0 ? (
                    <div className="py-32 text-center">
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#333]">No pieces found</p>
                        {debouncedSearch && (
                            <button onClick={() => { setSearchQuery(''); setDebouncedSearch('') }} className="mt-4 text-[10px] tracking-[0.2em] uppercase text-[#c9a96e] hover:text-[#e8e2d9] transition-colors">
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
                            {filtered.map((product, i) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.5 }}
                                >
                                    <NoirProductCard product={product} />
                                </motion.div>
                            ))}
                        </div>
                        <div className="mt-20 flex items-center gap-6">
                            <div className="h-px flex-1 bg-[#1a1a1a]" />
                            <p className="text-[9px] tracking-[0.3em] uppercase text-[#444]">
                                {filtered.length} of {products.length} pieces
                            </p>
                            <div className="h-px flex-1 bg-[#1a1a1a]" />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}