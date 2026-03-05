'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, X, ShoppingBag, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '@/contexts/CartContext'
import type { ProductsPageProps, ProductItem } from '../types'

function MinimalProductCard({ product }: { product: ProductItem }) {
    const { addToCart } = useCart()
    const [isLoading, setIsLoading] = useState(false)
    const [addedFeedback, setAddedFeedback] = useState(false)

    const imageUrl = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
    const stock = product.inventory_quantity
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
    const discount = hasDiscount ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100) : 0

    const handleAdd = async () => {
        setIsLoading(true)
        try {
            addToCart({ variantId: product.id, productId: product.id, name: product.name, price: product.price, image: imageUrl || '', quantity: 1 })
            setAddedFeedback(true)
            setTimeout(() => setAddedFeedback(false), 1500)
        } finally { setIsLoading(false) }
    }

    return (
        <div className="group">
            <div className="relative overflow-hidden aspect-[3/4] bg-[#ede9e3] mb-3">
                {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="object-cover transition-transform duration-500 group-hover:scale-[1.03] w-full h-full" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-[#c8c0b6]" />
                    </div>
                )}

                {hasDiscount && (
                    <span className="absolute top-2 left-2 text-[9px] tracking-[0.15em] uppercase bg-[#1a1714] text-[#f7f4f0] px-1.5 py-0.5">
                        -{discount}%
                    </span>
                )}
                {stock === 0 && (
                    <div className="absolute inset-0 bg-[#f7f4f0]/70 flex items-center justify-center">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-[#9a9189]">Sold out</span>
                    </div>
                )}

                {/* Quick add — slides up on hover */}
                {stock > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <button
                            onClick={handleAdd}
                            disabled={isLoading}
                            className="w-full bg-[#1a1714] text-[#f7f4f0] text-[10px] tracking-[0.2em] uppercase py-3 hover:bg-[#2e2925] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : addedFeedback ? '✓ Added' : 'Add to bag'}
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <h3 className="text-sm text-[#1a1714] leading-snug">{product.name}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#5c5650]">KSh {product.price.toLocaleString()}</span>
                    {hasDiscount && <span className="text-xs text-[#c8c0b6] line-through">KSh {product.compare_at_price!.toLocaleString()}</span>}
                </div>
            </div>
        </div>
    )
}

export default function MinimalProductsPage({ products, loading, error, onRetry }: ProductsPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default')

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        clearTimeout((handleSearch as any)._t)
            ; (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(value), 300)
    }

    const filtered = products
        .filter(p => {
            if (!debouncedSearch.trim()) return true
            const q = debouncedSearch.toLowerCase()
            return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
        })
        .sort((a, b) => {
            if (sortBy === 'price-asc') return a.price - b.price
            if (sortBy === 'price-desc') return b.price - a.price
            return 0
        })

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f4f0] flex items-center justify-center">
                <div className="space-y-3 text-center">
                    <div className="flex gap-1 justify-center">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#c8c0b6] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                    <p className="text-xs text-[#9a9189] tracking-wider uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>Loading</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f7f4f0] flex items-center justify-center px-6">
                <div className="text-center space-y-4 max-w-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <p className="text-sm text-[#5c5650]">{error}</p>
                    {onRetry && <button onClick={onRetry} className="text-xs uppercase tracking-wider text-[#1a1714] underline underline-offset-4">Try again</button>}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f7f4f0] text-[#1a1714]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="px-6 md:px-12 lg:px-20 pt-24 pb-20">

                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-normal text-[#1a1714] mb-2 leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        All products
                    </h1>
                    <div className="h-px bg-[#e5e0d9]" />
                </div>

                {/* Filters bar */}
                <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
                    {/* Search */}
                    <div className="flex items-center gap-2 border-b border-[#c8c0b6] pb-1 focus-within:border-[#5c5650] transition-colors">
                        <Search className="w-3.5 h-3.5 text-[#c8c0b6]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Search…"
                            className="bg-transparent text-sm placeholder:text-[#c8c0b6] outline-none w-36"
                        />
                        {searchQuery && <button onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}><X className="w-3.5 h-3.5 text-[#c8c0b6]" /></button>}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="text-xs text-[#5c5650] bg-transparent border-b border-[#c8c0b6] pb-1 outline-none cursor-pointer uppercase tracking-wider"
                        >
                            <option value="default">Default</option>
                            <option value="price-asc">Price ↑</option>
                            <option value="price-desc">Price ↓</option>
                        </select>
                        <span className="text-xs text-[#c8c0b6]">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Grid */}
                {filtered.length === 0 ? (
                    <div className="py-24 text-center space-y-3">
                        <p className="text-sm text-[#9a9189]">{debouncedSearch ? `No results for "${debouncedSearch}"` : 'No products yet'}</p>
                        {debouncedSearch && <button onClick={() => { setSearchQuery(''); setDebouncedSearch('') }} className="text-xs uppercase tracking-wider text-[#5c5650] underline underline-offset-4">Clear</button>}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {filtered.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4 }}
                            >
                                <MinimalProductCard product={p} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}