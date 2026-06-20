'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Loader2, ShoppingBag, X, Star, BadgeCheck, Package, Clock, MapPin, CalendarCheck } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@mcloud/ui/button'
import { Input } from '@mcloud/ui/input'
import { Card, CardContent } from '@mcloud/ui/card'
import { cn } from '@mcloud/ui/utils'
import type { ProductsPageProps, ProductItem, ServiceItem } from '../types'

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: ProductItem }) {
    const { addToCart, storeSlug } = useCart()
    const [isLoading, setIsLoading] = useState(false)

    const imageUrl =
        Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : '/api/placeholder/400/500'

    const stock = product.inventory_quantity
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.price
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
                image: imageUrl,
                quantity: 1,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="sf-tile group flex flex-col h-full">
            <Link href={`/products/${product.slug}`} className="block relative overflow-hidden aspect-[4/5] sf-bg-muted">
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
            </Link>

            <div className="pt-3 flex-1 flex flex-col">
                <div className="space-y-1">
                    {product.review_count ? (
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            <Star className="w-3 h-3 sf-star-filled" />
                            <span>{product.rating!.toFixed(1)} ({product.review_count})</span>
                        </div>
                    ) : null}
                    <Link href={`/products/${product.slug}`} className="block">
                        <h3 className="sf-heading text-base font-normal leading-tight line-clamp-2 sf-tile-name">
                            {product.name}
                        </h3>
                    </Link>
                    {product.description && (
                        <p className="text-xs line-clamp-1" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {product.description}
                        </p>
                    )}
                </div>

                <div className="flex-1 flex items-end justify-between gap-2 pt-3">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-light sf-text-accent">
                            KSh {product.price.toLocaleString()}
                        </span>
                        {hasDiscount && (
                            <span className="text-xs line-through" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                KSh {product.compare_at_price!.toLocaleString()}
                            </span>
                        )}
                    </div>
                    {stock > 0 ? (
                        <Button size="sm" onClick={handleAddToCart} disabled={isLoading} className="sf-btn-primary shrink-0">
                            {isLoading ? <Loader2 className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                        </Button>
                    ) : (
                        <span className="sf-badge-oos shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium">
                            <Package className="w-3 h-3" />
                            Sold Out
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({ service }: { service: ServiceItem }) {
    const thumb = service.metadata?.media?.find((m) => m.type === 'image')?.url
    const availability = service.metadata?.availability ?? 'available'
    const packages = service.metadata?.packages ?? []
    const prices = packages.map((p) => parseFloat(String(p.price)) || 0).filter(Boolean)
    const minPrice = prices.length > 0 ? Math.min(...prices) : service.price

    const availColor = {
        available: 'sf-dot-instock',
        busy: 'sf-dot-busy',
        unavailable: 'sf-dot-outofstock',
    }[availability]

    const availLabel = {
        available: 'Available',
        busy: 'Busy',
        unavailable: 'Unavailable',
    }[availability]

    return (
        <div className="sf-tile group flex flex-col h-full">
            <Link href={`/services/${service.slug}`} className="block relative overflow-hidden aspect-[4/3] sf-bg-muted">
                {thumb ? (
                    <img
                        src={thumb}
                        alt={service.name}
                        className="object-cover group-hover:scale-105 transition-transform duration-500 w-full h-full"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <CalendarCheck className="w-12 h-12" style={{ color: 'var(--sf-foreground)', opacity: 0.15 }} />
                    </div>
                )}
                {/* Availability badge */}
                <span className="absolute top-3 left-3 z-10 sf-card inline-flex items-center gap-1.5 px-2.5 py-1 text-xs shadow">
                    <span className={cn('h-1.5 w-1.5 rounded-full', availColor)} />
                    {availLabel}
                </span>
            </Link>

            <div className="pt-3 flex-1 flex flex-col">
                <div className="space-y-1">
                    {service.metadata?.serviceType && (
                        <p className="text-[10px] uppercase tracking-[0.18em] sf-text-accent font-medium">
                            {service.metadata.serviceType}
                        </p>
                    )}
                    {service.metadata?.rating != null && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            <Star className="w-3 h-3 sf-star-filled" />
                            <span>{service.metadata.rating.toFixed(1)}
                                {service.metadata.reviews != null && ` (${service.metadata.reviews})`}
                            </span>
                        </div>
                    )}
                    <Link href={`/services/${service.slug}`} className="block">
                        <h3 className="sf-heading text-base font-normal leading-tight line-clamp-2 sf-tile-name">
                            {service.name}
                        </h3>
                    </Link>
                    {service.description && (
                        <p className="text-xs line-clamp-1" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {service.description}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs pt-0.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        {service.metadata?.deliveryDays && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {service.metadata.deliveryDays}d delivery
                            </span>
                        )}
                        {service.metadata?.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {service.metadata.location}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex items-end justify-between gap-2 pt-3">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {packages.length > 0 ? 'From' : 'Price'}
                        </span>
                        <span className="text-base font-light sf-text-accent">
                            KSh {minPrice.toLocaleString()}
                        </span>
                    </div>
                    <Link href={`/services/${service.slug}`}>
                        <Button
                            size="sm"
                            className="sf-btn-primary shrink-0"
                            disabled={availability === 'unavailable'}
                        >
                            <CalendarCheck className="w-4 h-4 mr-2" />
                            {availability === 'busy' ? 'View' : 'Book'}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ─── Classic Products Page ─────────────────────────────────────────────────────
export default function ClassicProductsPage({
    products,
    services = [],
    loading,
    error,
    onRetry,
}: ProductsPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'products' | 'services'>(
        products.length === 0 && services.length > 0 ? 'services' : 'products'
    )

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        clearTimeout((handleSearch as any)._t)
        ;(handleSearch as any)._t = setTimeout(() => setDebouncedSearch(value), 300)
    }

    const filteredProducts = products.filter((p) => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    })

    const filteredServices = services.filter((s) => {
        if (!debouncedSearch.trim()) return true
        const q = debouncedSearch.toLowerCase()
        return s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    })

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--sf-foreground)' }} />
                    <p style={{ color: 'var(--sf-foreground-subtle)' }}>Loading...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="sf-card max-w-md w-full p-6 space-y-3 border" style={{ borderColor: 'var(--sf-border-strong)' }}>
                    <div className="flex items-center gap-2" style={{ color: 'var(--sf-foreground)' }}>
                        <ShoppingBag className="h-5 w-5 shrink-0" />
                        <span className="sf-heading font-semibold">Error Loading</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>{error}</p>
                    {onRetry && (
                        <button onClick={onRetry} className="sf-pill sf-pill-inactive border w-full py-2 text-sm mt-2">
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    const hasProducts = products.length > 0
    const hasServices = services.length > 0
    const showTabs = hasProducts && hasServices

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="sf-heading text-4xl md:text-5xl font-light tracking-tight mb-4">
                        The Full <span className="sf-text-accent">Collection</span>
                    </h1>
                    <p className="text-lg max-w-2xl mx-auto mb-8 font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Premium products and professional services for your unique needs
                    </p>

                    {/* Search */}
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--sf-foreground)', opacity: 0.38 }} />
                            <Input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-12 pr-12 h-12"
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setDebouncedSearch('') }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--sf-foreground)', opacity: 0.5 }}>
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs — only shown when both exist */}
                {showTabs && (
                    <div className="flex gap-1 mb-8 border-b" style={{ borderColor: 'var(--sf-border)' }}>
                        {(['products', 'services'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                                    activeTab === tab
                                        ? 'sf-text-accent border-(--sf-accent)'
                                        : 'border-transparent hover:sf-text-accent'
                                )}
                                style={{ color: activeTab === tab ? 'var(--sf-accent)' : 'var(--sf-foreground-subtle)' }}
                            >
                                {tab} ({tab === 'products' ? products.length : services.length})
                            </button>
                        ))}
                    </div>
                )}

                {/* Products grid */}
                {(!showTabs || activeTab === 'products') && (
                    <>
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-20">
                                <Card className="sf-card max-w-md mx-auto">
                                    <CardContent className="pt-12 pb-12">
                                        <Search className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--sf-foreground)', opacity: 0.25 }} />
                                        <h3 className="sf-heading text-2xl font-light mb-3">
                                            {debouncedSearch ? 'No Products Found' : 'No Products Available'}
                                        </h3>
                                        <p className="mb-6 font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                            {debouncedSearch ? `No products matching "${debouncedSearch}".` : 'Check back soon for new arrivals.'}
                                        </p>
                                        {debouncedSearch && (
                                            <button className="sf-btn-primary px-6 py-2 text-sm" onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}>
                                                Clear Search
                                            </button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                                <div className="mt-12 text-center">
                                    <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                        Showing <span style={{ color: 'var(--sf-foreground)' }}>{filteredProducts.length}</span> of{' '}
                                        <span style={{ color: 'var(--sf-foreground)' }}>{products.length}</span> products
                                    </p>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Services grid */}
                {(!showTabs || activeTab === 'services') && (
                    <>
                        {filteredServices.length === 0 ? (
                            <div className="text-center py-20">
                                <Card className="sf-card max-w-md mx-auto">
                                    <CardContent className="pt-12 pb-12">
                                        <Search className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--sf-foreground)', opacity: 0.25 }} />
                                        <h3 className="sf-heading text-2xl font-light mb-3">
                                            {debouncedSearch ? 'No Services Found' : 'No Services Available'}
                                        </h3>
                                        <p className="mb-6 font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                            {debouncedSearch ? `No services matching "${debouncedSearch}".` : 'Check back soon.'}
                                        </p>
                                        {debouncedSearch && (
                                            <button className="sf-btn-primary px-6 py-2 text-sm" onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}>
                                                Clear Search
                                            </button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredServices.map((service) => (
                                        <ServiceCard key={service.id} service={service} />
                                    ))}
                                </div>
                                <div className="mt-12 text-center">
                                    <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                        Showing <span style={{ color: 'var(--sf-foreground)' }}>{filteredServices.length}</span> of{' '}
                                        <span style={{ color: 'var(--sf-foreground)' }}>{services.length}</span> services
                                    </p>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}