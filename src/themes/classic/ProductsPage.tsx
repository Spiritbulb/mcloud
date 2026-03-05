'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Loader2, ShoppingBag, X, Star, BadgeCheck, Package, Zap } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ProductsPageProps, ProductItem } from '../types'

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: ProductItem }) {
    const { addToCart, storeSlug } = useCart()
    const [isLoading, setIsLoading] = useState(false)

    const imageUrl =
        Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : '/api/placeholder/400/500'

    const stock = product.inventory_quantity
    const hasDiscount =
        product.compare_at_price && product.compare_at_price > product.price
    const discount = hasDiscount
        ? Math.round(
            ((product.compare_at_price! - product.price) / product.compare_at_price!) * 100
        )
        : 0

    const handleAddToCart = async () => {
        setIsLoading(true)
        try {
            addToCart({
                variantId: product.id,
                productId: product.id,
                name: product.name,
                price: product.price,
                image: imageUrl,
                quantity: 1,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="sf-card group hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col py-0">
            <div className="relative overflow-hidden aspect-[4/5] sf-bg-muted">
                <img
                    src={imageUrl}
                    alt={product.name}
                    className="object-cover group-hover:scale-105 transition-transform duration-500 w-full h-full"
                />
                {hasDiscount && (
                    <span className="sf-badge-sale absolute top-3 left-3 z-10 shadow-lg inline-flex items-center px-2.5 py-0.5 text-xs font-medium">
                        -{discount}%
                    </span>
                )}
                {stock === 0 && (
                    <div className="absolute inset-0 sf-bg-sold-out flex items-center justify-center z-10">
                        <BadgeCheck className="w-6 h-6 mr-1 text-white" />
                        <span className="text-white font-medium">Sold Out</span>
                    </div>
                )}
            </div>

            <CardContent className="pt-4 pb-6 flex-1 flex flex-col">
                <div className="space-y-2 mb-4">
                    <div
                        className="flex items-center gap-1 text-sm mb-1"
                        style={{ color: 'var(--sf-foreground)', opacity: 0.45 }}
                    >
                        <Star className="w-3 h-3 sf-star-filled" />
                        <span>4.8 (23)</span>
                    </div>
                    <Link href={`/${product.slug}`} className="block">
                        <CardTitle
                            className="sf-heading text-lg font-normal leading-tight line-clamp-2 group-hover:underline"
                            style={{ color: 'var(--sf-foreground)' }}
                        >
                            {product.name}
                        </CardTitle>
                    </Link>
                    <CardDescription>
                        <span
                            className="text-sm line-clamp-2 block"
                            style={{ color: 'var(--sf-foreground-subtle)' }}
                        >
                            {product.description?.slice(0, 100) + '...' ||
                                'Premium quality product for your needs.'}
                        </span>
                    </CardDescription>
                </div>

                <div
                    className="flex-1 flex flex-col justify-end space-y-3"
                    style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '1rem' }}
                >
                    <div className="flex items-end justify-between">
                        <div className="space-y-1">
                            <div className="text-xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                                KSh {product.price.toLocaleString()}
                            </div>
                            {hasDiscount && (
                                <div
                                    className="text-sm line-through"
                                    style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}
                                >
                                    KSh {product.compare_at_price!.toLocaleString()}
                                </div>
                            )}
                        </div>
                        {stock > 0 ? (
                            <Button
                                size="sm"
                                onClick={handleAddToCart}
                                disabled={isLoading}
                                className="sf-btn-primary flex-shrink-0"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <ShoppingBag className="w-4 h-4 mr-2" />
                                )}
                                Add to Cart
                            </Button>
                        ) : (
                            <span className="sf-badge-oos flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium">
                                <Package className="w-3 h-3" />
                                Sold Out
                            </span>
                        )}
                    </div>
                    <div
                        className="flex items-center justify-between text-xs pt-2"
                        style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}
                    >
                        <span>SKU: {product.sku || product.id.slice(-8)}</span>
                        {stock > 0 && (
                            <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {stock} in stock
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Classic Products Page ─────────────────────────────────────────────────────
export default function ClassicProductsPage({
    products,
    loading,
    error,
    onRetry,
}: ProductsPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Local debounce
    const handleSearch = (value: string) => {
        setSearchQuery(value)
        clearTimeout((handleSearch as any)._t)
            ; (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(value), 300)
    }

    const filtered = products.filter((p) => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return (
            p.name?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q)
        )
    })

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2
                        className="w-12 h-12 animate-spin mx-auto mb-4"
                        style={{ color: 'var(--sf-foreground)' }}
                    />
                    <p style={{ color: 'var(--sf-foreground-subtle)' }}>Loading products...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div
                    className="sf-card max-w-md w-full p-6 space-y-3 border"
                    style={{ borderColor: 'var(--sf-border-strong)' }}
                >
                    <div className="flex items-center gap-2" style={{ color: 'var(--sf-foreground)' }}>
                        <ShoppingBag className="h-5 w-5 flex-shrink-0" />
                        <span className="sf-heading font-semibold">Error Loading Products</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        {error}
                    </p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="sf-pill sf-pill-inactive border w-full py-2 text-sm mt-2"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="sf-heading text-4xl md:text-5xl font-light tracking-tight mb-4">
                        The Full <span className="sf-text-accent">Collection</span>
                    </h1>
                    <p
                        className="text-lg max-w-2xl mx-auto mb-8 font-light"
                        style={{ color: 'var(--sf-foreground-subtle)' }}
                    >
                        Premium hair care, elegant jewelry, and beauty essentials for your unique style
                    </p>

                    {/* Search */}
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                                style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}
                            />
                            <Input
                                type="text"
                                placeholder="Search for products..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-12 pr-12 h-12"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                                    style={{ color: 'var(--sf-foreground)', opacity: 0.5 }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {debouncedSearch && (
                            <p className="text-sm mt-3" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {filtered.length} {filtered.length === 1 ? 'result' : 'results'} for &ldquo;
                                {debouncedSearch}&rdquo;
                            </p>
                        )}
                    </div>
                </div>

                {/* Grid */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Card className="sf-card max-w-md mx-auto">
                            <CardContent className="pt-12 pb-12">
                                <div className="w-20 h-20 sf-bg-muted flex items-center justify-center mx-auto mb-6">
                                    <Search
                                        className="w-10 h-10"
                                        style={{ color: 'var(--sf-foreground)', opacity: 0.25 }}
                                    />
                                </div>
                                <h3 className="sf-heading text-2xl font-light mb-3">
                                    {debouncedSearch ? 'No Products Found' : 'No Products Available'}
                                </h3>
                                <p className="mb-6 font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    {debouncedSearch
                                        ? `We couldn't find any products matching "${debouncedSearch}".`
                                        : 'Check back soon for new arrivals.'}
                                </p>
                                {debouncedSearch && (
                                    <button
                                        className="sf-btn-primary px-6 py-2 text-sm"
                                        onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filtered.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                        <div className="mt-12 text-center">
                            <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                Showing{' '}
                                <span style={{ color: 'var(--sf-foreground)' }}>{filtered.length}</span> of{' '}
                                <span style={{ color: 'var(--sf-foreground)' }}>{products.length}</span> products
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}