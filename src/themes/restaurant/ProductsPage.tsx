'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ShoppingBag, Plus, AlertCircle } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import type { ProductsPageProps, ProductItem } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount)
}

// ─── Menu Item Row ─────────────────────────────────────────────────────────────

function MenuItemRow({
    product,
    storeSlug,
}: {
    product: ProductItem
    storeSlug: string
}) {
    const { addToCart } = useCart()
    const [adding, setAdding] = useState(false)
    const [added, setAdded] = useState(false)

    const image =
        Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : null

    const inStock = product.inventory_quantity > 0
    const hasDiscount =
        product.compare_at_price && product.compare_at_price > product.price

    const handleAdd = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!inStock || adding) return
        setAdding(true)
        try {
            addToCart({
                variantId: product.id,
                productId: product.id,
                name: product.name,
                price: product.price,
                image: image ?? '',
                quantity: 1,
            })
            setAdded(true)
            setTimeout(() => setAdded(false), 2000)
        } finally {
            setAdding(false)
        }
    }

    return (
        <Link
            href={`/store/${storeSlug}/${product.slug}`}
            className="group flex items-center gap-4 sm:gap-5 bg-white hover:bg-[#fff8f3] border border-[#e8ddd4] hover:border-[#c8622a]/30 rounded-xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md"
        >
            {/* Image */}
            <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#f0e8e0]">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍽️
                    </div>
                )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2c1810] group-hover:text-[#c8622a] transition-colors line-clamp-1">
                            {product.name}
                        </h3>
                        {product.description && (
                            <p className="text-sm text-[#6b4c3b] mt-1 line-clamp-2 leading-relaxed">
                                {product.description}
                            </p>
                        )}
                        {!inStock && (
                            <span className="inline-block mt-1.5 text-xs font-medium text-[#c8622a]/70 bg-[#c8622a]/10 px-2.5 py-0.5 rounded-full">
                                Sold out
                            </span>
                        )}
                    </div>

                    {/* Price + add button */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <div className="text-right">
                            <span className="text-lg font-bold text-[#c8622a]">
                                {fmt(product.price, 'KES')}
                            </span>
                            {hasDiscount && (
                                <p className="text-xs text-[#6b4c3b]/60 line-through">
                                    {fmt(product.compare_at_price!, 'KES')}
                                </p>
                            )}
                        </div>
                        {inStock && (
                            <button
                                onClick={handleAdd}
                                disabled={adding}
                                className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${added
                                        ? 'bg-green-600 text-white'
                                        : 'bg-[#c8622a] hover:bg-[#b05520] text-white'
                                    }`}
                            >
                                {adding ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : added ? (
                                    '✓ Added'
                                ) : (
                                    <>
                                        <Plus className="w-3.5 h-3.5" />
                                        Add to order
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}

// ─── Restaurant Products Page ──────────────────────────────────────────────────

export default function RestaurantProductsPage({
    storeSlug,
    products,
    loading,
    error,
    onRetry,
}: ProductsPageProps) {
    const [activeCategory, setActiveCategory] = useState<string>('all')

    // Derive category pills from product names (first word as rough category proxy)
    const categories = ['all', ...Array.from(new Set(
        products.map((p) => p.name.split(' ')[0]).filter(Boolean)
    )).slice(0, 8)]

    const filtered =
        activeCategory === 'all'
            ? products
            : products.filter((p) =>
                p.name.toLowerCase().startsWith(activeCategory.toLowerCase())
            )

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#c8622a]" />
                    <p className="text-[#6b4c3b] font-light">Loading menu…</p>
                </div>
            </div>
        )
    }

    // ── Error ──
    if (error) {
        return (
            <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-4">
                <div className="bg-white border border-[#e8ddd4] rounded-xl p-8 max-w-sm w-full text-center space-y-4 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-[#c8622a] mx-auto" />
                    <h3 className="font-serif text-xl font-bold text-[#2c1810]">
                        Couldn't load menu
                    </h3>
                    <p className="text-sm text-[#6b4c3b]">{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="bg-[#c8622a] hover:bg-[#b05520] text-white font-medium px-6 py-2.5 rounded-full text-sm transition-colors"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#faf7f2]">
            {/* Header */}
            <div className="bg-[#2c1810] text-[#faf7f2] py-12 px-4 text-center">
                <span className="inline-block text-[#c8622a] text-sm font-medium tracking-widest uppercase mb-3">
                    Our Offerings
                </span>
                <h1 className="font-serif text-4xl md:text-5xl font-bold">
                    The Menu
                </h1>
                <div className="mt-4 flex items-center justify-center gap-3">
                    <div className="h-px w-12 bg-[#c8622a]/50" />
                    <span className="text-[#c8622a]">✦</span>
                    <div className="h-px w-12 bg-[#c8622a]/50" />
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                {/* Category filter pills */}
                {categories.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`capitalize text-sm font-medium px-4 py-2 rounded-full border transition-all duration-200 ${activeCategory === cat
                                        ? 'bg-[#c8622a] border-[#c8622a] text-white shadow-sm'
                                        : 'bg-white border-[#e8ddd4] text-[#2c1810] hover:border-[#c8622a] hover:text-[#c8622a]'
                                    }`}
                            >
                                {cat === 'all' ? 'All Items' : cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Menu items */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20 space-y-4">
                        <ShoppingBag className="w-12 h-12 mx-auto text-[#c8622a]/30" />
                        <p className="font-serif text-xl text-[#2c1810]">Nothing here yet</p>
                        <p className="text-sm text-[#6b4c3b]">
                            {activeCategory !== 'all'
                                ? 'No items in this category.'
                                : 'Our menu is coming soon. Check back shortly!'}
                        </p>
                        {activeCategory !== 'all' && (
                            <button
                                onClick={() => setActiveCategory('all')}
                                className="text-sm text-[#c8622a] underline underline-offset-2"
                            >
                                View all items
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((product) => (
                            <MenuItemRow
                                key={product.id}
                                product={product}
                                storeSlug={storeSlug}
                            />
                        ))}
                    </div>
                )}

                {filtered.length > 0 && (
                    <p className="text-center text-xs text-[#6b4c3b] mt-8">
                        Showing {filtered.length} of {products.length} items
                    </p>
                )}
            </div>
        </div>
    )
}
