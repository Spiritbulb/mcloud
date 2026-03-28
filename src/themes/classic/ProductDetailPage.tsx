'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import {
    ArrowLeft, ShoppingCart, Star, Minus, Plus,
    Shield, Truck, RefreshCw, Loader2,
    ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ProductDetailPageProps } from '../types'
import { WishlistButton } from '@/components/store/WishlistButton'

export default function ClassicProductDetailPage({
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
    const formatPrice = (price: number) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(price)

    const currentImage = product.images[currentImageIndex]
    const isInStock = (selectedVariant?.inventory_quantity ?? 0) > 0
    const maxQuantity = selectedVariant?.inventory_quantity || 0
    const tags = product.metadata?.tags || []
    const rating = product.metadata?.rating || 4
    const reviews = product.metadata?.reviews || 24
    const hasDiscount =
        product.compare_at_price &&
        product.compare_at_price > (selectedVariant?.price || product.price)

    const availableOptions: Record<string, Set<string>> = {}
    product.variants?.forEach((variant) => {
        Object.entries(variant.options || {}).forEach(([key, value]) => {
            if (!availableOptions[key]) availableOptions[key] = new Set()
            availableOptions[key].add(value)
        })
    })

    const nextImage = () =>
        product.images.length > 1 &&
        onImageChange(
            currentImageIndex === product.images.length - 1 ? 0 : currentImageIndex + 1
        )

    const prevImage = () =>
        product.images.length > 1 &&
        onImageChange(
            currentImageIndex === 0 ? product.images.length - 1 : currentImageIndex - 1
        )

    return (
        <div className="min-h-screen pt-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
                <Link
                    href="/products"
                    className="sf-pill sf-pill-inactive border inline-flex items-center gap-2 px-3 py-1.5 text-sm mb-8"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Products
                </Link>

                <div className="grid lg:grid-cols-2 gap-10 xl:gap-16">
                    {/* ── Images ── */}
                    <div className="space-y-3">
                        <Card className="sf-card overflow-hidden py-0">
                            <div className="relative aspect-square sf-bg-muted">
                                {currentImage && (
                                    <img
                                        src={currentImage}
                                        alt={product.name}
                                        className="object-cover w-full h-full"
                                    />
                                )}
                                {product.images.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevImage}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
                                            style={{
                                                backgroundColor: 'var(--sf-background)',
                                                color: 'var(--sf-foreground)',
                                                border: '1px solid var(--sf-border-strong)',
                                            }}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={nextImage}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
                                            style={{
                                                backgroundColor: 'var(--sf-background)',
                                                color: 'var(--sf-foreground)',
                                                border: '1px solid var(--sf-border-strong)',
                                            }}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </>
                                )}
                                {product.images.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {product.images.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => onImageChange(index)}
                                                className={cn(
                                                    'h-1 rounded-full transition-all',
                                                    index === currentImageIndex ? 'sf-dot-active w-6' : 'sf-dot-inactive w-1.5'
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {product.images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {product.images.map((image, index) => (
                                    <button
                                        key={index}
                                        onClick={() => onImageChange(index)}
                                        className={cn(
                                            'flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-all',
                                            index === currentImageIndex ? 'sf-thumb-active' : 'sf-thumb-inactive'
                                        )}
                                    >
                                        <img
                                            src={image}
                                            alt={`${product.name} ${index + 1}`}
                                            width={80}
                                            height={80}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Product info ── */}
                    <div className="space-y-6 lg:max-w-lg">
                        <div className="space-y-2">
                            {hasDiscount && (
                                <span className="sf-badge-sale inline-flex items-center px-2.5 py-0.5 text-xs font-medium">
                                    Sale
                                </span>
                            )}
                            <h1 className="sf-heading text-3xl lg:text-4xl font-light tracking-tight">
                                {product.name}
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={cn('h-4 w-4', i < Math.floor(rating) ? 'sf-star-filled' : 'sf-star-empty')}
                                    />
                                ))}
                            </div>
                            <span className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {rating.toFixed(1)} &middot; {reviews} reviews
                            </span>
                        </div>

                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                                {selectedVariant ? formatPrice(selectedVariant.price) : formatPrice(product.price)}
                            </span>
                            {hasDiscount && (
                                <span className="text-lg line-through" style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}>
                                    {formatPrice(product.compare_at_price!)}
                                </span>
                            )}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} />

                        <div className="sf-prose text-sm leading-relaxed font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {product.metadata?.descriptionHtml ? (
                                <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: product.metadata.descriptionHtml }}
                                />
                            ) : (
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="my-3">{children}</p>,
                                        ul: ({ children }) => <ul className="my-3 ml-6 list-disc">{children}</ul>,
                                        li: ({ children }) => <li className="my-1">{children}</li>,
                                    }}
                                >
                                    {product.description || 'No description available for this product.'}
                                </ReactMarkdown>
                            )}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} />

                        <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full flex-shrink-0', isInStock ? 'sf-dot-instock' : 'sf-dot-outofstock')} />
                            <span className={cn('text-sm', isInStock ? 'sf-text-instock' : 'sf-text-outofstock')}>
                                {isInStock ? `In stock — ${selectedVariant?.inventory_quantity} available` : 'Out of stock'}
                            </span>
                        </div>

                        {/* Variant options */}
                        {Object.keys(availableOptions).length > 0 && (
                            <div className="space-y-4">
                                {Object.entries(availableOptions).map(([optionName, values]) => (
                                    <div key={optionName}>
                                        <label
                                            className="text-xs uppercase tracking-wider mb-2 block"
                                            style={{ color: 'var(--sf-foreground-subtle)' }}
                                        >
                                            {optionName}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(values).map((value) => (
                                                <button
                                                    key={value}
                                                    onClick={() => onOptionChange(optionName, value)}
                                                    className={cn(
                                                        'sf-pill capitalize px-4 py-1.5 text-sm border transition-colors',
                                                        selectedOptions[optionName] === value ? 'sf-pill-active' : 'sf-pill-inactive'
                                                    )}
                                                >
                                                    {value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity */}
                        {isInStock && (
                            <div className="flex items-center gap-4">
                                <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    Quantity
                                </label>
                                <div className="inline-flex items-center" style={{ border: '1px solid var(--sf-border-strong)' }}>
                                    <button
                                        className="w-10 h-10 flex items-center justify-center disabled:opacity-30"
                                        style={{ color: 'var(--sf-foreground)' }}
                                        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="px-4 text-sm min-w-[3rem] text-center tabular-nums" style={{ color: 'var(--sf-foreground)' }}>
                                        {quantity}
                                    </span>
                                    <button
                                        className="w-10 h-10 flex items-center justify-center disabled:opacity-30"
                                        style={{ color: 'var(--sf-foreground)' }}
                                        onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
                                        disabled={quantity >= maxQuantity}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={onAddToCart}
                            disabled={!isInStock || isAddingToCart}
                            className="w-full sf-btn-primary justify-center"
                            size="lg"
                        >
                            {isAddingToCart ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                            ) : (
                                <><ShoppingCart className="mr-2 h-4 w-4" />{isInStock ? 'Add to Cart' : 'Out of Stock'}</>
                            )}
                        </Button>

                        <div className="grid grid-cols-3 gap-3 pt-2" style={{ borderTop: '1px solid var(--sf-border)' }}>
                            {[
                                { icon: Truck, label: 'Fast Shipping' },
                                { icon: Shield, label: 'Secure Payment' },
                                { icon: RefreshCw, label: '30-Day Returns' },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                                    <Icon className="h-4 w-4" style={{ color: 'var(--sf-foreground)', opacity: 0.45 }} />
                                    <span className="text-xs leading-tight" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {tags.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '1rem' }}>
                                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    Tags
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span key={tag} className="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs">
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