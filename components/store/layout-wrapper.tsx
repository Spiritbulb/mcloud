'use client'

import StoreNav from './store-nav'
import StoreFooter from './store-footer'
import { usePathname } from 'next/navigation'
import { SidebarProvider } from '@/components/ui/sidebar'

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

    // Settings: wrap in SidebarProvider so useSidebar() works anywhere in the tree.
    // No storefront chrome (nav/footer/theme vars).
    if (isSettings) {
        return (
            <SidebarProvider
                defaultOpen={false}
                style={{
                    '--sidebar-background': 'var(--background)',
                    '--sidebar-foreground': 'var(--foreground)',
                    '--sidebar-border': 'var(--border)',
                    '--sidebar-width': '16rem',
                } as React.CSSProperties}
            >
                {children}
            </SidebarProvider>
        )
    }

    return (
        <div className="storefront-root" style={cssVars}>
            <StoreNav store={store} themeId={store.settings?.themeId ?? 'classic'} />
            {children}
            <StoreFooter store={store} settings={store.settings} themeId={store.settings?.themeId ?? 'classic'} />
        </div>
    )
}