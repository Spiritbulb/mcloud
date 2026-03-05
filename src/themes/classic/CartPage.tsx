'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Loader2, Plus, Minus, Trash2, ShoppingBag,
    Shield, Info, AlertCircle, Phone, Mail, MessageCircle,
} from 'lucide-react'
import { convertKEStoUSD, formatKES, formatUSD } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CopyButton } from '@/components/animate-ui/components/buttons/copy'
import type { CartPageProps, GuestDetails } from '../types'

const EMPTY_GUEST: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }

export default function ClassicCartPage({
    storeSlug,
    cartItems,
    loading,
    itemLoadingStates,
    mpesaConfig,
    onUpdateQuantity,
    onRemoveItem,
    onMpesaCheckout,
    onPaypalCheckout,
    isProcessing,
}: CartPageProps) {
    const router = useRouter()
    const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'mpesa'>('mpesa')
    const [guest, setGuest] = useState<GuestDetails>(EMPTY_GUEST)
    const [error, setError] = useState('')

    const setField = (field: keyof GuestDetails) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setGuest((prev) => ({ ...prev, [field]: e.target.value }))

    const subtotalKES = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalKES = subtotalKES
    const totalUSD = convertKEStoUSD(totalKES)

    const validate = (): string | null => {
        if (paymentMethod === 'mpesa') {
            if (!guest.mpesaPhone.trim()) return 'M-PESA phone number is required'
            if (!/^(?:\+?254|0)[17]\d{8}$/.test(guest.mpesaPhone.trim()))
                return 'Enter a valid Kenyan phone number (e.g. 0712345678)'
            if (!guest.mpesaCode.trim()) return 'M-PESA transaction code is required'
            if (!/^[A-Z0-9]{6,20}$/.test(guest.mpesaCode.trim().toUpperCase()))
                return 'Invalid M-PESA transaction code format'
        }
        if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email))
            return 'Enter a valid email address'
        return null
    }

    const handleCheckout = async () => {
        const err = validate()
        if (err) { setError(err); return }
        setError('')
        try {
            if (paymentMethod === 'mpesa') {
                await onMpesaCheckout({ ...guest, mpesaCode: guest.mpesaCode.toUpperCase() })
            } else {
                await onPaypalCheckout()
            }
        } catch (e: any) {
            setError(e.message || 'Checkout failed')
        }
    }

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
                                                src={item.image || '/api/placeholder/200/200'}
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
                                            {formatKES(totalKES)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="sf-card">
                                <CardContent className="px-5 pt-5 pb-5 space-y-4">
                                    {/* Payment toggle */}
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                            Payment method
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('mpesa')}
                                                disabled={isProcessing || !mpesaConfig?.enabled}
                                                className={`flex-1 py-2 text-sm border transition-colors sf-pill ${paymentMethod === 'mpesa' ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                                            >
                                                M-PESA
                                            </button>
                                            {mpesaConfig?.paypalEnabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('paypal')}
                                                    disabled={isProcessing}
                                                    className={`flex-1 py-2 text-sm border transition-colors sf-pill ${paymentMethod === 'paypal' ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                                                >
                                                    PayPal
                                                </button>
                                            )}
                                        </div>
                                        {!mpesaConfig?.enabled && (
                                            <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                Payments are not yet configured for this store.
                                            </p>
                                        )}
                                    </div>

                                    {/* M-PESA form */}
                                    {paymentMethod === 'mpesa' && (
                                        <div className="space-y-4">
                                            <div className="sf-mpesa-instructions p-4 text-xs space-y-2.5 leading-relaxed">
                                                <p className="text-xs uppercase tracking-wider font-medium mb-3" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                    How to pay
                                                </p>
                                                <div className="space-y-2">
                                                    {[
                                                        <>M-PESA → Lipa na M-PESA → {mpesaConfig?.type === 'paybill' ? 'Pay Bill' : 'Buy Goods and Services'}</>,
                                                        <>
                                                            Enter {mpesaConfig?.type === 'paybill' ? 'Business' : 'Till'} Number:{' '}
                                                            <span className="sf-mono-tag inline-flex items-center gap-1">
                                                                {mpesaConfig?.number || '—'}
                                                                {mpesaConfig?.number && <CopyButton content={mpesaConfig.number} size="xs" />}
                                                            </span>
                                                        </>,
                                                        ...(mpesaConfig?.type === 'paybill' && mpesaConfig.account
                                                            ? [<>Account Number: <span className="sf-mono-tag inline-flex items-center gap-1">{mpesaConfig.account}<CopyButton content={mpesaConfig.account} size="xs" /></span></>]
                                                            : []),
                                                        <>Amount: <span className="sf-mono-tag font-semibold">{formatKES(totalKES)}</span></>,
                                                        <>Enter your PIN and confirm</>,
                                                        <>Paste the confirmation code below</>,
                                                    ].map((step, i) => (
                                                        <div key={i} className="flex gap-2.5">
                                                            <span
                                                                className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-xs font-medium rounded-full"
                                                                style={{ backgroundColor: 'var(--sf-foreground)', color: 'var(--sf-background)', opacity: 0.7, fontSize: '10px' }}
                                                            >
                                                                {i + 1}
                                                            </span>
                                                            <span style={{ color: 'var(--sf-foreground-subtle)' }}>{step}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="mpesa-phone" className="text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                    <Phone className="w-3 h-3" />
                                                    M-PESA Phone <span className="sf-required">*</span>
                                                </Label>
                                                <Input id="mpesa-phone" value={guest.mpesaPhone} onChange={setField('mpesaPhone')} placeholder="0712 345 678" inputMode="tel" disabled={isProcessing} />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="mpesa-code" className="text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                    Transaction Code <span className="sf-required">*</span>
                                                </Label>
                                                <Input
                                                    id="mpesa-code"
                                                    value={guest.mpesaCode}
                                                    onChange={(e) => setGuest((p) => ({ ...p, mpesaCode: e.target.value.toUpperCase() }))}
                                                    placeholder="e.g. QW12ABCDEF"
                                                    disabled={isProcessing}
                                                />
                                            </div>

                                            <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} />
                                            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>Contact (optional)</p>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="whatsapp" className="text-xs flex items-center gap-1.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                    <MessageCircle className="w-3 h-3" />
                                                    WhatsApp <span style={{ opacity: 0.55 }}>(if different from M-PESA number)</span>
                                                </Label>
                                                <Input id="whatsapp" value={guest.whatsapp} onChange={setField('whatsapp')} placeholder="0712 345 678" inputMode="tel" disabled={isProcessing} />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="email" className="text-xs flex items-center gap-1.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                                    <Mail className="w-3 h-3" />
                                                    Email <span style={{ opacity: 0.55 }}>(for receipt)</span>
                                                </Label>
                                                <Input id="email" value={guest.email} onChange={setField('email')} placeholder="you@example.com" type="email" disabled={isProcessing} />
                                            </div>
                                        </div>
                                    )}

                                    {/* PayPal info */}
                                    {paymentMethod === 'paypal' && (
                                        <div className="sf-alert-info p-3 text-xs space-y-1 border" style={{ borderColor: 'var(--sf-border)' }}>
                                            <div className="flex items-center gap-2">
                                                <Info className="h-3.5 w-3.5 flex-shrink-0 sf-alert-info-icon" />
                                                <span className="font-medium sf-alert-info-title">Payment in USD</span>
                                            </div>
                                            <p className="sf-alert-info-body pl-5">
                                                You'll be charged approximately{' '}
                                                <strong style={{ color: 'var(--sf-foreground)' }}>{formatUSD(totalUSD)}</strong>.
                                            </p>
                                        </div>
                                    )}

                                    {/* Error */}
                                    {error && (
                                        <div
                                            className="flex items-start gap-2 p-3 text-xs border"
                                            style={{
                                                backgroundColor: 'color-mix(in srgb, var(--sf-accent) 8%, var(--sf-background))',
                                                borderColor: 'color-mix(in srgb, var(--sf-accent) 30%, transparent)',
                                                color: 'var(--sf-foreground)',
                                            }}
                                        >
                                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--sf-accent)' }} />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <Button size="lg" className="w-full sf-btn-primary" disabled={isProcessing} onClick={handleCheckout}>
                                        {isProcessing ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{paymentMethod === 'mpesa' ? 'Submitting…' : 'Redirecting to PayPal…'}</>
                                        ) : paymentMethod === 'mpesa' ? (
                                            <><Shield className="mr-2 h-4 w-4" />Confirm M-PESA Payment</>
                                        ) : (
                                            <><Shield className="mr-2 h-4 w-4" />Pay with PayPal · {formatUSD(totalUSD)}</>
                                        )}
                                    </Button>

                                    <div className="sf-security-badge flex items-center justify-center gap-1.5 text-xs py-2">
                                        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{paymentMethod === 'mpesa' ? 'Your transaction code verifies this payment' : 'Secured by PayPal'}</span>
                                    </div>

                                    <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                        By completing your purchase you agree to our{' '}
                                        <Link href="/terms" className="underline underline-offset-2" style={{ color: 'var(--sf-foreground)' }}>Terms</Link>
                                        {' '}and{' '}
                                        <Link href="/privacy" className="underline underline-offset-2" style={{ color: 'var(--sf-foreground)' }}>Privacy Policy</Link>
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}