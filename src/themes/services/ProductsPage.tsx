'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowRight, AlertCircle, RefreshCw, Search, X } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import type { ProductsPageProps, ProductItem } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

// ─── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({ product, storeSlug }: { product: ProductItem; storeSlug: string }) {
    const { addToCart } = useCart()
    const [adding, setAdding] = useState(false)
    const [added, setAdded] = useState(false)

    const image = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
    const inStock = !product.track_inventory || product.inventory_quantity > 0

    const handleBook = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!inStock || adding) return
        setAdding(true)
        try {
            addToCart({
                variantId: product.id,
                productId: product.id,
                name: product.name,
                price: product.price,
                image: image || '',
                quantity: 1,
            })
            setAdded(true)
            setTimeout(() => setAdded(false), 2200)
        } finally {
            setAdding(false)
        }
    }

    return (
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
            {/* Blue accent bar */}
            <div className="h-1 bg-[#2563eb]" />

            {/* Optional image */}
            {image && (
                <Link href={`/store/${storeSlug}/${product.slug}`} className="block">
                    <div className="aspect-[16/9] overflow-hidden bg-[#f1f5f9]">
                        <img
                            src={image}
                            alt={product.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </Link>
            )}

            <div className="flex flex-col flex-1 p-6 gap-4">
                <div className="flex-1">
                    <Link href={`/store/${storeSlug}/${product.slug}`}>
                        <h3 className="text-xl font-bold text-[#0f172a] leading-snug hover:text-[#2563eb] transition-colors mb-1">
                            {product.name}
                        </h3>
                    </Link>
                    {product.description && (
                        <p className="text-sm text-[#64748b] leading-relaxed line-clamp-3 mt-2">
                            {product.description}
                        </p>
                    )}
                </div>

                <div className="pt-4 border-t border-[#f1f5f9] flex items-center justify-between gap-4">
                    <div>
                        <div className="text-2xl font-bold text-[#0f172a]">
                            {fmt(product.price, 'KES')}
                        </div>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                            <div className="text-sm text-[#94a3b8] line-through">
                                {fmt(product.compare_at_price, 'KES')}
                            </div>
                        )}
                    </div>

                    {inStock ? (
                        <button
                            onClick={handleBook}
                            disabled={adding}
                            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex-shrink-0"
                        >
                            {adding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : added ? (
                                <>Added ✓</>
                            ) : (
                                <>Book / Get Started</>
                            )}
                        </button>
                    ) : (
                        <span className="text-xs font-medium text-[#94a3b8] bg-[#f1f5f9] px-3 py-2 rounded-lg">
                            Unavailable
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Services Products Page ────────────────────────────────────────────────────

export default function ServicesProductsPage({
    storeSlug,
    products,
    loading,
    error,
    onRetry,
}: ProductsPageProps) {
    const [query, setQuery] = useState('')
    const [debounced, setDebounced] = useState('')

    const handleSearch = (value: string) => {
        setQuery(value)
        clearTimeout((handleSearch as any)._t)
            ; (handleSearch as any)._t = setTimeout(() => setDebounced(value), 280)
    }

    const filtered = products.filter((p) => {
        if (!debounced.trim()) return true
        const q = debounced.toLowerCase()
        return (
            p.name?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        )
    })

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#2563eb] mx-auto mb-4" />
                    <p className="text-[#64748b] text-sm">Loading services…</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
                <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm max-w-md w-full p-8 text-center space-y-4">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                    <h3 className="text-lg font-semibold text-[#0f172a]">Failed to load services</h3>
                    <p className="text-sm text-[#64748b]">{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

            {/* ── Page header ── */}
            <div className="bg-white border-b border-[#e2e8f0]">
                <div className="max-w-6xl mx-auto px-6 md:px-10 py-14">
                    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#2563eb] mb-3">
                        What we offer
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#0f172a] tracking-tight mb-4">
                        Our Services
                    </h1>
                    <p className="text-base text-[#64748b] max-w-xl leading-relaxed">
                        Professional services designed to deliver measurable results for your business.
                    </p>

                    {/* Search */}
                    <div className="mt-8 max-w-lg relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search services…"
                            className="w-full pl-11 pr-10 py-3 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] text-[#0f172a] placeholder-[#94a3b8]"
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setDebounced('') }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94a3b8] hover:text-[#0f172a] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {debounced && (
                        <p className="mt-2 text-xs text-[#94a3b8]">
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{debounced}&rdquo;
                        </p>
                    )}
                </div>
            </div>

            {/* ── Grid ── */}
            <div className="max-w-6xl mx-auto px-6 md:px-10 py-14">
                {filtered.length === 0 ? (
                    <div className="text-center py-24">
                        <Search className="w-10 h-10 text-[#cbd5e1] mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-[#0f172a] mb-2">
                            {debounced ? 'No services found' : 'No services yet'}
                        </h3>
                        <p className="text-sm text-[#64748b] mb-6">
                            {debounced
                                ? `Nothing matched "${debounced}". Try a different keyword.`
                                : 'Check back soon — we're building something great.'}
                        </p>
                        {debounced && (
                            <button
                                onClick={() => { setQuery(''); setDebounced('') }}
                                className="inline-flex items-center gap-2 text-[#2563eb] text-sm font-semibold border border-[#2563eb] px-5 py-2.5 rounded-lg hover:bg-[#eff6ff] transition-colors"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((product) => (
                                <ServiceCard key={product.id} product={product} storeSlug={storeSlug} />
                            ))}
                        </div>
                        <p className="mt-10 text-center text-xs text-[#94a3b8]">
                            Showing <span className="text-[#0f172a] font-medium">{filtered.length}</span> of{' '}
                            <span className="text-[#0f172a] font-medium">{products.length}</span> services
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
