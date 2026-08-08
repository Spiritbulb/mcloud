'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Loader2, Shield, Info, AlertCircle, Phone, Mail, MessageCircle,
    CheckCircle2, XCircle, ChevronLeft,
} from 'lucide-react'
import { convertKEStoUSD, formatKES, formatUSD } from '../../../../apps/storefront/lib/currency'
import { Button } from '@mcloud/ui/button'
import { Input } from '@mcloud/ui/input'
import { Label } from '@mcloud/ui/label'
import { CopyButton } from '../../../../apps/storefront/components/animate-ui/components/buttons/copy'
import type { CheckoutPageProps, GuestDetails } from '../types'

const EMPTY_GUEST: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }

type DarajaState =
    | { phase: 'idle' }
    | { phase: 'waiting'; orderId: string; checkoutRequestId: string }
    | { phase: 'success'; mpesaCode: string }
    | { phase: 'failed'; reason: string }

export default function ClassicCheckoutPage({
    storeSlug,
    cartItems,
    loading,
    mpesaConfig,
    onMpesaCheckout,
    onDarajaCheckout,
    onPaypalCheckout,
    apiBaseUrl,
    onPesapalCheckout,
    onIntasendCheckout,
    isProcessing,
}: CheckoutPageProps) {
    const router = useRouter()
    const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'mpesa' | 'pesapal' | 'intasend'>('mpesa')
    const [guest, setGuest] = useState<GuestDetails>(EMPTY_GUEST)
    const [error, setError] = useState('')
    const [darajaState, setDarajaState] = useState<DarajaState>({ phase: 'idle' })
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const stopPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }, [])

    const startPolling = useCallback((orderId: string) => {
        let attempts = 0
        const MAX = 40
        pollRef.current = setInterval(async () => {
            attempts++
            try {
                const res = await fetch(
                    `${apiBaseUrl}/payments/mpesa/status?orderId=${orderId}`,
                    { credentials: 'include' }
                )
                const data = await res.json()
                if (data.paymentStatus === 'completed') {
                    stopPolling()
                    setDarajaState({ phase: 'success', mpesaCode: data.mpesaCode ?? '' })
                    setTimeout(() => router.push(`/orders/${orderId}`), 1800)
                } else if (data.paymentStatus === 'failed') {
                    stopPolling()
                    setDarajaState({ phase: 'failed', reason: 'Payment was cancelled or failed. Please try again.' })
                } else if (attempts >= MAX) {
                    stopPolling()
                    setDarajaState({ phase: 'failed', reason: 'Payment confirmation timed out. If you completed the payment, check your orders page.' })
                }
            } catch {
                // network blip — keep polling
            }
        }, 3000)
    }, [stopPolling, router, apiBaseUrl])

    const setField = (field: keyof GuestDetails) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setGuest((prev) => ({ ...prev, [field]: e.target.value }))

    const totalKES = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalUSD = convertKEStoUSD(totalKES)

    const isDaraja = paymentMethod === 'mpesa' && mpesaConfig?.darajaEnabled

    const validate = (): string | null => {
        if (paymentMethod === 'mpesa') {
            if (!guest.mpesaPhone.trim()) return 'M-PESA phone number is required'
            if (!/^(?:\+?254|0)[17]\d{8}$/.test(guest.mpesaPhone.trim()))
                return 'Enter a valid Kenyan phone number (e.g. 0712345678)'
            if (!isDaraja) {
                if (!guest.mpesaCode.trim()) return 'M-PESA transaction code is required'
                if (!/^[A-Z0-9]{6,20}$/.test(guest.mpesaCode.trim().toUpperCase()))
                    return 'Invalid M-PESA transaction code format'
            }
        }
        if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email))
            return 'Enter a valid email address'
        return null
    }

    const handleCheckout = async () => {
        if (isDaraja && darajaState.phase === 'waiting') return
        const err = validate()
        if (err) { setError(err); return }
        setError('')
        try {
            if (paymentMethod === 'mpesa' && isDaraja) {
                const result = await onDarajaCheckout(guest.mpesaPhone.trim(), totalKES)
                setDarajaState({ phase: 'waiting', orderId: result.orderId, checkoutRequestId: result.checkoutRequestId })
                startPolling(result.orderId)
            } else if (paymentMethod === 'mpesa') {
                await onMpesaCheckout({ ...guest, mpesaCode: guest.mpesaCode.toUpperCase() })
            } else if (paymentMethod === 'paypal') {
                await onPaypalCheckout()
            } else if (paymentMethod === 'pesapal' && onPesapalCheckout) {
                await onPesapalCheckout()
            } else if (paymentMethod === 'intasend' && onIntasendCheckout) {
                await onIntasendCheckout()
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

    return (
        <div className="min-h-screen">
            {/* Single-column on mobile: back link, compact total, then the flow —
                no split layout competing for thumb-reach on a small screen. */}
            <div className="max-w-xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
                <Link
                    href={`/store/${storeSlug}/cart`}
                    className="inline-flex items-center gap-1 text-sm mb-4"
                    style={{ color: 'var(--sf-foreground-subtle)' }}
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to cart
                </Link>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="sf-heading text-2xl font-light">Checkout</h1>
                    <span className="sf-heading text-xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                        {formatKES(totalKES)}
                    </span>
                </div>

                <div className="space-y-4">
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
                                className={`flex-1 py-2.5 text-sm border transition-colors sf-pill ${paymentMethod === 'mpesa' ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                            >
                                M-PESA
                            </button>
                            {mpesaConfig?.paypalEnabled && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('paypal')}
                                    disabled={isProcessing}
                                    className={`flex-1 py-2.5 text-sm border transition-colors sf-pill ${paymentMethod === 'paypal' ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                                >
                                    PayPal
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {mpesaConfig?.pesapalEnabled && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('pesapal')}
                                    disabled={isProcessing}
                                    className={`flex-1 py-2.5 text-sm border transition-colors sf-pill ${paymentMethod === 'pesapal' ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                                >
                                    Pesapal
                                </button>
                            )}
                            {mpesaConfig?.intasendEnabled && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('intasend')}
                                    disabled={isProcessing}
                                    className={`flex-1 py-2.5 text-sm border transition-colors sf-pill ${paymentMethod === 'intasend' ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                                >
                                    Intasend
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
                            {darajaState.phase === 'waiting' && (
                                <div className="flex flex-col items-center gap-4 py-6 text-center">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, #4CAF50 12%, var(--sf-background))' }}>
                                            <Phone className="w-7 h-7" style={{ color: '#4CAF50' }} />
                                        </div>
                                        <Loader2 className="w-5 h-5 animate-spin absolute -bottom-1 -right-1" style={{ color: '#4CAF50' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--sf-foreground)' }}>
                                            Check your phone
                                        </p>
                                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                            An M-PESA prompt has been sent to<br />
                                            <span className="font-medium" style={{ color: 'var(--sf-foreground)' }}>{guest.mpesaPhone}</span>.
                                            <br />Enter your PIN to complete the payment.
                                        </p>
                                    </div>
                                    <button
                                        className="text-xs underline underline-offset-2"
                                        style={{ color: 'var(--sf-foreground-subtle)' }}
                                        onClick={() => { stopPolling(); setDarajaState({ phase: 'idle' }) }}
                                    >
                                        Cancel and try again
                                    </button>
                                </div>
                            )}

                            {darajaState.phase === 'success' && (
                                <div className="flex flex-col items-center gap-3 py-6 text-center">
                                    <CheckCircle2 className="w-12 h-12" style={{ color: '#4CAF50' }} />
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--sf-foreground)' }}>Payment confirmed!</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--sf-foreground-subtle)' }}>Redirecting to your order…</p>
                                    </div>
                                </div>
                            )}

                            {darajaState.phase === 'failed' && (
                                <div className="flex flex-col items-center gap-3 py-4 text-center">
                                    <XCircle className="w-10 h-10" style={{ color: 'var(--sf-accent)' }} />
                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--sf-foreground-subtle)' }}>{darajaState.reason}</p>
                                    <button
                                        className="text-xs underline underline-offset-2"
                                        style={{ color: 'var(--sf-foreground)' }}
                                        onClick={() => setDarajaState({ phase: 'idle' })}
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}

                            {isDaraja && darajaState.phase === 'idle' && (
                                <>
                                    <div className="sf-mpesa-instructions p-4 text-xs space-y-2 leading-relaxed">
                                        <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                            How it works
                                        </p>
                                        <p style={{ color: 'var(--sf-foreground-subtle)' }}>
                                            Enter your M-PESA number below. You'll receive a payment prompt on your phone — just enter your PIN to pay <span className="font-medium" style={{ color: 'var(--sf-foreground)' }}>{formatKES(totalKES)}</span>.
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="mpesa-phone" className="text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                            <Phone className="w-3 h-3" />
                                            M-PESA Phone <span className="sf-required">*</span>
                                        </Label>
                                        <Input id="mpesa-phone" value={guest.mpesaPhone} onChange={setField('mpesaPhone')} placeholder="0712 345 678" inputMode="tel" disabled={isProcessing} />
                                    </div>
                                </>
                            )}

                            {!isDaraja && darajaState.phase === 'idle' && (
                                <>
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
                                                    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-xs font-medium rounded-full" style={{ backgroundColor: 'var(--sf-foreground)', color: 'var(--sf-background)', opacity: 0.7, fontSize: '10px' }}>
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
                                </>
                            )}

                            {darajaState.phase === 'idle' && (
                                <>
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
                                </>
                            )}
                        </div>
                    )}

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

                    {darajaState.phase === 'idle' && (
                        <Button size="lg" className="w-full sf-btn-primary" disabled={isProcessing} onClick={handleCheckout}>
                            {isProcessing ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                            ) : isDaraja ? (
                                <><Phone className="mr-2 h-4 w-4" />Send M-PESA Prompt · {formatKES(totalKES)}</>
                            ) : paymentMethod === 'mpesa' ? (
                                <><Shield className="mr-2 h-4 w-4" />Confirm M-PESA Payment</>
                            ) : paymentMethod === 'paypal' ? (
                                <><Shield className="mr-2 h-4 w-4" />Pay with PayPal · {formatUSD(totalUSD)}</>
                            ) : paymentMethod === 'pesapal' ? (
                                <><Shield className="mr-2 h-4 w-4" />Pay Securely via Pesapal</>
                            ) : (
                                <><Shield className="mr-2 h-4 w-4" />Pay Securely via Intasend</>
                            )}
                        </Button>
                    )}

                    <div className="sf-security-badge flex items-center justify-center gap-1.5 text-xs py-2">
                        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{paymentMethod === 'mpesa' ? 'Your transaction code verifies this payment' : 'Secured connection'}</span>
                    </div>

                    <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        By completing your purchase you agree to our{' '}
                        <Link href="https://spiritb.uk/terms" className="underline underline-offset-2" style={{ color: 'var(--sf-foreground)' }}>Terms</Link>
                        {' '}and{' '}
                        <Link href="https://spiritb.uk/privacy" className="underline underline-offset-2" style={{ color: 'var(--sf-foreground)' }}>Privacy Policy</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}