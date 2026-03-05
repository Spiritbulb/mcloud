'use client'

import '@/app/store/[slug]/storefront.css'
import { useEffect, useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import ClassicCartPage from '../../../../src/themes/classic/CartPage'
import type { MpesaConfig, GuestDetails } from '../../../../src/themes/types'
import NoirCartPage from '../../../../src/themes/noir/CartPage'
import MinimalCartPage from '../../../../src/themes/minimal/CartPage'

const THEME_COMPONENTS: Record<string, React.ComponentType<any>> = {
    classic: ClassicCartPage,
    noir: NoirCartPage,
    minimal: MinimalCartPage,
}

export default function CartPageContainer() {
    const {
        cartItems, loading, updateCartLine, removeFromCart,
        refreshCart, itemLoadingStates, clearCart, storeSlug,
    } = useCart()

    const router = useRouter()
    const supabase = createClient()

    const [mpesaConfig, setMpesaConfig] = useState<MpesaConfig | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [themeId, setThemeId] = useState('classic')

    const safeCartItems = Array.isArray(cartItems) ? cartItems : []

    useEffect(() => {
        if (!storeSlug) return
        supabase
            .from('stores')
            .select('id, settings, theme:store_themes(theme_id)')
            .eq('slug', storeSlug)
            .single()
            .then(({ data: store }) => {
                if (!store) return
                const resolvedTheme = (store as any).theme?.theme_id ?? (store.settings as any)?.themeId ?? 'classic'
                setThemeId(resolvedTheme)

                supabase
                    .from('store_integrations')
                    .select('provider, is_active, config')
                    .eq('store_id', store.id)
                    .in('provider', ['mpesa', 'paypal'])
                    .then(({ data }) => {
                        const m = data?.find((i) => i.provider === 'mpesa')
                        const p = data?.find((i) => i.provider === 'paypal')
                        setMpesaConfig({
                            type: m?.config?.mpesa_type ?? 'till',
                            number: m?.config?.mpesa_till ?? m?.config?.mpesa_paybill ?? '',
                            account: m?.config?.mpesa_account,
                            enabled: m?.is_active ?? false,
                            paypalEnabled: p?.is_active ?? false,
                        })
                    })
            })
    }, [storeSlug])

    useEffect(() => {
        if (!loading && cartItems.length > 0) refreshCart()
    }, [])

    const subtotalKES = safeCartItems.reduce((s, i) => s + i.price * i.quantity, 0)
    const totalKES = subtotalKES

    const createOrder = async (guest: GuestDetails, paymentMethod: 'mpesa' | 'paypal'): Promise<string> => {
        if (safeCartItems.length === 0) throw new Error('Your cart is empty')

        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', storeSlug)
            .eq('is_active', true)
            .single()

        if (storeError || !store) throw new Error('Store not found')

        const phoneKey = guest.mpesaPhone.trim() || null
        const emailKey = guest.email.trim() || null

        let customerId: string
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('store_id', store.id)
            .eq('mpesa_phone', phoneKey)
            .maybeSingle()

        if (existing) {
            customerId = existing.id
            await supabase.from('customers').update({
                ...(emailKey && { email: emailKey }),
                whatsapp_number: guest.whatsapp.trim() || phoneKey,
            }).eq('id', customerId)
        } else {
            const { data: newCustomer, error: ce } = await supabase
                .from('customers')
                .insert({
                    store_id: store.id,
                    mpesa_phone: phoneKey,
                    email: emailKey,
                    whatsapp_number: guest.whatsapp.trim() || phoneKey,
                    first_name: 'Guest',
                    last_name: '',
                })
                .select('id')
                .single()
            if (ce || !newCustomer) throw ce ?? new Error('Failed to create customer')
            customerId = newCustomer.id
        }

        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                store_id: store.id,
                customer_id: customerId,
                order_number: orderNumber,
                status: 'pending',
                financial_status: 'pending',
                fulfillment_status: 'unfulfilled',
                subtotal: subtotalKES,
                tax: 0,
                shipping: 0,
                discount: 0,
                total: totalKES,
                currency: 'KES',
                customer_email: emailKey,
                metadata: {
                    payment_method: paymentMethod === 'mpesa' ? 'MPESA' : 'PayPal',
                    payment_status: 'pending',
                    mpesa_phone: phoneKey,
                    whatsapp_number: guest.whatsapp.trim() || phoneKey,
                },
            })
            .select('id, order_number')
            .single()

        if (orderError || !order) throw orderError ?? new Error('Failed to create order')

        const { error: itemsError } = await supabase.from('order_items').insert(
            safeCartItems.map((item) => ({
                order_id: order.id,
                product_id: item.productId,
                variant_id: item.variantId !== item.productId ? item.variantId : null,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                title: item.name,
                sku: item.variantId,
                image_url: item.image,
            }))
        )
        if (itemsError) throw itemsError

        return orderNumber
    }

    const handleMpesaCheckout = async (guest: GuestDetails) => {
        setIsProcessing(true)
        try {
            const orderNumber = await createOrder(guest, 'mpesa')
            const code = guest.mpesaCode.trim().toUpperCase()

            await supabase
                .from('orders')
                .update({
                    metadata: {
                        payment_method: 'MPESA',
                        payment_status: 'submitted',
                        mpesa_transaction_code: code,
                        mpesa_phone: guest.mpesaPhone.trim(),
                        whatsapp_number: guest.whatsapp.trim() || guest.mpesaPhone.trim(),
                    },
                })
                .eq('order_number', orderNumber)

            await clearCart()
            router.push(`/orders/${orderNumber}`)
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
            const orderNumber = await createOrder(guest, 'paypal')

            const res = await fetch('/api/payments/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderNumber, items: validItems, totalKES: Number(totalKES.toFixed(2)) }),
            })

            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'PayPal setup failed')
            window.location.href = data.approvalUrl
        } finally {
            setIsProcessing(false)
        }
    }

    const PageComponent = THEME_COMPONENTS[themeId] ?? ClassicCartPage

    return (
        <PageComponent
            storeSlug={storeSlug ?? ''}
            cartItems={safeCartItems}
            loading={loading}
            itemLoadingStates={itemLoadingStates}
            mpesaConfig={mpesaConfig}
            onUpdateQuantity={updateCartLine}
            onRemoveItem={removeFromCart}
            onMpesaCheckout={handleMpesaCheckout}
            onPaypalCheckout={handlePaypalCheckout}
            isProcessing={isProcessing}
        />
    )
}