'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Trash2, Loader2, AlertCircle, Shield } from 'lucide-react'
import type { CartPageProps, GuestDetails } from '../types'

function fmt(amount: number, currency: string = 'KES') {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

const EMPTY_GUEST: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }

export default function PhotographyCartPage({
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
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'paypal'>('mpesa')
    const [guest, setGuest] = useState<GuestDetails>(EMPTY_GUEST)
    const [error, setError] = useState('')

    const setField = (f: keyof GuestDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setGuest(p => ({ ...p, [f]: e.target.value }))

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const validate = (): string | null => {
        if (paymentMethod === 'mpesa') {
            if (!guest.mpesaPhone.trim()) return 'M-Pesa phone number is required'
            if (!/^(?:\+?254|0)[17]\d{8}$/.test(guest.mpesaPhone.trim())) return 'Enter a valid Kenyan phone number'
            if (!guest.mpesaCode.trim()) return 'M-Pesa transaction code is required'
            if (!/^[A-Z0-9]{6,20}$/.test(guest.mpesaCode.trim().toUpperCase())) return 'Invalid M-Pesa transaction code'
        }
        if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) return 'Enter a valid email address'
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
            <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#c8965a] to-transparent animate-pulse" />
            </div>
        )
    }

    if (cartItems.length === 0) {
        return (
            <div
                className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-6"
                style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
            >
                <div className="text-center space-y-6">
                    <p
                        className="text-4xl font-normal text-[#f2f2f2]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        Your cart is empty
                    </p>
                    <p className="text-sm text-[#555] font-light tracking-wide">
                        Nothing has been added yet
                    </p>
                    <Link
                        href={`/store/${storeSlug}/products`}
                        className="inline-block text-[10px] tracking-[0.4em] uppercase text-[#c8965a] border-b border-[#c8965a]/50 pb-0.5 hover:border-[#c8965a] transition-colors"
                    >
                        Browse Works
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen bg-[#0c0c0c] text-[#f2f2f2]"
            style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
        >
            <div className="max-w-5xl mx-auto px-6 md:px-12 pt-24 pb-20">

                {/* Header */}
                <div className="mb-12">
                    <h1
                        className="text-5xl md:text-6xl font-normal leading-none text-[#f2f2f2]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        Cart
                    </h1>
                    <div className="w-8 h-px bg-[#c8965a] mt-4" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

                    {/* ── Cart Items ── */}
                    <div className="lg:col-span-7 space-y-0 divide-y divide-[#181818]">
                        {cartItems.map(item => (
                            <div key={item.variantId} className="py-6 flex gap-5">
                                {/* Image */}
                                <div className="flex-shrink-0 w-20 h-20 bg-[#181818] overflow-hidden">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <h3
                                            className="text-base font-normal text-[#f2f2f2] leading-snug"
                                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                                        >
                                            {item.name}
                                        </h3>
                                        <button
                                            onClick={() => onRemoveItem(item.variantId)}
                                            disabled={itemLoadingStates[item.variantId]}
                                            className="text-[#333] hover:text-[#c8965a] transition-colors flex-shrink-0 disabled:opacity-30"
                                        >
                                            {itemLoadingStates[item.variantId]
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <Trash2 className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        {/* Qty controls */}
                                        <div className="flex items-center border border-[#1e1e1e]">
                                            <button
                                                onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                                                disabled={itemLoadingStates[item.variantId] || item.quantity <= 1}
                                                className="w-7 h-7 flex items-center justify-center text-[#555] hover:text-[#f2f2f2] disabled:opacity-30 transition-colors"
                                            >
                                                <Minus className="w-2.5 h-2.5" />
                                            </button>
                                            <span className="w-8 text-center text-xs tabular-nums text-[#888]">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                                                disabled={itemLoadingStates[item.variantId]}
                                                className="w-7 h-7 flex items-center justify-center text-[#555] hover:text-[#f2f2f2] disabled:opacity-30 transition-colors"
                                            >
                                                {itemLoadingStates[item.variantId]
                                                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                    : <Plus className="w-2.5 h-2.5" />
                                                }
                                            </button>
                                        </div>

                                        <span className="text-sm text-[#c8965a] font-light">
                                            {fmt(item.price * item.quantity)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="pt-6">
                            <Link
                                href={`/store/${storeSlug}/products`}
                                className="text-[9px] tracking-[0.35em] uppercase text-[#444] hover:text-[#c8965a] transition-colors"
                            >
                                ← Continue browsing
                            </Link>
                        </div>
                    </div>

                    {/* ── Summary & Checkout ── */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Order summary */}
                        <div className="border border-[#1c1c1c] p-6 space-y-4">
                            <p className="text-[9px] tracking-[0.4em] uppercase text-[#555]">Order Summary</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#666]">Subtotal</span>
                                    <span className="text-[#f2f2f2]">{fmt(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#666]">Shipping</span>
                                    <span className="text-[#f2f2f2]">Free</span>
                                </div>
                            </div>
                            <div className="h-px bg-[#1c1c1c]" />
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] tracking-[0.25em] uppercase text-[#555]">Total</span>
                                <span
                                    className="text-2xl font-light text-[#c8965a]"
                                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                                >
                                    {fmt(subtotal)}
                                </span>
                            </div>
                        </div>

                        {/* Payment method selector */}
                        {(mpesaConfig?.enabled || mpesaConfig?.paypalEnabled) && (
                            <div className="space-y-3">
                                <p className="text-[9px] tracking-[0.35em] uppercase text-[#555]">Payment Method</p>
                                <div className="flex gap-2">
                                    {mpesaConfig?.enabled && (
                                        <button
                                            onClick={() => setPaymentMethod('mpesa')}
                                            disabled={isProcessing}
                                            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase border transition-colors"
                                            style={{
                                                borderColor: paymentMethod === 'mpesa' ? 'rgba(200,150,90,0.6)' : '#1c1c1c',
                                                color: paymentMethod === 'mpesa' ? '#c8965a' : '#555',
                                                backgroundColor: paymentMethod === 'mpesa' ? 'rgba(200,150,90,0.05)' : 'transparent',
                                            }}
                                        >
                                            M-Pesa
                                        </button>
                                    )}
                                    {mpesaConfig?.paypalEnabled && (
                                        <button
                                            onClick={() => setPaymentMethod('paypal')}
                                            disabled={isProcessing}
                                            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase border transition-colors"
                                            style={{
                                                borderColor: paymentMethod === 'paypal' ? 'rgba(200,150,90,0.6)' : '#1c1c1c',
                                                color: paymentMethod === 'paypal' ? '#c8965a' : '#555',
                                                backgroundColor: paymentMethod === 'paypal' ? 'rgba(200,150,90,0.05)' : 'transparent',
                                            }}
                                        >
                                            PayPal
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* M-Pesa form */}
                        {mpesaConfig?.enabled && paymentMethod === 'mpesa' && (
                            <div className="border border-[#1c1c1c] p-5 space-y-4">
                                <p className="text-[9px] tracking-[0.35em] uppercase text-[#555]">How to Pay</p>

                                {/* Instructions */}
                                <div className="space-y-2 text-xs text-[#666] font-light">
                                    {[
                                        <>M-PESA → Lipa na M-PESA → {mpesaConfig.type === 'paybill' ? 'Pay Bill' : 'Buy Goods'}</>,
                                        <>{mpesaConfig.type === 'paybill' ? 'Business' : 'Till'} No: <span className="text-[#c8965a] font-mono">{mpesaConfig.number || '—'}</span></>,
                                        ...(mpesaConfig.type === 'paybill' && mpesaConfig.account
                                            ? [<>Account: <span className="text-[#c8965a] font-mono">{mpesaConfig.account}</span></>]
                                            : []),
                                        <>Amount: <span className="text-[#c8965a]">{fmt(subtotal)}</span></>,
                                        <>Enter PIN → confirm → paste code below</>,
                                    ].map((step, i) => (
                                        <div key={i} className="flex gap-3">
                                            <span className="text-[#333] w-4 flex-shrink-0">{i + 1}.</span>
                                            <span>{step}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-px bg-[#1c1c1c]" />

                                {/* Fields */}
                                <div className="space-y-3">
                                    {([
                                        { id: 'ph-phone', label: 'M-Pesa Phone *', field: 'mpesaPhone' as keyof GuestDetails, placeholder: '0712 345 678', mode: 'tel' as const },
                                        { id: 'ph-code', label: 'Transaction Code *', field: 'mpesaCode' as keyof GuestDetails, placeholder: 'QW12ABCDEF', mode: 'text' as const },
                                        { id: 'ph-wa', label: 'WhatsApp (optional)', field: 'whatsapp' as keyof GuestDetails, placeholder: '0712 345 678', mode: 'tel' as const },
                                        { id: 'ph-email', label: 'Email for receipt (optional)', field: 'email' as keyof GuestDetails, placeholder: 'you@example.com', mode: 'email' as const },
                                    ] as const).map(({ id, label, field, placeholder, mode }) => (
                                        <div key={id} className="space-y-1">
                                            <label htmlFor={id} className="text-[9px] tracking-[0.3em] uppercase text-[#555]">
                                                {label}
                                            </label>
                                            <input
                                                id={id}
                                                value={guest[field]}
                                                onChange={field === 'mpesaCode'
                                                    ? (e) => setGuest(p => ({ ...p, mpesaCode: e.target.value.toUpperCase() }))
                                                    : setField(field)
                                                }
                                                placeholder={placeholder}
                                                inputMode={mode}
                                                disabled={isProcessing}
                                                className="w-full bg-transparent border-b border-[#1c1c1c] focus:border-[#c8965a]/50 text-sm text-[#f2f2f2] placeholder:text-[#2e2e2e] outline-none py-2 transition-colors font-light"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PayPal info */}
                        {mpesaConfig?.paypalEnabled && paymentMethod === 'paypal' && (
                            <div className="border border-[#1c1c1c] p-4 text-xs text-[#666] space-y-1">
                                <p className="text-[9px] tracking-[0.25em] uppercase text-[#888]">USD Payment via PayPal</p>
                                <p className="font-light text-[#555] pt-1">
                                    You will be redirected to PayPal to complete your purchase.
                                </p>
                            </div>
                        )}

                        {/* Error message */}
                        {error && (
                            <div className="flex items-start gap-2 border border-[#c8965a]/20 bg-[#c8965a]/5 p-3 text-xs text-[#c8965a]">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Checkout button */}
                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing || (!mpesaConfig?.enabled && !mpesaConfig?.paypalEnabled)}
                            className="w-full py-4 text-[10px] tracking-[0.4em] uppercase font-medium transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#c8965a', color: '#0c0c0c' }}
                        >
                            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isProcessing
                                ? (paymentMethod === 'mpesa' ? 'Submitting…' : 'Redirecting…')
                                : paymentMethod === 'mpesa'
                                    ? 'Confirm Payment'
                                    : 'Pay with PayPal'
                            }
                        </button>

                        <div className="flex items-center justify-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-[#333]">
                            <Shield className="w-3 h-3" />
                            <span>{paymentMethod === 'mpesa' ? 'Transaction code verifies payment' : 'Secured by PayPal'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
