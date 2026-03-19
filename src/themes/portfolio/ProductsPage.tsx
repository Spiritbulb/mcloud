'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, X, ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import type { ProductsPageProps, ProductItem } from '../types'

function fmt(amount: number) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount)
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="border border-gray-100 bg-white animate-pulse">
            <div className="aspect-video bg-gray-100" />
            <div className="p-6 space-y-3">
                <div className="h-5 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/4 mt-4" />
            </div>
        </div>
    )
}

// ─── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ product, storeSlug }: { product: ProductItem; storeSlug: string }) {
    const image = product.images?.[0] ?? null
    const excerpt = product.description
        ? product.description.length > 100
            ? product.description.slice(0, 100).trimEnd() + '…'
            : product.description
        : null
    const inStock = product.inventory_quantity > 0

    return (
        <Link
            href={`/store/${storeSlug}/${product.slug}`}
            className="group block border border-gray-100 bg-white hover:border-[#6366f1]/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        >
            {/* Image */}
            <div className="relative overflow-hidden aspect-video bg-gray-50">
                {image ? (
                    <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-200" />
                    </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-[#6366f1]/0 group-hover:bg-[#6366f1]/8 transition-colors duration-300" />

                {/* Sold out badge */}
                {!inStock && (
                    <div className="absolute top-3 right-3 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                        Sold out
                    </div>
                )}

                {/* Discount badge */}
                {product.compare_at_price && product.compare_at_price > product.price && (
                    <div className="absolute top-3 left-3 bg-[#6366f1] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                        Sale
                    </div>
                )}

                {/* Arrow appears on hover */}
                <div className="absolute bottom-4 right-4 w-9 h-9 bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                    <ArrowRight className="w-4 h-4 text-[#6366f1]" />
                </div>
            </div>

            {/* Content */}
            <div className="p-5 md:p-6">
                <h3 className="text-base md:text-lg font-black text-[#111111] leading-tight mb-2 group-hover:text-[#6366f1] transition-colors">
                    {product.name}
                </h3>
                {excerpt && (
                    <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">{excerpt}</p>
                )}
                <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-[#111111]">{fmt(product.price)}</span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                            <span className="text-xs text-gray-300 line-through">{fmt(product.compare_at_price)}</span>
                        )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1] opacity-0 group-hover:opacity-100 transition-opacity">
                        View →
                    </span>
                </div>
            </div>
        </Link>
    )
}

// ─── Portfolio Products Page ───────────────────────────────────────────────────
export default function PortfolioProductsPage({ storeSlug, products, loading, error, onRetry }: ProductsPageProps) {
    const { cartItems } = useCart()
    const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)
    const [query, setQuery] = useState('')
    const [debounced, setDebounced] = useState('')
    const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default')

    const handleQuery = (v: string) => {
        setQuery(v)
        clearTimeout((handleQuery as any)._t)
            ; (handleQuery as any)._t = setTimeout(() => setDebounced(v), 280)
    }

    const filtered = products
        .filter(p => {
            if (!debounced.trim()) return true
            const q = debounced.toLowerCase()
            return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
        })
        .sort((a, b) => {
            if (sortBy === 'price-asc') return a.price - b.price
            if (sortBy === 'price-desc') return b.price - a.price
            return 0
        })

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-white text-[#111111] font-sans pt-16">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-24">
                    <div className="mb-16">
                        <div className="h-3 w-24 bg-gray-100 rounded mb-4 animate-pulse" />
                        <div className="h-12 w-64 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                    </div>
                </div>
            </div>
        )
    }

    // ── Error ──
    if (error) {
        return (
            <div className="min-h-screen bg-white font-sans flex items-center justify-center px-6 pt-16">
                <div className="text-center space-y-6 max-w-sm">
                    <AlertCircle className="w-10 h-10 text-[#6366f1] mx-auto" />
                    <div>
                        <h2 className="text-xl font-black text-[#111111] mb-2">Something went wrong</h2>
                        <p className="text-sm text-gray-400">{error}</p>
                    </div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center gap-2 bg-[#6366f1] text-white text-sm font-bold uppercase tracking-widest px-6 py-3 hover:bg-[#4f46e5] transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Try again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-[#111111] font-sans">

            {/* ── NAV ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                    <Link href={`/store/${storeSlug}`} className="text-base font-black tracking-tight text-[#111111] hover:text-[#6366f1] transition-colors">
                        ← Back
                    </Link>
                    <Link
                        href={`/store/${storeSlug}/cart`}
                        className="relative flex items-center gap-2 bg-[#6366f1] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-[#4f46e5] transition-colors"
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Cart
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#111111] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </div>
            </nav>

            <div className="pt-16">
                {/* ── Header ── */}
                <div className="border-b border-gray-100 py-16 md:py-24 px-6 md:px-12">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6366f1] mb-4">Portfolio</p>
                        <h1 className="text-5xl md:text-7xl font-black text-[#111111] leading-tight mb-6">
                            Our Work
                        </h1>
                        <p className="text-lg text-gray-400 max-w-xl">
                            Projects, services, and creative work available to commission or purchase.
                        </p>
                    </div>
                </div>

                {/* ── Filters ── */}
                <div className="border-b border-gray-100 py-4 px-6 md:px-12 bg-white sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                        {/* Search */}
                        <div className="flex items-center gap-3 border border-gray-200 px-4 py-2 focus-within:border-[#6366f1] transition-colors min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => handleQuery(e.target.value)}
                                placeholder="Search projects…"
                                className="text-sm text-[#111111] placeholder:text-gray-300 outline-none bg-transparent w-full"
                            />
                            {query && (
                                <button onClick={() => { setQuery(''); setDebounced('') }}>
                                    <X className="w-3.5 h-3.5 text-gray-300 hover:text-[#111111] transition-colors" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                                className="text-xs font-bold uppercase tracking-widest text-gray-400 bg-transparent border-b border-gray-200 pb-0.5 outline-none cursor-pointer hover:text-[#111111] transition-colors"
                            >
                                <option value="default">Sort: Default</option>
                                <option value="price-asc">Price: Low → High</option>
                                <option value="price-desc">Price: High → Low</option>
                            </select>
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                                {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Grid ── */}
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16">
                    {filtered.length === 0 ? (
                        <div className="py-32 text-center">
                            <ShoppingBag className="w-10 h-10 text-gray-150 mx-auto mb-5" />
                            <h3 className="text-xl font-black text-[#111111] mb-2">
                                {debounced ? `No results for "${debounced}"` : 'No projects yet'}
                            </h3>
                            {debounced && (
                                <button
                                    onClick={() => { setQuery(''); setDebounced('') }}
                                    className="mt-4 text-xs font-bold uppercase tracking-widest text-[#6366f1] hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {filtered.map(p => (
                                <ProjectCard key={p.id} product={p} storeSlug={storeSlug} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
