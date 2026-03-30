'use client'

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
}: {
    children: React.ReactNode
    store: any
    cssVars: React.CSSProperties
}) {
    const pathname = usePathname()

    if (pathname.includes('/settings')) {
        return <>{children}</>
    }

    return (
        <div
            className="storefront-root"
            data-sf-css
            style={cssVars}
        >
            <StoreNav store={store} />
            {children}
            <StoreFooter store={store} settings={store?.settings} />
            <CartIsland />
            <WishlistIsland />
            <LiquidScriptRunner />
        </div>
    )
}