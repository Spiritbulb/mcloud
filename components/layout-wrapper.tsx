'use client'

import { Header } from "./header"

import { usePathname } from "next/navigation"

// Routes where header/footer should be hidden
const HIDE_LAYOUT_ROUTES = ['/auth', '/onboarding']

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Check if current path matches any routes where layout should be hidden
    const shouldHideLayout = HIDE_LAYOUT_ROUTES.some(route =>
        pathname.startsWith(route)
    ) || isDynamicOrgRoute(pathname)

    const showHeader = !shouldHideLayout
    const showFooter = !shouldHideLayout

    return (
        <>
            {showHeader && <Header />}
            {children}
        </>
    )
}

// Check if path is an org route (/{slug}/...)
function isDynamicOrgRoute(pathname: string): boolean {
    const segments = pathname.split('/').filter(Boolean)

    // If first segment exists and is not a known static route
    if (segments.length > 0) {
        const firstSegment = segments[0]
        const staticRoutes = ['auth', 'onboarding', 'api', '_next']

        // If it's not a static route, assume it's an org slug
        return !staticRoutes.includes(firstSegment)
    }

    return false
}
