'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Loader2, ShoppingBag, X, Package, Zap } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import type { ProductsPageProps, ProductItem } from '../types'
import { WishlistButton } from '@/components/store/WishlistButton'

function stripMd(text: string) {
    return text
        .replace(/#{1,6}\s*/g, '')        // headings
        .replace(/\*\*?(.*?)\*\*?/g, '$1') // bold / italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
        .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
        .replace(/^\s*[-*+]\s+/gm, '')     // list bullets
        .replace(/^\s*\d+\.\s+/gm, '')     // numbered lists
        .replace(/\n+/g, ' ')              // newlines to spaces
        .trim()
}

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: currency || 'KES',
        minimumFractionDigits: 0,
    }).format(amount)
}

function ProductCard({
    product,
    storeId,
    storeSlug,
    currency,
}: {
    product: ProductItem
    storeId: string
    storeSlug: string
    currency: string
}) {
    const { addToCart } = useCart()
    const [isLoading, setIsLoading] = useState(false)

    const imageUrl =
        Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : null

    const inStock = product.track_inventory
        ? (product.inventory_quantity ?? 0) > 0
        : true

    const hasDiscount =
        product.compare_at_price && product.compare_at_price > product.price

    const discount = hasDiscount
        ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
        : 0

    const handleAddToCart = async () => {
        setIsLoading(true)
        try {
            addToCart({
                variantId: product.id,
                productId: product.id,
                name: product.name,
                price: product.price,
                image: imageUrl ?? '',
                quantity: 1,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="sf-card group hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col py-0">
            <div className="relative overflow-hidden aspect-[4/5] sf-bg-muted">
                <div className="absolute top-2 right-2 z-10">
                    <WishlistButton productId={product.id} storeId={storeId} />
                </div>

                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className="object-cover group-hover:scale-105 transition-transform duration-500 w-full h-full"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag
                            className="w-8 h-8"
                            style={{ color: 'var(--sf-foreground)', opacity: 0.2 }}
                        />
                    </div>
                )}

                {hasDiscount && inStock && (
                    <span className="sf-badge-sale absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-0.5 text-xs font-medium">
                        -{discount}%
                    </span>
                )}

                {!inStock && (
                    <div className="absolute inset-0 sf-bg-sold-out flex items-center justify-center z-10">
                        <span className="text-white font-medium text-sm">Sold Out</span>
                    </div>
                )}
            </div>

            <CardContent className="pt-4 pb-6 flex-1 flex flex-col">
                <div className="space-y-1 mb-4 flex-1">
                    <Link href={`/store/${storeSlug}/${product.slug}`} className="block">
                        <CardTitle
                            className="sf-heading text-base font-normal leading-tight line-clamp-2 group-hover:underline"
                            style={{ color: 'var(--sf-foreground)' }}
                        >
                            {product.name}
                        </CardTitle>
                    </Link>
                    {product.description && (
                        <CardDescription>
                            <span
                                className="text-xs line-clamp-2 block"
                                style={{ color: 'var(--sf-foreground-subtle)' }}
                            >
                                {stripMd(product.description).slice(0, 120)}
                            </span>
                        </CardDescription>
                    )}
                </div>

                <div
                    className="flex flex-col gap-3"
                    style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '1rem' }}
                >
                    <div className="flex items-end justify-between">
                        <div className="space-y-0.5">
                            <div className="text-base font-light" style={{ color: 'var(--sf-foreground)' }}>
                                {formatPrice(product.price, currency)}
                            </div>
                            {hasDiscount && (
                                <div className="text-xs line-through" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    {formatPrice(product.compare_at_price!, currency)}
                                </div>
                            )}
                        </div>

                        {inStock ? (
                            <Button
                                size="sm"
                                onClick={handleAddToCart}
                                disabled={isLoading}
                                className="sf-btn-primary flex-shrink-0"
                            >
                                {isLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <ShoppingBag className="w-4 h-4 mr-1.5" />
                                }
                                Add
                            </Button>
                        ) : (
                            <span className="sf-badge-oos flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium">
                                <Package className="w-3 h-3" />
                                Sold Out
                            </span>
                        )}
                    </div>

                    <div
                        className="flex items-center justify-between text-xs"
                        style={{ color: 'var(--sf-foreground-subtle)' }}
                    >
                        {inStock && product.track_inventory && product.inventory_quantity != null && (
                            <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {product.inventory_quantity} in stock
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function ClassicProductsPage({
    products,
    storeId,
    storeSlug,
    currency,
    loading,
    error,
    onRetry,
}: ProductsPageProps & {
    storeId: string
    storeSlug: string
    currency: string
}) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => clearTimeout(t)
    }, [searchQuery])

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
                <div className="text-center space-y-3">
                    <Loader2
                        className="w-10 h-10 animate-spin mx-auto"
                        style={{ color: 'var(--sf-foreground)' }}
                    />
                    <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Loading products...
                    </p>
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
                    <p className="sf-heading font-semibold">Error loading products</p>
                    <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="sf-pill sf-pill-inactive border w-full py-2 text-sm"
                        >
                            Try again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-6xl mx-auto px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="sf-heading text-4xl md:text-5xl font-light tracking-tight mb-8">
                        All Products
                    </h1>
                    <div className="max-w-xl mx-auto relative">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}
                        />
                        <Input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 pr-10 h-11"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--sf-foreground)', opacity: 0.5 }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {debouncedSearch && (
                        <p className="text-sm mt-3" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {filtered.length} {filtered.length === 1 ? 'result' : 'results'} for &ldquo;{debouncedSearch}&rdquo;
                        </p>
                    )}
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-20 space-y-3">
                        <ShoppingBag
                            className="w-10 h-10 mx-auto"
                            style={{ color: 'var(--sf-foreground)', opacity: 0.2 }}
                        />
                        <p className="sf-heading text-xl font-light">
                            {debouncedSearch ? 'No products found' : 'No products yet'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {debouncedSearch
                                ? `Nothing matched "${debouncedSearch}"`
                                : 'Check back soon for new arrivals'}
                        </p>
                        {debouncedSearch && (
                            <button
                                className="sf-pill sf-pill-inactive border px-6 py-2 text-sm mt-2"
                                onClick={() => setSearchQuery('')}
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filtered.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    storeId={storeId}
                                    storeSlug={storeSlug}
                                    currency={currency}
                                />
                            ))}
                        </div>
                        <p
                            className="text-sm text-center mt-10"
                            style={{ color: 'var(--sf-foreground-subtle)' }}
                        >
                            Showing{' '}
                            <span style={{ color: 'var(--sf-foreground)' }}>{filtered.length}</span>
                            {' '}of{' '}
                            <span style={{ color: 'var(--sf-foreground)' }}>{products.length}</span>
                            {' '}products
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}