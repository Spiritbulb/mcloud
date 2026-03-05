'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Minus, Trash2, ShoppingBag, Shield, Info, AlertCircle, Phone, Mail, MessageCircle } from 'lucide-react'
import { convertKEStoUSD, formatKES, formatUSD } from '@/lib/currency'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CopyButton } from '@/components/animate-ui/components/buttons/copy'
import type { CartPageProps, GuestDetails } from '../types'

function Grain() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] opacity-[0.032] mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }}
        />
    )
}

const EMPTY_GUEST: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }

export default function NoirCartPage({
    storeSlug, cartItems, loading, itemLoadingStates, mpesaConfig,
    onUpdateQuantity, onRemoveItem, onMpesaCheckout, onPaypalCheckout, isProcessing,
}: CartPageProps) {
    const router = useRouter()
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'paypal'>('mpesa')
    const [guest, setGuest] = useState<GuestDetails>(EMPTY_GUEST)
    const [error, setError] = useState('')

    const setField = (f: keyof GuestDetails) => (e: React.ChangeEvent<HTMLInputElement>) => setGuest(p => ({ ...p, [f]: e.target.value }))

    const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalUSD = convertKEStoUSD(subtotal)

    const validate = (): string | null => {
        if (paymentMethod === 'mpesa') {
            if (!guest.mpesaPhone.trim()) return 'M-PESA phone number is required'
            if (!/^(?:\+?254|0)[17]\d{8}$/.test(guest.mpesaPhone.trim())) return 'Enter a valid Kenyan phone number'
            if (!guest.mpesaCode.trim()) return 'M-PESA transaction code is required'
            if (!/^[A-Z0-9]{6,20}$/.test(guest.mpesaCode.trim().toUpperCase())) return 'Invalid M-PESA transaction code'
        }
        if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) return 'Enter a valid email address'
        return null
    }

    const handleCheckout = async () => {
        const err = validate()
        if (err) { setError(err); return }
        setError('')
        try {
            if (paymentMethod === 'mpesa') await onMpesaCheckout({ ...guest, mpesaCode: guest.mpesaCode.toUpperCase() })
            else await onPaypalCheckout()
        } catch (e: any) { setError(e.message || 'Checkout failed') }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#080808] flex items-center justify-center">
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#c9a96e] to-transparent animate-pulse" />
            </div>
        )
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-[#080808] flex items-center justify-center px-8" style={{ fontFamily: "'Jost', sans-serif" }}>
                <Grain />
                <div className="text-center space-y-6">
                    <ShoppingBag className="w-10 h-10 text-[#222] mx-auto" />
                    <div>
                        <h2 className="text-4xl font-normal uppercase text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Your bag is empty</h2>
                        <p className="text-sm text-[#555] font-light" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>Discover the collection</p>
                    </div>
                    <button
                        onClick={() => router.push(`/store/${storeSlug}/products`)}
                        className="inline-flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-[#e8e2d9] border-b border-[#c9a96e]/50 pb-0.5 hover:border-[#c9a96e] transition-colors"
                    >
                        Browse all pieces
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#080808] text-[#e8e2d9]" style={{ fontFamily: "'Jost', sans-serif" }}>
            <Grain />
            <div className="max-w-6xl mx-auto px-8 md:px-16 pt-24 pb-20">

                {/* Header */}
                <div className="mb-12">
                    <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e] mb-2">Review your selection</p>
                    <h1 className="text-5xl md:text-7xl font-normal uppercase text-white leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        Your Bag
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

                    {/* ── Items ── */}
                    <div className="lg:col-span-7 space-y-0 divide-y divide-[#151515]">
                        {cartItems.map(item => (
                            <div key={item.variantId} className="py-6 flex gap-5">
                                <div className="relative flex-shrink-0 w-20 h-24 bg-[#0d0d0d] overflow-hidden">
                                    <img src={item.image || '/api/placeholder/80/96'} alt={item.name} className="object-cover opacity-85 w-full h-full" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h3 className="text-sm font-light text-[#e8e2d9] leading-snug" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem' }}>
                                            {item.name}
                                        </h3>
                                        <button
                                            onClick={() => onRemoveItem(item.variantId)}
                                            disabled={itemLoadingStates[item.variantId]}
                                            className="text-[#333] hover:text-[#c9a96e] transition-colors flex-shrink-0 disabled:opacity-30"
                                        >
                                            {itemLoadingStates[item.variantId] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center border border-[#1a1a1a]">
                                            <button
                                                onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                                                disabled={itemLoadingStates[item.variantId] || item.quantity <= 1}
                                                className="w-7 h-7 flex items-center justify-center text-[#555] hover:text-[#e8e2d9] disabled:opacity-30 transition-colors"
                                            >
                                                <Minus className="w-2.5 h-2.5" />
                                            </button>
                                            <span className="w-8 text-center text-xs tabular-nums text-[#888]">{item.quantity}</span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                                                disabled={itemLoadingStates[item.variantId]}
                                                className="w-7 h-7 flex items-center justify-center text-[#555] hover:text-[#e8e2d9] disabled:opacity-30 transition-colors"
                                            >
                                                {itemLoadingStates[item.variantId] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                                            </button>
                                        </div>
                                        <span className="text-sm text-[#c9a96e] font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                            {formatKES(item.price * item.quantity)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="pt-6">
                            <Link href={`/store/${storeSlug}/products`} className="text-[9px] tracking-[0.35em] uppercase text-[#444] hover:text-[#c9a96e] transition-colors inline-flex items-center gap-2">
                                ← Continue browsing
                            </Link>
                        </div>
                    </div>

                    {/* ── Summary + checkout ── */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Totals */}
                        <div className="border border-[#151515] p-6 space-y-4">
                            <p className="text-[9px] tracking-[0.4em] uppercase text-[#555]">Order summary</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#666]">Subtotal</span>
                                    <span className="text-[#e8e2d9] font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{formatKES(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#666]">Shipping</span>
                                    <span className="text-[#e8e2d9]">Free</span>
                                </div>
                            </div>
                            <div className="h-px bg-[#151515]" />
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] tracking-[0.25em] uppercase text-[#555]">Total</span>
                                <span className="text-2xl font-light text-[#c9a96e]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                    {formatKES(subtotal)}
                                </span>
                            </div>
                        </div>

                        {/* Payment method */}
                        <div className="space-y-3">
                            <p className="text-[9px] tracking-[0.35em] uppercase text-[#555]">Payment</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPaymentMethod('mpesa')}
                                    disabled={isProcessing || !mpesaConfig?.enabled}
                                    className={`flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase border transition-colors ${paymentMethod === 'mpesa' ? 'border-[#c9a96e]/60 text-[#c9a96e] bg-[#c9a96e]/5' : 'border-[#1a1a1a] text-[#555] hover:border-[#333]'}`}
                                >
                                    M-Pesa
                                </button>
                                {mpesaConfig?.paypalEnabled && (
                                    <button
                                        onClick={() => setPaymentMethod('paypal')}
                                        disabled={isProcessing}
                                        className={`flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase border transition-colors ${paymentMethod === 'paypal' ? 'border-[#c9a96e]/60 text-[#c9a96e] bg-[#c9a96e]/5' : 'border-[#1a1a1a] text-[#555] hover:border-[#333]'}`}
                                    >
                                        PayPal
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* M-PESA form */}
                        {paymentMethod === 'mpesa' && (
                            <div className="space-y-4 border border-[#151515] p-5">
                                <p className="text-[9px] tracking-[0.35em] uppercase text-[#555] mb-4">How to pay</p>
                                <div className="space-y-2.5 text-xs text-[#666] font-light">
                                    {[
                                        <>M-PESA → Lipa na M-PESA → {mpesaConfig?.type === 'paybill' ? 'Pay Bill' : 'Buy Goods'}</>,
                                        <>{mpesaConfig?.type === 'paybill' ? 'Business' : 'Till'} No: <span className="text-[#c9a96e] font-mono">{mpesaConfig?.number || '—'}</span></>,
                                        ...(mpesaConfig?.type === 'paybill' && mpesaConfig.account ? [<>Account: <span className="text-[#c9a96e] font-mono">{mpesaConfig.account}</span></>] : []),
                                        <>Amount: <span className="text-[#c9a96e]">{formatKES(subtotal)}</span></>,
                                        <>Enter PIN → confirm → paste code below</>,
                                    ].map((step, i) => (
                                        <div key={i} className="flex gap-3">
                                            <span className="text-[#333] w-4 flex-shrink-0">{i + 1}.</span>
                                            <span>{step}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-px bg-[#151515] my-4" />

                                <div className="space-y-3">
                                    {[
                                        { id: 'phone', label: 'M-PESA Phone *', field: 'mpesaPhone' as keyof GuestDetails, placeholder: '0712 345 678', mode: 'tel' as const },
                                        { id: 'code', label: 'Transaction Code *', field: 'mpesaCode' as keyof GuestDetails, placeholder: 'QW12ABCDEF', mode: 'text' as const },
                                        { id: 'wa', label: 'WhatsApp (optional)', field: 'whatsapp' as keyof GuestDetails, placeholder: '0712 345 678', mode: 'tel' as const },
                                        { id: 'email', label: 'Email for receipt (optional)', field: 'email' as keyof GuestDetails, placeholder: 'you@example.com', mode: 'email' as const },
                                    ].map(({ id, label, field, placeholder, mode }) => (
                                        <div key={id} className="space-y-1">
                                            <label htmlFor={id} className="text-[9px] tracking-[0.3em] uppercase text-[#555]">{label}</label>
                                            <input
                                                id={id}
                                                value={guest[field]}
                                                onChange={field === 'mpesaCode'
                                                    ? (e) => setGuest(p => ({ ...p, mpesaCode: e.target.value.toUpperCase() }))
                                                    : setField(field)}
                                                placeholder={placeholder}
                                                inputMode={mode}
                                                disabled={isProcessing}
                                                className="w-full bg-transparent border-b border-[#1a1a1a] focus:border-[#c9a96e]/50 text-sm text-[#e8e2d9] placeholder:text-[#333] outline-none py-2 transition-colors font-light"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PayPal info */}
                        {paymentMethod === 'paypal' && (
                            <div className="border border-[#151515] p-4 text-xs text-[#666] space-y-1">
                                <div className="flex items-center gap-2 text-[#888]">
                                    <Info className="w-3.5 h-3.5" />
                                    <span className="text-[9px] tracking-[0.25em] uppercase">USD payment</span>
                                </div>
                                <p className="pl-5 font-light">You'll be charged approximately <span className="text-[#c9a96e]">{formatUSD(totalUSD)}</span></p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 border border-[#c9a96e]/20 bg-[#c9a96e]/5 p-3 text-xs text-[#c9a96e]">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing || (!mpesaConfig?.enabled && paymentMethod === 'mpesa')}
                            className="w-full py-4 bg-[#c9a96e] text-black text-[10px] tracking-[0.4em] uppercase font-medium hover:bg-[#e0c084] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
                        >
                            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isProcessing
                                ? (paymentMethod === 'mpesa' ? 'Submitting…' : 'Redirecting…')
                                : paymentMethod === 'mpesa'
                                    ? 'Confirm payment'
                                    : `Pay with PayPal · ${formatUSD(totalUSD)}`
                            }
                        </button>

                        <div className="flex items-center justify-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-[#333]">
                            <Shield className="w-3 h-3" />
                            <span>{paymentMethod === 'mpesa' ? 'Transaction code verifies payment' : 'Secured by PayPal'}</span>
                        </div>

                        <p className="text-[10px] text-center text-[#333] leading-relaxed">
                            By purchasing you agree to our{' '}
                            <Link href="/terms" className="text-[#555] hover:text-[#c9a96e] transition-colors underline underline-offset-2">Terms</Link>
                            {' '}and{' '}
                            <Link href="/privacy" className="text-[#555] hover:text-[#c9a96e] transition-colors underline underline-offset-2">Privacy Policy</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}