'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Minus, X, ShoppingBag, Info, AlertCircle, Phone, Mail, MessageCircle } from 'lucide-react'
import { convertKEStoUSD, formatKES, formatUSD } from '@/lib/currency'
import { CopyButton } from '@/components/animate-ui/components/buttons/copy'
import type { CartPageProps, GuestDetails } from '../types'

const EMPTY_GUEST: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }

export default function MinimalCartPage({
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
        } catch (e: any) { setError(e.message || 'Checkout failed') }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f4f0] flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#c8c0b6] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
            </div>
        )
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-[#f7f4f0] flex items-center justify-center px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <div className="text-center space-y-6 max-w-xs">
                    <ShoppingBag className="w-8 h-8 text-[#c8c0b6] mx-auto" />
                    <div>
                        <h2 className="text-2xl font-normal mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>Your bag is empty</h2>
                        <p className="text-sm text-[#9a9189]">Add something you love</p>
                    </div>
                    <button
                        onClick={() => router.push(`/store/${storeSlug}/products`)}
                        className="text-xs uppercase tracking-wider text-[#1a1714] underline underline-offset-4 hover:text-[#5c5650] transition-colors"
                    >
                        Browse products
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f7f4f0] text-[#1a1714]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="max-w-5xl mx-auto px-6 md:px-12 pt-20 pb-20">

                <h1 className="text-3xl md:text-5xl font-normal mb-2 leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Your bag
                </h1>
                <div className="h-px bg-[#e5e0d9] mb-10" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* ── Items ── */}
                    <div className="lg:col-span-7 space-y-0 divide-y divide-[#e5e0d9]">
                        {cartItems.map(item => (
                            <div key={item.variantId} className="py-5 flex gap-4">
                                <div className="relative flex-shrink-0 w-16 h-20 bg-[#ede9e3] overflow-hidden">
                                    <img src={item.image || '/api/placeholder/64/80'} alt={item.name} className="object-cover w-full h-full" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-sm leading-snug font-normal">{item.name}</h3>
                                        <button
                                            onClick={() => onRemoveItem(item.variantId)}
                                            disabled={itemLoadingStates[item.variantId]}
                                            className="text-[#c8c0b6] hover:text-[#5c5650] transition-colors disabled:opacity-40 flex-shrink-0"
                                        >
                                            {itemLoadingStates[item.variantId] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center border border-[#e5e0d9]">
                                            <button
                                                onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                                                disabled={itemLoadingStates[item.variantId] || item.quantity <= 1}
                                                className="w-7 h-7 flex items-center justify-center text-[#9a9189] hover:text-[#1a1714] disabled:opacity-30 transition-colors"
                                            >
                                                <Minus className="w-2.5 h-2.5" />
                                            </button>
                                            <span className="w-7 text-center text-xs">{item.quantity}</span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                                                disabled={itemLoadingStates[item.variantId]}
                                                className="w-7 h-7 flex items-center justify-center text-[#9a9189] hover:text-[#1a1714] disabled:opacity-30 transition-colors"
                                            >
                                                {itemLoadingStates[item.variantId] ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                                            </button>
                                        </div>
                                        <span className="text-sm text-[#1a1714]">{formatKES(item.price * item.quantity)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="pt-4">
                            <Link href={`/store/${storeSlug}/products`} className="text-xs uppercase tracking-wider text-[#9a9189] hover:text-[#5c5650] transition-colors">
                                ← Continue shopping
                            </Link>
                        </div>
                    </div>

                    {/* ── Summary ── */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Totals */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-[#9a9189]">Subtotal</span>
                                <span>{formatKES(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[#9a9189]">Shipping</span>
                                <span>Free</span>
                            </div>
                            <div className="h-px bg-[#e5e0d9]" />
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm">Total</span>
                                <span className="text-xl font-normal" style={{ fontFamily: "'DM Serif Display', serif" }}>{formatKES(subtotal)}</span>
                            </div>
                        </div>

                        {/* Payment method */}
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wider text-[#9a9189]">Payment</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPaymentMethod('mpesa')}
                                    disabled={isProcessing || !mpesaConfig?.enabled}
                                    className={`flex-1 py-2 text-xs border transition-colors ${paymentMethod === 'mpesa' ? 'border-[#1a1714] bg-[#1a1714] text-[#f7f4f0]' : 'border-[#e5e0d9] text-[#5c5650] hover:border-[#9a9189]'}`}
                                >
                                    M-Pesa
                                </button>
                                {mpesaConfig?.paypalEnabled && (
                                    <button
                                        onClick={() => setPaymentMethod('paypal')}
                                        disabled={isProcessing}
                                        className={`flex-1 py-2 text-xs border transition-colors ${paymentMethod === 'paypal' ? 'border-[#1a1714] bg-[#1a1714] text-[#f7f4f0]' : 'border-[#e5e0d9] text-[#5c5650] hover:border-[#9a9189]'}`}
                                    >
                                        PayPal
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* M-PESA form */}
                        {paymentMethod === 'mpesa' && (
                            <div className="space-y-4 p-4 bg-[#ede9e3]">
                                <p className="text-xs uppercase tracking-wider text-[#9a9189]">How to pay</p>
                                <ol className="space-y-1.5 text-xs text-[#5c5650]">
                                    {[
                                        <>M-PESA → Lipa na M-PESA → {mpesaConfig?.type === 'paybill' ? 'Pay Bill' : 'Buy Goods'}</>,
                                        <>{mpesaConfig?.type === 'paybill' ? 'Business' : 'Till'} No: <span className="font-mono text-[#1a1714]">{mpesaConfig?.number || '—'}</span></>,
                                        ...(mpesaConfig?.type === 'paybill' && mpesaConfig.account ? [<>Account: <span className="font-mono text-[#1a1714]">{mpesaConfig.account}</span></>] : []),
                                        <>Amount: <span className="text-[#1a1714]">{formatKES(subtotal)}</span></>,
                                        <>Paste your confirmation code below</>,
                                    ].map((s, i) => <li key={i} className="flex gap-2"><span className="text-[#c8c0b6] flex-shrink-0">{i + 1}.</span>{s}</li>)}
                                </ol>
                                <div className="h-px bg-[#e5e0d9]" />
                                <div className="space-y-3">
                                    {[
                                        { id: 'phone', label: 'Phone *', field: 'mpesaPhone' as keyof GuestDetails, placeholder: '0712 345 678', type: 'tel' },
                                        { id: 'code', label: 'Transaction code *', field: 'mpesaCode' as keyof GuestDetails, placeholder: 'QW12ABCDEF', type: 'text' },
                                        { id: 'wa', label: 'WhatsApp (optional)', field: 'whatsapp' as keyof GuestDetails, placeholder: '0712 345 678', type: 'tel' },
                                        { id: 'email', label: 'Email (optional)', field: 'email' as keyof GuestDetails, placeholder: 'you@example.com', type: 'email' },
                                    ].map(({ id, label, field, placeholder, type }) => (
                                        <div key={id} className="space-y-1">
                                            <label htmlFor={id} className="text-[10px] uppercase tracking-wider text-[#9a9189]">{label}</label>
                                            <input
                                                id={id}
                                                value={guest[field]}
                                                onChange={field === 'mpesaCode' ? (e) => setGuest(p => ({ ...p, mpesaCode: e.target.value.toUpperCase() })) : setField(field)}
                                                placeholder={placeholder}
                                                type={type}
                                                disabled={isProcessing}
                                                className="w-full bg-[#f7f4f0] border border-[#e5e0d9] focus:border-[#9a9189] text-sm text-[#1a1714] placeholder:text-[#c8c0b6] outline-none px-3 py-2 transition-colors"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PayPal info */}
                        {paymentMethod === 'paypal' && (
                            <div className="p-4 bg-[#ede9e3] text-xs text-[#5c5650] space-y-1">
                                <div className="flex items-center gap-2 text-[#9a9189] mb-1">
                                    <Info className="w-3.5 h-3.5" />
                                    <span className="uppercase tracking-wider text-[10px]">USD payment</span>
                                </div>
                                <p>You'll be charged approximately <span className="text-[#1a1714]">{formatUSD(totalUSD)}</span></p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-[#ede9e3] border border-[#c8c0b6] text-xs text-[#5c5650]">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#9a9189]" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing || (!mpesaConfig?.enabled && paymentMethod === 'mpesa')}
                            className="w-full py-3.5 bg-[#1a1714] text-[#f7f4f0] text-xs tracking-[0.2em] uppercase hover:bg-[#2e2925] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isProcessing
                                ? 'Processing…'
                                : paymentMethod === 'mpesa' ? 'Confirm payment' : `Pay with PayPal · ${formatUSD(totalUSD)}`}
                        </button>

                        <p className="text-[10px] text-[#c8c0b6] text-center leading-relaxed">
                            By purchasing you agree to our{' '}
                            <Link href="/terms" className="underline underline-offset-2 hover:text-[#9a9189]">Terms</Link>
                            {' '}and{' '}
                            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#9a9189]">Privacy Policy</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}