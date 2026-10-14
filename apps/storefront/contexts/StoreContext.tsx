'use client'

import { createContext, useContext, useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { isCustomDomainHost, storeBasePath } from '@/lib/host'

interface StoreContextValue {
    /** The store's internal slug (e.g. "locd26"). */
    slug: string
    /**
     * URL prefix for in-store links. Empty string on a custom domain
     * (white-labelled, so links are bare: "/cart"), or "/store/{slug}" on the
     * platform host. Never ends with a trailing slash.
     */
    basePath: string
    /** True when the storefront is served from the merchant's own domain. */
    isCustomDomain: boolean
}

const StoreContext = createContext<StoreContextValue | null>(null)

const subscribeToNothing = () => () => {}
const readHost = () => window.location.host
// Server render (and the cached HTML) assumes the platform host; a custom domain
// corrects itself on hydration. The host is not read on the server on purpose:
// reading headers() there would make every store page dynamic instead of cacheable.
const platformHost = () => ''

export function StoreProvider({ children, slug }: { children: ReactNode; slug: string }) {
    const host = useSyncExternalStore(subscribeToNothing, readHost, platformHost)
    const value = useMemo(() => {
        // '' (server snapshot) is not a platform host name, so test it explicitly.
        const isCustomDomain = host !== '' && isCustomDomainHost(host)
        return { slug, basePath: host === '' ? `/store/${slug}` : storeBasePath(host, slug), isCustomDomain }
    }, [host, slug])
    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function useStore(): StoreContextValue {
    const ctx = useContext(StoreContext)
    if (!ctx) throw new Error('useStore must be used within a StoreProvider')
    return ctx
}

export function useStoreContext(): StoreContextValue {
    return useStore()
}

/**
 * Build an in-store href that is correct for the current host. Pass a path
 * relative to the store root, with a leading slash:
 *
 *   const href = useStoreHref()
 *   href('/cart')              // "/cart" on a custom domain, "/store/locd26/cart" otherwise
 *   href('/account/login')
 *   href('/')                  // store home
 *   href(`/${product.slug}`)
 */
export function useStoreHref(): (path: string) => string {
    const { basePath } = useStore()
    return useCallback(
        (path: string) => {
            const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
            return `${basePath}${clean}` || '/'
        },
        [basePath],
    )
}
