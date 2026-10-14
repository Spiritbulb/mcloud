'use client'

import '@/app/(storefront)/store/[slug]/storefront.css'
import { useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useStoreInfo } from '@/hooks/useStoreInfo'
import ClassicCartPage from '@mcloud/themes/classic/CartPage'
import type { CartOnlyPageProps } from '@mcloud/themes/types'
import { trackCheckout } from '../lib/analytics'

// The cart lists items and hands off to /checkout, which owns payment and delivery. It used to
// carry a full copy of the checkout's payment handlers and an integrations fetch that the cart
// theme never called; both were dead, and the fetch was a wasted request per cart view.
const THEME_COMPONENTS: Record<string, React.ComponentType<CartOnlyPageProps>> = {
    classic: ClassicCartPage,
}

export default function CartPageContainer() {
    const {
        cartItems, loading, updateCartLine, removeFromCart,
        refreshCart, itemLoadingStates, storeSlug,
    } = useCart()
    const { themeId, hasDeliveryZones } = useStoreInfo(storeSlug)

    const safeCartItems = Array.isArray(cartItems) ? cartItems : []

    useEffect(() => {
        if (!loading && cartItems.length > 0) refreshCart()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (storeSlug) trackCheckout(storeSlug)
    }, [storeSlug])

    const PageComponent = THEME_COMPONENTS[themeId] ?? ClassicCartPage

    return (
        <PageComponent
            storeSlug={storeSlug ?? ''}
            cartItems={safeCartItems}
            loading={loading}
            itemLoadingStates={itemLoadingStates}
            onUpdateQuantity={updateCartLine}
            onRemoveItem={removeFromCart}
            hasDeliveryZones={hasDeliveryZones}
        />
    )
}
