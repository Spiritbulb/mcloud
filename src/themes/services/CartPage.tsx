'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Loader2, Trash2, Plus, Minus, Shield, AlertCircle,
    Info, Phone, Mail, MessageCircle, ArrowLeft, ShoppingCart,
} from 'lucide-react'
import { convertKEStoUSD, formatKES, formatUSD } from '@/lib/currency'
import { CopyButton } from '@/components/animate-ui/components/buttons/copy'
import type { CartPageProps, GuestDetails } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_GUEST: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }

function fmt(amount: number, currency: string = 'KES') {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

// ─── Services Cart Page ────────────────────────────────────────────────────────

export default function ServicesCartPage({
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

    const setField = (field: keyof GuestDetails) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setGuest((prev) => ({ ...prev, [field]: e.target.value }))

    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalUSD = convertKEStoUSD(subtotal)

    const validate = (): string | null => {
        if (paymentMethod === 'mpesa') {
            if (!guest.mpesaPhone.trim()) return 'M-PESA phone number is required'
            if (!/^(?:\+?254|0)[17]\d{8}$/.test(guest.mpesaPhone.trim()))
                return 'Enter a valid Kenyan phone number (e.g. 0712 345 678)'
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
                await onMpesaCheckout({ ...guest, mpesaCode: guest.mpesaCode.trim().toUpperCase() })
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
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#2563eb]" />
            </div>
        )
    }

    // ── Empty cart ──
    if (cartItems.length === 0) {
        return (
            <div
                className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4"
                style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
            >
                <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm max-w-sm w-full p-10 text-center space-y-5">
                    <div className="w-16 h-16 bg-[#eff6ff] rounded-full flex items-center justify-center mx-auto">
                        <ShoppingCart className="w-8 h-8 text-[#2563eb]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0f172a]">Your cart is empty</h2>
                    <p className="text-sm text-[#64748b] leading-relaxed">
                        You haven't added any services yet. Browse what we offer and get started.
                    </p>
                    <Link
                        href={`/store/${storeSlug}/products`}
                        className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm w-full justify-center"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Browse Services
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen bg-[#f8fafc] text-[#0f172a]"
            style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
        >
            <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">

                {/* Back link */}
                <Link
                    href={`/store/${storeSlug}/products`}
                    className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#2563eb] transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Continue browsing services
                </Link>

                <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight mb-8">
                    Order Summary
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ── Cart Items ── */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm divide-y divide-[#f1f5f9] overflow-hidden">
                            {cartItems.map((item) => (
                                <div key={item.variantId} className="p-5 flex gap-4 items-start">
                                    {/* Image */}
                                    <div className="w-18 h-18 flex-shrink-0 rounded-lg overflow-hidden bg-[#f1f5f9] w-[72px] h-[72px]">
                                        <img
                                            src={item.image || '/api/placeholder/200/200'}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="text-sm font-semibold text-[#0f172a] leading-snug line-clamp-2">
                                                {item.name}
                                            </h3>
                                            <button
                                                onClick={() => onRemoveItem(item.variantId)}
                                                disabled={itemLoadingStates[item.variantId]}
                                                className="flex-shrink-0 p-1.5 rounded-md text-[#94a3b8] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                            >
                                                {itemLoadingStates[item.variantId]
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            {/* Qty control */}
                                            <div className="inline-flex items-center border border-[#e2e8f0] rounded-lg overflow-hidden bg-[#f8fafc]">
                                                <button
                                                    onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                                                    disabled={itemLoadingStates[item.variantId] || item.quantity <= 1}
                                                    className="w-8 h-8 flex items-center justify-center text-[#64748b] hover:text-[#0f172a] disabled:opacity-30 transition-colors"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-9 text-center text-sm font-semibold text-[#0f172a] select-none tabular-nums">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                                                    disabled={itemLoadingStates[item.variantId]}
                                                    className="w-8 h-8 flex items-center justify-center text-[#64748b] hover:text-[#0f172a] disabled:opacity-30 transition-colors"
                                                >
                                                    {itemLoadingStates[item.variantId]
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <Plus className="w-3 h-3" />}
                                                </button>
                                            </div>

                                            {/* Price */}
                                            <div className="text-right">
                                                <div className="text-base font-bold text-[#0f172a]">
                                                    {formatKES(item.price * item.quantity)}
                                                </div>
                                                {item.quantity > 1 && (
                                                    <div className="text-xs text-[#94a3b8]">
                                                        {formatKES(item.price)} each
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order totals */}
                        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 space-y-3">
                            <div className="flex justify-between text-sm text-[#64748b]">
                                <span>Subtotal</span>
                                <span className="text-[#0f172a] font-medium">{formatKES(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-[#64748b]">
                                <span>Processing fee</span>
                                <span className="text-green-600 font-medium">Free</span>
                            </div>
                            <div className="h-px bg-[#e2e8f0]" />
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-semibold text-[#0f172a]">Total</span>
                                <span className="text-2xl font-bold text-[#0f172a]">{formatKES(subtotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Payment Panel ── */}
                    <div className="lg:col-span-5">
                        <div className="lg:sticky lg:top-24 space-y-4">
                            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-5">
                                <h2 className="text-base font-bold text-[#0f172a]">Payment</h2>

                                {/* Payment method tabs */}
                                {(mpesaConfig?.enabled || mpesaConfig?.paypalEnabled) && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
                                            Payment method
                                        </p>
                                        <div className="flex gap-2">
                                            {mpesaConfig?.enabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('mpesa')}
                                                    disabled={isProcessing}
                                                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${paymentMethod === 'mpesa'
                                                        ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                                        : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2563eb]/50'}`}
                                                >
                                                    M-PESA
                                                </button>
                                            )}
                                            {mpesaConfig?.paypalEnabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('paypal')}
                                                    disabled={isProcessing}
                                                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${paymentMethod === 'paypal'
                                                        ? 'bg-[#2563eb] text-white border-[#2563eb]'
                                                        : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2563eb]/50'}`}
                                                >
                                                    PayPal
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!mpesaConfig?.enabled && !mpesaConfig?.paypalEnabled && (
                                    <div className="flex items-start gap-2.5 bg-[#fafafa] border border-[#e2e8f0] rounded-lg p-4 text-sm text-[#64748b]">
                                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#94a3b8]" />
                                        <span>Payments are not yet configured for this store.</span>
                                    </div>
                                )}

                                {/* M-PESA form */}
                                {paymentMethod === 'mpesa' && mpesaConfig?.enabled && (
                                    <div className="space-y-4">
                                        {/* Instructions */}
                                        <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-4 text-xs space-y-2.5 leading-relaxed">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-[#0369a1] mb-2">
                                                How to pay
                                            </p>
                                            {[
                                                <>M-PESA → Lipa na M-PESA → {mpesaConfig.type === 'paybill' ? 'Pay Bill' : 'Buy Goods and Services'}</>,
                                                <>
                                                    {mpesaConfig.type === 'paybill' ? 'Business' : 'Till'} Number:{' '}
                                                    <span className="font-mono font-bold inline-flex items-center gap-1">
                                                        {mpesaConfig.number || '—'}
                                                        {mpesaConfig.number && <CopyButton content={mpesaConfig.number} size="xs" />}
                                                    </span>
                                                </>,
                                                ...(mpesaConfig.type === 'paybill' && mpesaConfig.account
                                                    ? [<>Account Number: <span className="font-mono font-bold inline-flex items-center gap-1">{mpesaConfig.account}<CopyButton content={mpesaConfig.account} size="xs" /></span></>]
                                                    : []),
                                                <>Amount: <span className="font-mono font-bold">{formatKES(subtotal)}</span></>,
                                                <>Enter your M-PESA PIN and confirm</>,
                                                <>Paste the confirmation code below</>,
                                            ].map((step, i) => (
                                                <div key={i} className="flex gap-2.5 text-[#0c4a6e]">
                                                    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded-full bg-[#0369a1] text-white">
                                                        {i + 1}
                                                    </span>
                                                    <span>{step}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* M-PESA Phone */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="svc-mpesa-phone" className="text-xs font-semibold uppercase tracking-widest text-[#64748b] flex items-center gap-1.5">
                                                <Phone className="w-3 h-3" />
                                                M-PESA Phone <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="svc-mpesa-phone"
                                                type="tel"
                                                inputMode="tel"
                                                value={guest.mpesaPhone}
                                                onChange={setField('mpesaPhone')}
                                                placeholder="0712 345 678"
                                                disabled={isProcessing}
                                                className="w-full px-4 py-2.5 text-sm border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] disabled:opacity-50 bg-white text-[#0f172a] placeholder-[#94a3b8]"
                                            />
                                        </div>

                                        {/* Transaction Code */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="svc-mpesa-code" className="text-xs font-semibold uppercase tracking-widest text-[#64748b]">
                                                Transaction Code <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="svc-mpesa-code"
                                                type="text"
                                                value={guest.mpesaCode}
                                                onChange={(e) => setGuest((p) => ({ ...p, mpesaCode: e.target.value.toUpperCase() }))}
                                                placeholder="e.g. QW12ABCDEF"
                                                disabled={isProcessing}
                                                className="w-full px-4 py-2.5 text-sm border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] disabled:opacity-50 bg-white text-[#0f172a] placeholder-[#94a3b8] font-mono"
                                            />
                                        </div>

                                        <div className="h-px bg-[#f1f5f9]" />
                                        <p className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8]">
                                            Contact (optional)
                                        </p>

                                        {/* WhatsApp */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="svc-whatsapp" className="text-xs text-[#64748b] flex items-center gap-1.5">
                                                <MessageCircle className="w-3 h-3" />
                                                WhatsApp{' '}
                                                <span className="text-[#94a3b8]">(if different from M-PESA number)</span>
                                            </label>
                                            <input
                                                id="svc-whatsapp"
                                                type="tel"
                                                inputMode="tel"
                                                value={guest.whatsapp}
                                                onChange={setField('whatsapp')}
                                                placeholder="0712 345 678"
                                                disabled={isProcessing}
                                                className="w-full px-4 py-2.5 text-sm border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] disabled:opacity-50 bg-white text-[#0f172a] placeholder-[#94a3b8]"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="svc-email" className="text-xs text-[#64748b] flex items-center gap-1.5">
                                                <Mail className="w-3 h-3" />
                                                Email{' '}
                                                <span className="text-[#94a3b8]">(for receipt)</span>
                                            </label>
                                            <input
                                                id="svc-email"
                                                type="email"
                                                value={guest.email}
                                                onChange={setField('email')}
                                                placeholder="you@example.com"
                                                disabled={isProcessing}
                                                className="w-full px-4 py-2.5 text-sm border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] disabled:opacity-50 bg-white text-[#0f172a] placeholder-[#94a3b8]"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* PayPal info */}
                                {paymentMethod === 'paypal' && mpesaConfig?.paypalEnabled && (
                                    <div className="flex items-start gap-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-4 text-sm text-[#0c4a6e]">
                                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#0369a1]" />
                                        <div>
                                            <p className="font-semibold mb-0.5">Payment in USD</p>
                                            <p className="text-xs text-[#0369a1]">
                                                You'll be charged approximately{' '}
                                                <strong>{formatUSD(totalUSD)}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Error */}
                                {error && (
                                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Submit */}
                                {(mpesaConfig?.enabled || mpesaConfig?.paypalEnabled) && (
                                    <button
                                        onClick={handleCheckout}
                                        disabled={isProcessing || (!mpesaConfig?.enabled && paymentMethod === 'mpesa')}
                                        className="w-full inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white font-bold py-3.5 rounded-lg transition-colors text-base shadow-md"
                                    >
                                        {isProcessing ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" />{paymentMethod === 'mpesa' ? 'Submitting…' : 'Redirecting to PayPal…'}</>
                                        ) : paymentMethod === 'mpesa' ? (
                                            <><Shield className="w-5 h-5" />Confirm M-PESA Payment</>
                                        ) : (
                                            <><Shield className="w-5 h-5" />Pay with PayPal · {formatUSD(totalUSD)}</>
                                        )}
                                    </button>
                                )}

                                {/* Security note */}
                                <div className="flex items-center justify-center gap-1.5 text-xs text-[#94a3b8] py-1">
                                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>
                                        {paymentMethod === 'mpesa'
                                            ? 'Your transaction code verifies this payment'
                                            : 'Secured by PayPal'}
                                    </span>
                                </div>

                                <p className="text-xs text-center text-[#94a3b8] leading-relaxed">
                                    By completing your purchase you agree to our{' '}
                                    <Link href="/terms" className="underline underline-offset-2 hover:text-[#64748b]">Terms</Link>
                                    {' '}and{' '}
                                    <Link href="/privacy" className="underline underline-offset-2 hover:text-[#64748b]">Privacy Policy</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
