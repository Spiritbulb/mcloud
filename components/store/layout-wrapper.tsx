'use client'

import StoreNav from './store-nav'
import StoreFooter from './store-footer'
import { usePathname } from 'next/navigation'

const isSettingsPath = (pathname: string) => pathname.includes('/settings')

export default function LayoutWrapper({
    children,
    store,
    settings,
    cssVars,
}: {
    children: React.ReactNode
    store: any
    settings: any
    cssVars: React.CSSProperties
}) {
    const pathname = usePathname()
    const isSettings = isSettingsPath(pathname)

    // Settings: no storefront-root wrapper, no theme vars, no nav/footer
    if (isSettings) {
        return <>{children}</>
    }

    return (
        <div className="storefront-root" style={cssVars}>
            <StoreNav store={store} />
            {children}
            <StoreFooter store={store} settings={settings} />
        </div>
    )
}