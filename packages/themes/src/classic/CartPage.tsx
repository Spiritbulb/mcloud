'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Minus, Trash2, ShoppingBag, Shield } from 'lucide-react'
import { formatKES } from '../../../../apps/storefront/lib/currency'
import { Button } from '@mcloud/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@mcloud/ui/card'
import type { CartOnlyPageProps } from '../types'

export default function ClassicCartPage({
    storeSlug,
    cartItems,
    loading,
    itemLoadingStates,
    onUpdateQuantity,
    onRemoveItem,
}: CartOnlyPageProps) {
    const router = useRouter()

    const subtotalKES = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--sf-foreground)', opacity: 0.4 }} />
            </div>
        )
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center space-y-4 max-w-sm w-full">
                    <div className="w-16 h-16 flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--sf-muted)' }}>
                        <ShoppingBag className="w-8 h-8" style={{ color: 'var(--sf-foreground)', opacity: 0.3 }} />
                    </div>
                    <h3 className="sf-heading text-2xl font-light">Your cart is empty</h3>
                    <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Discover our amazing collection of products.
                    </p>
                    <button
                        className="sf-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm mt-2"
                        onClick={() => router.push(`/store/${storeSlug}/products`)}
                    >
                        <ShoppingBag className="h-4 w-4" />
                        Start Shopping
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

                    {/* ── Cart items ── */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-2">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="sf-heading text-2xl font-light">
                                Cart
                                <span className="text-base ml-2 font-normal" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                                </span>
                            </h1>
                            <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                <Shield className="w-3.5 h-3.5" />
                                Secure checkout
                            </div>
                        </div>

                        <div className="sf-card divide-y" style={{ borderColor: 'var(--sf-border)', border: '1px solid var(--sf-border)' }}>
                            {cartItems.map((item) => (
                                <div key={item.variantId} className="p-4 sm:p-5 sf-cart-row transition-colors">
                                    <div className="flex gap-4">
                                        <div
                                            className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 overflow-hidden"
                                            style={{ backgroundColor: 'var(--sf-muted)' }}
                                        >
                                            <img
                                                src={item.image || `/api/placeholder/200/200`}
                                                alt={item.name}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm sm:text-base font-normal line-clamp-2 leading-snug" style={{ color: 'var(--sf-foreground)' }}>
                                                    {item.name}
                                                </h3>
                                                <button
                                                    onClick={() => onRemoveItem(item.variantId)}
                                                    disabled={itemLoadingStates[item.variantId]}
                                                    className="flex-shrink-0 p-1 transition-opacity hover:opacity-100 disabled:opacity-30"
                                                    style={{ color: 'var(--sf-foreground)', opacity: 0.35 }}
                                                >
                                                    {itemLoadingStates[item.variantId]
                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                        : <Trash2 className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                SKU: {item.variantId?.slice(-8) || 'N/A'}
                                            </p>
                                            <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
                                                <div className="inline-flex items-center" style={{ border: '1px solid var(--sf-border-strong)' }}>
                                                    <button
                                                        className="w-8 h-8 flex items-center justify-center disabled:opacity-30"
                                                        style={{ color: 'var(--sf-foreground)' }}
                                                        onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                                                        disabled={itemLoadingStates[item.variantId] || item.quantity <= 1}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-9 text-center text-sm tabular-nums select-none" style={{ color: 'var(--sf-foreground)' }}>
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        className="w-8 h-8 flex items-center justify-center disabled:opacity-30"
                                                        style={{ color: 'var(--sf-foreground)' }}
                                                        onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                                                        disabled={itemLoadingStates[item.variantId]}
                                                    >
                                                        {itemLoadingStates[item.variantId]
                                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                                            : <Plus className="h-3 w-3" />}
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-base font-light" style={{ color: 'var(--sf-foreground)' }}>
                                                        {formatKES(item.price * item.quantity)}
                                                    </div>
                                                    {item.quantity > 1 && (
                                                        <div className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                            {formatKES(item.price)} each
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2">
                            <Link
                                href={`/store/${storeSlug}/products`}
                                className="sf-pill sf-pill-inactive border inline-flex items-center gap-2 px-4 py-2 text-sm"
                            >
                                ← Continue Shopping
                            </Link>
                        </div>
                    </div>

                    {/* ── Order summary ── */}
                    <div className="lg:col-span-5 xl:col-span-4">
                        <div className="lg:sticky lg:top-24 space-y-4">
                            <Card className="sf-card">
                                <CardHeader className="px-5 pb-3">
                                    <CardTitle className="sf-heading text-lg font-light" style={{ color: 'var(--sf-foreground)' }}>
                                        Order Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-5 pb-5 space-y-3">
                                    <div className="flex justify-between text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                        <span>Subtotal</span>
                                        <span style={{ color: 'var(--sf-foreground)' }}>{formatKES(subtotalKES)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                        <span>Shipping</span>
                                        <span style={{ color: 'var(--sf-foreground)' }}>Free</span>
                                    </div>
                                    <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} />
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm" style={{ color: 'var(--sf-foreground)' }}>Total</span>
                                        <span className="sf-heading text-2xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                                            {formatKES(subtotalKES)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Button
                                size="lg"
                                className="w-full sf-btn-primary"
                                onClick={() => router.push(`/store/${storeSlug}/checkout`)}
                            >
                                Proceed to Checkout
                            </Button>

                            <div className="sf-security-badge flex items-center justify-center gap-1.5 text-xs py-2">
                                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Secured connection</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}