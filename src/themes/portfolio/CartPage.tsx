'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ShoppingBag, Plus, Minus, X, Loader2, AlertCircle, Info,
    ArrowLeft, ArrowRight,
} from 'lucide-react'
import { convertKEStoUSD, formatKES, formatUSD } from '@/lib/currency'
import type { CartPageProps, GuestDetails } from '../types'

const EMPTY_GUEST: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }

function fmt(amount: number) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount)
}

export default function PortfolioCartPage({
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
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'paypal'>('mpesa')
    const [guest, setGuest] = useState<GuestDetails>(EMPTY_GUEST)
    const [error, setError] = useState('')

    const setField = (f: keyof GuestDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setGuest(p => ({ ...p, [f]: e.target.value }))

    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalUSD = convertKEStoUSD(subtotal)

    const validate = (): string | null => {
        if (paymentMethod === 'mpesa') {
            if (!guest.mpesaPhone.trim()) return 'Phone number is required'
            if (!/^(?:\+?254|0)[17]\d{8}$/.test(guest.mpesaPhone.trim())) return 'Enter a valid Kenyan phone number'
            if (!guest.mpesaCode.trim()) return 'Transaction code is required'
            if (!/^[A-Z0-9]{6,20}$/.test(guest.mpesaCode.trim().toUpperCase())) return 'Invalid M-PESA transaction code'
        }
        if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) return 'Enter a valid email'
        return null
    }

    const handleCheckout = async () => {
        const err = validate()
        if (err) { setError(err); return }
        setError('')
        try {
            if (paymentMethod === 'mpesa') await onMpesaCheckout({ ...guest, mpesaCode: guest.mpesaCode.toUpperCase() })
            else await onPaypalCheckout()
        } catch (e: any) {
            setError(e.message || 'Checkout failed. Please try again.')
        }
    }

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-white font-sans flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-[#6366f1] animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading cart…</p>
                </div>
            </div>
        )
    }

    // ── Empty ──
    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-white font-sans flex items-center justify-center px-6">
                <div className="text-center space-y-8 max-w-sm">
                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-[#111111] mb-3">Cart is empty</h2>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            You haven&apos;t added any projects yet. Browse our work to find something that fits your needs.
                        </p>
                    </div>
                    <Link
                        href={`/store/${storeSlug}/products`}
                        className="inline-flex items-center gap-2 bg-[#6366f1] text-white font-bold text-sm uppercase tracking-widest px-8 py-4 hover:bg-[#4f46e5] transition-colors"
                    >
                        Browse Work <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-[#111111] font-sans">

            {/* ── NAV ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                    <Link
                        href={`/store/${storeSlug}/products`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#111111] transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Continue Shopping
                    </Link>
                    <Link href={`/store/${storeSlug}`} className="text-base font-black tracking-tight text-[#111111] hover:text-[#6366f1] transition-colors">
                        Cart
                    </Link>
                </div>
            </nav>

            <div className="pt-16">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">

                    {/* Header */}
                    <div className="mb-12">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6366f1] mb-3">Order Summary</p>
                        <h1 className="text-4xl md:text-6xl font-black text-[#111111] leading-tight">
                            Your Cart
                        </h1>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-12 xl:gap-16">

                        {/* ── Cart Items ── */}
                        <div className="lg:col-span-7 space-y-0 divide-y divide-gray-100">
                            {cartItems.map(item => (
                                <div key={item.variantId} className="py-6 flex gap-5">
                                    {/* Image */}
                                    <div className="flex-shrink-0 w-20 h-20 bg-gray-50 border border-gray-100 overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ShoppingBag className="w-5 h-5 text-gray-200" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <h3 className="text-base font-black text-[#111111] leading-tight">{item.name}</h3>
                                            <button
                                                onClick={() => onRemoveItem(item.variantId)}
                                                disabled={itemLoadingStates[item.variantId]}
                                                className="text-gray-300 hover:text-[#111111] disabled:opacity-40 transition-colors flex-shrink-0"
                                            >
                                                {itemLoadingStates[item.variantId]
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <X className="w-4 h-4" />
                                                }
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            {/* Quantity controls */}
                                            <div className="flex items-stretch border-2 border-gray-100 hover:border-gray-200 transition-colors">
                                                <button
                                                    onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                                                    disabled={itemLoadingStates[item.variantId] || item.quantity <= 1}
                                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#111111] disabled:opacity-30 transition-colors"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-9 flex items-center justify-center text-sm font-black border-x-2 border-gray-100">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                                                    disabled={itemLoadingStates[item.variantId]}
                                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#111111] disabled:opacity-30 transition-colors"
                                                >
                                                    {itemLoadingStates[item.variantId]
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <Plus className="w-3 h-3" />
                                                    }
                                                </button>
                                            </div>

                                            {/* Price */}
                                            <span className="text-base font-black text-[#111111]">
                                                {formatKES(item.price * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Continue shopping */}
                            <div className="pt-6">
                                <Link
                                    href={`/store/${storeSlug}/products`}
                                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#6366f1] transition-colors group"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                    Continue Shopping
                                </Link>
                            </div>
                        </div>

                        {/* ── Checkout Panel ── */}
                        <div className="lg:col-span-5 space-y-6">

                            {/* Subtotal */}
                            <div className="border border-gray-100 p-6 space-y-4">
                                <h2 className="text-sm font-black uppercase tracking-widest text-[#111111]">Order Total</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Subtotal</span>
                                        <span className="font-bold">{formatKES(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Shipping</span>
                                        <span className="font-bold text-green-500">Free</span>
                                    </div>
                                    <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                                        <span className="text-sm font-black uppercase tracking-widest text-[#111111]">Total</span>
                                        <span className="text-2xl font-black text-[#111111]">{formatKES(subtotal)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment method tabs */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Payment Method</p>
                                <div className="flex gap-2">
                                    {mpesaConfig?.enabled && (
                                        <button
                                            onClick={() => setPaymentMethod('mpesa')}
                                            disabled={isProcessing}
                                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 transition-all duration-150 ${paymentMethod === 'mpesa'
                                                ? 'border-[#6366f1] bg-[#6366f1] text-white'
                                                : 'border-gray-200 text-gray-500 hover:border-[#6366f1]/40 hover:text-[#6366f1]'
                                                }`}
                                        >
                                            M-Pesa
                                        </button>
                                    )}
                                    {mpesaConfig?.paypalEnabled && (
                                        <button
                                            onClick={() => setPaymentMethod('paypal')}
                                            disabled={isProcessing}
                                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest border-2 transition-all duration-150 ${paymentMethod === 'paypal'
                                                ? 'border-[#6366f1] bg-[#6366f1] text-white'
                                                : 'border-gray-200 text-gray-500 hover:border-[#6366f1]/40 hover:text-[#6366f1]'
                                                }`}
                                        >
                                            PayPal
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* M-Pesa form */}
                            {paymentMethod === 'mpesa' && mpesaConfig?.enabled && (
                                <div className="border border-gray-100 p-6 space-y-5 bg-gray-50/50">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-[#111111] mb-3">How to Pay</p>
                                        <ol className="space-y-2 text-xs text-gray-400">
                                            {[
                                                <>M-PESA → Lipa na M-PESA → {mpesaConfig.type === 'paybill' ? 'Pay Bill' : 'Buy Goods'}</>,
                                                <>{mpesaConfig.type === 'paybill' ? 'Business' : 'Till'} No:{' '}
                                                    <span className="font-black text-[#111111] font-mono">{mpesaConfig.number}</span></>,
                                                ...(mpesaConfig.type === 'paybill' && mpesaConfig.account
                                                    ? [<>Account: <span className="font-black text-[#111111] font-mono">{mpesaConfig.account}</span></>]
                                                    : []),
                                                <>Amount: <span className="font-black text-[#111111]">{formatKES(subtotal)}</span></>,
                                                <>Paste your M-PESA confirmation code below</>,
                                            ].map((step, i) => (
                                                <li key={i} className="flex gap-2.5">
                                                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                                                    <span>{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    <div className="border-t border-gray-100 pt-5 space-y-4">
                                        {[
                                            { id: 'pf-phone', label: 'Phone Number *', field: 'mpesaPhone' as keyof GuestDetails, placeholder: '0712 345 678', type: 'tel' },
                                            { id: 'pf-code', label: 'Transaction Code *', field: 'mpesaCode' as keyof GuestDetails, placeholder: 'QW12ABCDEF', type: 'text' },
                                            { id: 'pf-wa', label: 'WhatsApp (optional)', field: 'whatsapp' as keyof GuestDetails, placeholder: '0712 345 678', type: 'tel' },
                                            { id: 'pf-email', label: 'Email (optional)', field: 'email' as keyof GuestDetails, placeholder: 'you@example.com', type: 'email' },
                                        ].map(({ id, label, field, placeholder, type }) => (
                                            <div key={id}>
                                                <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                                                    {label}
                                                </label>
                                                <input
                                                    id={id}
                                                    type={type}
                                                    value={guest[field]}
                                                    onChange={field === 'mpesaCode'
                                                        ? e => setGuest(p => ({ ...p, mpesaCode: e.target.value.toUpperCase() }))
                                                        : setField(field)
                                                    }
                                                    placeholder={placeholder}
                                                    disabled={isProcessing}
                                                    className="w-full border-2 border-gray-200 focus:border-[#6366f1] bg-white text-sm text-[#111111] placeholder:text-gray-300 outline-none px-4 py-3 transition-colors disabled:opacity-50"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PayPal info */}
                            {paymentMethod === 'paypal' && mpesaConfig?.paypalEnabled && (
                                <div className="border border-gray-100 p-5 bg-gray-50/50 flex items-start gap-3">
                                    <Info className="w-4 h-4 text-[#6366f1] flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-gray-400 space-y-1">
                                        <p className="font-bold text-[#111111] uppercase tracking-widest text-[11px]">USD Payment via PayPal</p>
                                        <p>You will be charged approximately <span className="font-black text-[#111111]">{formatUSD(totalUSD)}</span></p>
                                        <p>You&apos;ll be redirected to PayPal to complete your purchase securely.</p>
                                    </div>
                                </div>
                            )}

                            {/* No payment method configured */}
                            {!mpesaConfig?.enabled && !mpesaConfig?.paypalEnabled && (
                                <div className="border border-orange-100 p-4 bg-orange-50 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-orange-500">No payment method is currently configured for this store.</p>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="border border-red-100 p-4 bg-red-50 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-500">{error}</p>
                                </div>
                            )}

                            {/* CTA */}
                            <button
                                onClick={handleCheckout}
                                disabled={
                                    isProcessing ||
                                    (paymentMethod === 'mpesa' && !mpesaConfig?.enabled) ||
                                    (paymentMethod === 'paypal' && !mpesaConfig?.paypalEnabled)
                                }
                                className="w-full flex items-center justify-center gap-3 bg-[#6366f1] text-white font-black text-sm uppercase tracking-widest py-5 hover:bg-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isProcessing
                                    ? 'Processing…'
                                    : paymentMethod === 'mpesa'
                                        ? 'Confirm Payment'
                                        : `Pay with PayPal · ${formatUSD(totalUSD)}`
                                }
                            </button>

                            <p className="text-[11px] text-gray-300 text-center leading-relaxed">
                                By purchasing you agree to our{' '}
                                <Link href="/terms" className="text-gray-400 underline underline-offset-2 hover:text-[#6366f1]">Terms</Link>
                                {' '}and{' '}
                                <Link href="/privacy" className="text-gray-400 underline underline-offset-2 hover:text-[#6366f1]">Privacy Policy</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
