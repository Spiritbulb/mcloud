'use client'

import { getVertical } from '@mcloud/verticals'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import StoreNav from './store-nav'
import StoreFooter from './store-footer'
import CartIsland from './CartIsland'
import WishlistIsland from './WishlistIsland'

function LiquidScriptRunner() {
    const pathname = usePathname()

    useEffect(() => {
        const container = document.querySelector('[data-liquid]')
        if (!container) return
        container.querySelectorAll('script').forEach((oldScript) => {
            const newScript = document.createElement('script')
            newScript.textContent = oldScript.textContent
            oldScript.parentNode?.replaceChild(newScript, oldScript)
        })
    }, [pathname])

    return null
}

export default function LayoutWrapper({
    children,
    store,
    cssVars,
    settings,
    pages = [],
}: {
    children: React.ReactNode
    store: any
    cssVars: React.CSSProperties
    settings: any
    pages?: { slug: string; title: string }[]
}) {
    const pathname = usePathname()

    if (pathname.includes('/settings')) {
        return <>{children}</>
    }

    // The cart/wishlist islands hydrate commerce controls inside the Liquid
    // markup. A non-commerce vertical (NGO) never emits those controls, so
    // mounting the islands there is dead weight.
    const commerce = getVertical(store?.type).commerce

    return (
        <div
            className="storefront-root"
            data-sf-css
            style={cssVars}
        >
            <StoreNav store={store} pages={pages} />
            {children}
            <StoreFooter store={store} settings={settings} />
            {commerce && (
                <>
                    <CartIsland />
                    <WishlistIsland />
                </>
            )}
            <LiquidScriptRunner />
        </div>
    )
}