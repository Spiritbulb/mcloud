'use client'


import { getVertical } from '@mcloud/verticals'
import { useEffect, useState } from 'react'
import { notFound, usePathname } from 'next/navigation'
import StoreNav from './store-nav'
import StoreFooter from './store-footer'
import CartIsland from './CartIsland'
import WishlistIsland from './WishlistIsland'
import { resolveThemeId, type StoreThemeId } from '@/lib/store-themes'
import { layoutThemeFrom } from '@/lib/layout-message'
import { colorModeFrom } from '@/lib/brand'

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
    // The Editor's preview can show an unsaved theme; a real visitor never gets a message.
    const [previewTheme, setPreviewTheme] = useState<StoreThemeId | null>(null)
    useEffect(() => {
        if (window.parent === window) return
        const own = window.location.origin
        const onMessage = (e: MessageEvent) => {
            const id = layoutThemeFrom(e, own, true)
            if (id) setPreviewTheme(id)
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [])

    if (pathname.includes('/settings')) {
        return <>{children}</>
    }

    // The cart/wishlist islands hydrate commerce controls inside the Liquid
    // markup. A non-commerce vertical (NGO) never emits those controls, so
    // mounting the islands there is dead weight.
    
    const commerce = getVertical(store?.type).commerce
    const theme = previewTheme ?? resolveThemeId(settings)

    return (
        <div
            className="storefront-root"
            data-sf-css
            data-sf-theme={theme}
            data-sf-mode={colorModeFrom(settings)}
            style={cssVars}
        >
            <StoreNav store={store} pages={pages} theme={theme} />
            {children}
            <StoreFooter store={store} settings={settings} themeId={theme} />
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