'use client'

import StoreNav from './store-nav'
import StoreFooter from './store-footer'
import { usePathname } from 'next/navigation'

const isSettingsPath = (pathname: string) => pathname.includes('/settings')

// Themes that include their own nav & footer inside StoreFront.
// The shared StoreNav / StoreFooter are only used by other themes.
const SELF_CONTAINED_THEMES = new Set(['photography', 'portfolio', 'services', 'restaurant'])

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

    // Settings has its own layout.tsx which handles SidebarProvider,
    // the shell, sidebar, header — everything. Just render children.
    if (isSettingsPath(pathname)) {
        return <>{children}</>
    }

    const themeId: string = store?.settings?.themeId ?? 'classic'
    const isSelfContained = SELF_CONTAINED_THEMES.has(themeId)

    return (
        <div
            className="storefront-root"
            style={cssVars}
            // Only CSS-variable themes get the data-sf-css marker so
            // storefront.css overrides don't leak into self-contained themes
            {...(!isSelfContained ? { 'data-sf-css': '' } : {})}
        >
            {!isSelfContained && (
                <StoreNav store={store} themeId={themeId} />
            )}
            {children}
            {!isSelfContained && (
                <StoreFooter store={store} settings={store?.settings} themeId={themeId} />
            )}
        </div>
    )
}