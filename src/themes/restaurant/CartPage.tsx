'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Loader2,
    Minus,
    Plus,
    Trash2,
    ShoppingBag,
    AlertCircle,
    Phone,
    Mail,
    MessageCircle,
    Shield,
    Info,
} from 'lucide-react'
import { convertKEStoUSD, formatKES, formatUSD } from '@/lib/currency'
import { CopyButton } from '@/components/animate-ui/components/buttons/copy'
import type { CartPageProps, GuestDetails } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_GUEST: GuestDetails = {
    mpesaPhone: '',
    mpesaCode: '',
    whatsapp: '',
    email: '',
}

// ─── Restaurant Cart Page ──────────────────────────────────────────────────────

export default function RestaurantCartPage({
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

    const setField =
        (field: keyof GuestDetails) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setGuest((prev) => ({ ...prev, [field]: e.target.value }))

    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalUSD = convertKEStoUSD(subtotal)

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
            setError(e.message || 'Checkout failed. Please try again.')
        }
    }

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#c8622a]" />
            </div>
        )
    }

    // ── Empty ──
    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-4">
                <div className="bg-white border border-[#e8ddd4] rounded-xl p-10 max-w-sm w-full text-center space-y-5 shadow-sm">
                    <div className="w-16 h-16 bg-[#f0e8e0] rounded-full flex items-center justify-center mx-auto text-3xl">
                        🍽️
                    </div>
                    <div>
                        <h3 className="font-serif text-2xl font-bold text-[#2c1810]">
                            Your order is empty
                        </h3>
                        <p className="text-sm text-[#6b4c3b] mt-2">
                            Add something delicious from our menu!
                        </p>
                    </div>
                    <Link
                        href={`/store/${storeSlug}/products`}
                        className="inline-flex items-center gap-2 bg-[#c8622a] hover:bg-[#b05520] text-white font-medium px-6 py-3 rounded-full text-sm transition-colors"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        Browse the Menu
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#faf7f2]">
            {/* Header */}
            <div className="bg-[#2c1810] text-[#faf7f2] py-8 px-4 text-center">
                <h1 className="font-serif text-3xl md:text-4xl font-bold">Your Order</h1>
                <p className="text-[#d4b8a8] text-sm mt-1">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </p>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ── Order items (receipt style) ── */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white border border-[#e8ddd4] rounded-xl overflow-hidden shadow-sm">
                            {/* Receipt header */}
                            <div className="px-5 py-4 border-b border-[#f0e8e0] flex items-center justify-between">
                                <h2 className="font-serif text-lg font-bold text-[#2c1810]">
                                    Order Summary
                                </h2>
                                <span className="text-xs text-[#6b4c3b] bg-[#f0e8e0] px-2.5 py-1 rounded-full">
                                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                                </span>
                            </div>

                            {/* Items */}
                            <div className="divide-y divide-[#f5ede3]">
                                {cartItems.map((item) => (
                                    <div key={item.variantId} className="p-4 sm:p-5">
                                        <div className="flex gap-4">
                                            {/* Thumbnail */}
                                            <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-[#f0e8e0]">
                                                <img
                                                    src={item.image || ''}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <h3 className="font-serif font-bold text-[#2c1810] line-clamp-2 leading-snug">
                                                        {item.name}
                                                    </h3>
                                                    <button
                                                        onClick={() => onRemoveItem(item.variantId)}
                                                        disabled={itemLoadingStates[item.variantId]}
                                                        className="flex-shrink-0 p-1.5 text-[#6b4c3b]/40 hover:text-[#c8622a] disabled:opacity-30 transition-colors"
                                                    >
                                                        {itemLoadingStates[item.variantId] ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between flex-wrap gap-3">
                                                    {/* Qty controls */}
                                                    <div className="inline-flex items-center border border-[#e8ddd4] rounded-full bg-[#faf7f2]">
                                                        <button
                                                            onClick={() =>
                                                                onUpdateQuantity(
                                                                    item.variantId,
                                                                    item.quantity - 1
                                                                )
                                                            }
                                                            disabled={
                                                                itemLoadingStates[item.variantId] ||
                                                                item.quantity <= 1
                                                            }
                                                            className="w-8 h-8 flex items-center justify-center text-[#2c1810] disabled:opacity-30 hover:text-[#c8622a] transition-colors"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="w-8 text-center text-sm font-medium text-[#2c1810] tabular-nums select-none">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                onUpdateQuantity(
                                                                    item.variantId,
                                                                    item.quantity + 1
                                                                )
                                                            }
                                                            disabled={itemLoadingStates[item.variantId]}
                                                            className="w-8 h-8 flex items-center justify-center text-[#2c1810] disabled:opacity-30 hover:text-[#c8622a] transition-colors"
                                                        >
                                                            {itemLoadingStates[item.variantId] ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Plus className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Line total */}
                                                    <div className="text-right">
                                                        <p className="font-bold text-[#c8622a]">
                                                            {formatKES(item.price * item.quantity)}
                                                        </p>
                                                        {item.quantity > 1 && (
                                                            <p className="text-xs text-[#6b4c3b]">
                                                                {formatKES(item.price)} each
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Subtotal row */}
                            <div className="px-5 py-4 border-t border-[#e8ddd4] flex justify-between items-center">
                                <span className="text-sm text-[#6b4c3b]">Subtotal</span>
                                <span className="font-bold text-[#2c1810] text-lg">
                                    {formatKES(subtotal)}
                                </span>
                            </div>
                        </div>

                        <Link
                            href={`/store/${storeSlug}/products`}
                            className="inline-flex items-center gap-2 text-sm text-[#6b4c3b] hover:text-[#c8622a] transition-colors"
                        >
                            ← Continue browsing menu
                        </Link>
                    </div>

                    {/* ── Checkout panel ── */}
                    <div className="lg:col-span-5">
                        <div className="lg:sticky lg:top-24 space-y-4">
                            <div className="bg-white border border-[#e8ddd4] rounded-xl p-5 shadow-sm space-y-5">

                                {/* Payment method toggle */}
                                {(mpesaConfig?.enabled || mpesaConfig?.paypalEnabled) && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-wider text-[#6b4c3b]">
                                            Payment method
                                        </p>
                                        <div className="flex gap-2">
                                            {mpesaConfig?.enabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('mpesa')}
                                                    disabled={isProcessing}
                                                    className={`flex-1 py-2.5 text-sm font-medium rounded-full border transition-all duration-200 ${
                                                        paymentMethod === 'mpesa'
                                                            ? 'bg-[#c8622a] border-[#c8622a] text-white'
                                                            : 'bg-white border-[#e8ddd4] text-[#2c1810] hover:border-[#c8622a]'
                                                    }`}
                                                >
                                                    M-PESA
                                                </button>
                                            )}
                                            {mpesaConfig?.paypalEnabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('paypal')}
                                                    disabled={isProcessing}
                                                    className={`flex-1 py-2.5 text-sm font-medium rounded-full border transition-all duration-200 ${
                                                        paymentMethod === 'paypal'
                                                            ? 'bg-[#c8622a] border-[#c8622a] text-white'
                                                            : 'bg-white border-[#e8ddd4] text-[#2c1810] hover:border-[#c8622a]'
                                                    }`}
                                                >
                                                    PayPal
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* No payment configured */}
                                {!mpesaConfig?.enabled && !mpesaConfig?.paypalEnabled && (
                                    <p className="text-xs text-[#6b4c3b] bg-[#f5ede3] rounded-lg p-3">
                                        Payments are not yet configured for this store.
                                    </p>
                                )}

                                {/* M-PESA form */}
                                {paymentMethod === 'mpesa' && mpesaConfig?.enabled && (
                                    <div className="space-y-4">
                                        {/* Instructions */}
                                        <div className="bg-[#fff8f3] border border-[#e8ddd4] rounded-xl p-4 text-sm space-y-2.5">
                                            <p className="text-xs font-medium uppercase tracking-wider text-[#6b4c3b] mb-2">
                                                How to pay
                                            </p>
                                            {[
                                                <>
                                                    M-PESA → Lipa na M-PESA →{' '}
                                                    {mpesaConfig.type === 'paybill'
                                                        ? 'Pay Bill'
                                                        : 'Buy Goods and Services'}
                                                </>,
                                                <>
                                                    Enter{' '}
                                                    {mpesaConfig.type === 'paybill' ? 'Business' : 'Till'}{' '}
                                                    Number:{' '}
                                                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[#2c1810] bg-[#f0e8e0] px-2 py-0.5 rounded">
                                                        {mpesaConfig.number || '—'}
                                                        {mpesaConfig.number && (
                                                            <CopyButton
                                                                content={mpesaConfig.number}
                                                                size="xs"
                                                            />
                                                        )}
                                                    </span>
                                                </>,
                                                ...(mpesaConfig.type === 'paybill' && mpesaConfig.account
                                                    ? [
                                                          <>
                                                              Account:{' '}
                                                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[#2c1810] bg-[#f0e8e0] px-2 py-0.5 rounded">
                                                                  {mpesaConfig.account}
                                                                  <CopyButton
                                                                      content={mpesaConfig.account}
                                                                      size="xs"
                                                                  />
                                                              </span>
                                                          </>,
                                                      ]
                                                    : []),
                                                <>
                                                    Amount:{' '}
                                                    <span className="font-bold text-[#c8622a]">
                                                        {formatKES(subtotal)}
                                                    </span>
                                                </>,
                                                <>Enter your PIN and confirm</>,
                                                <>Paste the confirmation code below</>,
                                            ].map((step, i) => (
                                                <div key={i} className="flex gap-2.5 text-xs text-[#6b4c3b]">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#c8622a] text-white text-[10px] flex items-center justify-center font-bold">
                                                        {i + 1}
                                                    </span>
                                                    <span className="pt-0.5">{step}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-1.5">
                                            <label
                                                htmlFor="mpesa-phone"
                                                className="flex items-center gap-1.5 text-xs font-medium text-[#6b4c3b]"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                M-PESA Phone <span className="text-[#c8622a]">*</span>
                                            </label>
                                            <input
                                                id="mpesa-phone"
                                                type="tel"
                                                inputMode="tel"
                                                value={guest.mpesaPhone}
                                                onChange={setField('mpesaPhone')}
                                                placeholder="0712 345 678"
                                                disabled={isProcessing}
                                                className="w-full border border-[#e8ddd4] bg-white rounded-xl px-4 py-3 text-sm text-[#2c1810] placeholder-[#6b4c3b]/40 focus:outline-none focus:ring-2 focus:ring-[#c8622a]/30 focus:border-[#c8622a] disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Transaction code */}
                                        <div className="space-y-1.5">
                                            <label
                                                htmlFor="mpesa-code"
                                                className="flex items-center gap-1.5 text-xs font-medium text-[#6b4c3b]"
                                            >
                                                Transaction Code <span className="text-[#c8622a]">*</span>
                                            </label>
                                            <input
                                                id="mpesa-code"
                                                type="text"
                                                value={guest.mpesaCode}
                                                onChange={(e) =>
                                                    setGuest((p) => ({
                                                        ...p,
                                                        mpesaCode: e.target.value.toUpperCase(),
                                                    }))
                                                }
                                                placeholder="e.g. QW12ABCDEF"
                                                disabled={isProcessing}
                                                className="w-full border border-[#e8ddd4] bg-white rounded-xl px-4 py-3 text-sm font-mono text-[#2c1810] placeholder-[#6b4c3b]/40 focus:outline-none focus:ring-2 focus:ring-[#c8622a]/30 focus:border-[#c8622a] disabled:opacity-50"
                                            />
                                        </div>

                                        <div className="h-px bg-[#f0e8e0]" />
                                        <p className="text-xs font-medium uppercase tracking-wider text-[#6b4c3b]">
                                            Contact (optional)
                                        </p>

                                        {/* WhatsApp */}
                                        <div className="space-y-1.5">
                                            <label
                                                htmlFor="whatsapp"
                                                className="flex items-center gap-1.5 text-xs text-[#6b4c3b]"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                WhatsApp{' '}
                                                <span className="opacity-60">
                                                    (if different from M-PESA number)
                                                </span>
                                            </label>
                                            <input
                                                id="whatsapp"
                                                type="tel"
                                                inputMode="tel"
                                                value={guest.whatsapp}
                                                onChange={setField('whatsapp')}
                                                placeholder="0712 345 678"
                                                disabled={isProcessing}
                                                className="w-full border border-[#e8ddd4] bg-white rounded-xl px-4 py-3 text-sm text-[#2c1810] placeholder-[#6b4c3b]/40 focus:outline-none focus:ring-2 focus:ring-[#c8622a]/30 focus:border-[#c8622a] disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <label
                                                htmlFor="email"
                                                className="flex items-center gap-1.5 text-xs text-[#6b4c3b]"
                                            >
                                                <Mail className="w-3.5 h-3.5" />
                                                Email{' '}
                                                <span className="opacity-60">(for receipt)</span>
                                            </label>
                                            <input
                                                id="email"
                                                type="email"
                                                value={guest.email}
                                                onChange={setField('email')}
                                                placeholder="you@example.com"
                                                disabled={isProcessing}
                                                className="w-full border border-[#e8ddd4] bg-white rounded-xl px-4 py-3 text-sm text-[#2c1810] placeholder-[#6b4c3b]/40 focus:outline-none focus:ring-2 focus:ring-[#c8622a]/30 focus:border-[#c8622a] disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* PayPal info */}
                                {paymentMethod === 'paypal' && mpesaConfig?.paypalEnabled && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-sm">
                                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-blue-800">Payment in USD</p>
                                            <p className="text-blue-600 text-xs mt-0.5">
                                                You'll be charged approximately{' '}
                                                <strong>{formatUSD(totalUSD)}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Error */}
                                {error && (
                                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Total + submit */}
                                <div className="space-y-3 pt-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-[#6b4c3b]">Total</span>
                                        <span className="font-serif font-bold text-2xl text-[#2c1810]">
                                            {formatKES(subtotal)}
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleCheckout}
                                        disabled={
                                            isProcessing ||
                                            (!mpesaConfig?.enabled && !mpesaConfig?.paypalEnabled)
                                        }
                                        className="w-full flex items-center justify-center gap-2.5 bg-[#c8622a] hover:bg-[#b05520] disabled:bg-[#c8622a]/40 text-white font-medium py-4 rounded-xl text-base transition-colors duration-200 shadow-sm"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                {paymentMethod === 'mpesa'
                                                    ? 'Submitting…'
                                                    : 'Redirecting to PayPal…'}
                                            </>
                                        ) : paymentMethod === 'mpesa' ? (
                                            <>
                                                <Shield className="w-5 h-5" />
                                                Confirm M-PESA Payment
                                            </>
                                        ) : (
                                            <>
                                                <Shield className="w-5 h-5" />
                                                Pay with PayPal · {formatUSD(totalUSD)}
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-1.5 text-xs text-[#6b4c3b]">
                                        <Shield className="w-3.5 h-3.5 text-[#c8622a]/60" />
                                        <span>
                                            {paymentMethod === 'mpesa'
                                                ? 'Your transaction code verifies this payment'
                                                : 'Secured by PayPal'}
                                        </span>
                                    </div>

                                    <p className="text-xs text-center text-[#6b4c3b]">
                                        By completing your purchase you agree to our{' '}
                                        <Link
                                            href="/terms"
                                            className="underline underline-offset-2 hover:text-[#c8622a]"
                                        >
                                            Terms
                                        </Link>{' '}
                                        and{' '}
                                        <Link
                                            href="/privacy"
                                            className="underline underline-offset-2 hover:text-[#c8622a]"
                                        >
                                            Privacy Policy
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
