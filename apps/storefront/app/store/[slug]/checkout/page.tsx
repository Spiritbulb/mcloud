'use client'

import '@/app/store/[slug]/storefront.css'
import { useEffect, useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useRouter } from 'next/navigation'
import ClassicCheckoutPage from '@mcloud/themes/classic/CheckoutPage'
import type { MpesaConfig, GuestDetails } from '@mcloud/themes/types'
import { useStoreTheme } from '@/hooks/useStoreTheme'
import { trackCheckout, trackOrderPlaced } from '../lib/analytics'
import { submitMpesaCode, triggerDarajaStkPush, triggerPaypalOrder } from '@/lib/payment-trigger'

const THEME_COMPONENTS: Record<string, React.ComponentType<any>> = {
    classic: ClassicCheckoutPage,
}

export default function CheckoutPageContainer() {
    const { cartItems, loading, clearCart, storeSlug } = useCart()
    const router = useRouter()
    const { themeId } = useStoreTheme(storeSlug)

    const [mpesaConfig, setMpesaConfig] = useState<MpesaConfig | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const safeCartItems = Array.isArray(cartItems) ? cartItems : []

    // Empty cart shouldn't sit on checkout — bounce back before doing anything else.
    useEffect(() => {
        if (!loading && safeCartItems.length === 0) {
            router.replace(`/store/${storeSlug}`)
        }
    }, [loading, safeCartItems.length, storeSlug])

    useEffect(() => {
        if (!storeSlug) return
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/${storeSlug}/integrations`, {
            credentials: 'include',
        })
            .then(res => res.json())
            .then(data => {
                const m = data.mpesa
                const p = data.paypal
                const psa = data.pesapal
                const isend = data.intasend
                setMpesaConfig({
                    type: m?.mpesa_type ?? 'till',
                    number: m?.mpesa_till ?? m?.mpesa_paybill ?? '',
                    account: m?.mpesa_account,
                    enabled: m?.enabled ?? false,
                    darajaEnabled: m?.darajaEnabled ?? false,
                    paypalEnabled: p?.enabled ?? false,
                    pesapalEnabled: psa?.enabled ?? false,
                    intasendEnabled: isend?.enabled ?? false,
                })
            })
            .catch(err => console.error('Failed to load integrations', err))
    }, [storeSlug])

    // Checkout funnel event fires here now — this page IS "started checkout",
    // separate from cart's trackViewCart.
    useEffect(() => {
        if (storeSlug) {
            trackCheckout(storeSlug)
        }
    }, [storeSlug])

    const subtotalKES = safeCartItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalKES = subtotalKES

    const createOrder = async (
        guest: GuestDetails,
        paymentMethod: 'mpesa' | 'paypal',
        idempotencyKey: string,
    ): Promise<string> => {
        if (safeCartItems.length === 0) throw new Error('Your cart is empty')

        const res = await fetch(`/api/store/${storeSlug}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lines: safeCartItems.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId !== item.productId ? item.variantId : null,
                    quantity: item.quantity,
                })),
                guest: {
                    mpesaPhone: guest.mpesaPhone.trim(),
                    email: guest.email.trim(),
                    whatsapp: guest.whatsapp.trim(),
                },
                paymentMethod,
                idempotencyKey,
            }),
        })
        const data = (await res.json().catch(() => ({}))) as { orderNumber?: string; error?: string }
        if (!res.ok || !data.orderNumber) {
            throw new Error(data.error ?? 'Failed to create order')
        }

        if (storeSlug) {
            trackOrderPlaced(storeSlug, safeCartItems[0]?.productId, data.orderNumber)
        }
        return data.orderNumber
    }

    const handleMpesaCheckout = async (guest: GuestDetails) => {
        setIsProcessing(true)
        try {
            const orderNumber = await createOrder(guest, 'mpesa', crypto.randomUUID())
            await submitMpesaCode(storeSlug ?? '', orderNumber, guest.mpesaCode)
            await clearCart()
            router.push(`/store/${storeSlug}/?order=${encodeURIComponent(orderNumber)}`)
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePaypalCheckout = async () => {
        setIsProcessing(true)
        try {
            const validItems = safeCartItems
                .filter((i) => i.name?.trim() && i.price > 0 && i.quantity > 0)
                .map((i) => ({
                    name: i.name.trim().slice(0, 100),
                    sku: i.variantId?.slice(-8) || 'N/A',
                    price: Math.max(0.01, Math.round(i.price * 100) / 100),
                    quantity: Math.max(1, Math.min(999, Math.floor(i.quantity))),
                }))

            if (!validItems.length) throw new Error('No valid items in cart')

            const guest: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }
            const orderNumber = await createOrder(guest, 'paypal', crypto.randomUUID())

            const approvalUrl = await triggerPaypalOrder(orderNumber, validItems, totalKES)
            window.location.href = approvalUrl
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePesapalCheckout = async () => {
        setIsProcessing(true)
        try {
            const guest: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }
            const orderNumber = await createOrder(guest, 'mpesa', crypto.randomUUID())
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/pesapal/create-order?store=${storeSlug}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderNumber, amount: totalKES })
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Pesapal setup failed')
            window.location.href = data.redirectUrl
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDarajaCheckout = async (phone: string, amount: number) => {
        setIsProcessing(true)
        try {
            const guest: GuestDetails = { mpesaPhone: phone, mpesaCode: '', whatsapp: '', email: '' }
            const orderNumber = await createOrder(guest, 'mpesa', crypto.randomUUID())
            return await triggerDarajaStkPush(storeSlug ?? '', orderNumber, phone, amount)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleIntasendCheckout = async () => {
        setIsProcessing(true)
        try {
            const guest: GuestDetails = { mpesaPhone: '', mpesaCode: '', whatsapp: '', email: '' }
            const orderNumber = await createOrder(guest, 'mpesa', crypto.randomUUID())
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/intasend/create-order?store=${storeSlug}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderNumber, amount: totalKES })
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Intasend setup failed')
            window.location.href = data.redirectUrl
        } finally {
            setIsProcessing(false)
        }
    }

    const PageComponent = THEME_COMPONENTS[themeId] ?? ClassicCheckoutPage

    return (
        <PageComponent
            storeSlug={storeSlug ?? ''}
            cartItems={safeCartItems}
            loading={loading}
            mpesaConfig={mpesaConfig}
            apiBaseUrl={process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api'}
            onMpesaCheckout={handleMpesaCheckout}
            onDarajaCheckout={handleDarajaCheckout}
            onPaypalCheckout={handlePaypalCheckout}
            onPesapalCheckout={handlePesapalCheckout}
            onIntasendCheckout={handleIntasendCheckout}
            isProcessing={isProcessing}
        />
    )
}