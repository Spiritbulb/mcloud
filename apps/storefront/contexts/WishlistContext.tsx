// contexts/WishlistContext.tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useCustomerAuth } from './CustomerAuthContext'

interface WishlistContextType {
    wishlistIds: Set<string>
    loading: boolean
    toggle: (productId: string) => Promise<void>
    isWishlisted: (productId: string) => boolean
}

const WishlistContext = createContext<WishlistContextType | null>(null)

// Server-mediated: all wishlist reads/writes go through /api/store/[slug]/wishlist,
// which authorizes the customer from their verified Supabase Auth session and uses
// the service-role client. The browser no longer holds an anon DB key or trusts a
// client-supplied customer id.
export function WishlistProvider({ children, storeSlug }: { children: React.ReactNode; storeSlug: string }) {
    const { user } = useCustomerAuth()
    const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!user) {
            setWishlistIds(new Set())
            return
        }
        let cancelled = false
        ;(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/store/${storeSlug}/wishlist`)
                const data = (await res.json().catch(() => ({}))) as { productIds?: string[] }
                if (!cancelled) setWishlistIds(new Set(data.productIds ?? []))
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [user, storeSlug])

    const toggle = useCallback(
        async (productId: string) => {
            if (!user) return
            const isIn = wishlistIds.has(productId)

            // Optimistic update.
            setWishlistIds((prev) => {
                const next = new Set(prev)
                if (isIn) next.delete(productId)
                else next.add(productId)
                return next
            })

            try {
                const res = await fetch(`/api/store/${storeSlug}/wishlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, action: isIn ? 'remove' : 'add' }),
                })
                if (!res.ok) throw new Error('request failed')
            } catch {
                // Roll back on failure so the heart reflects the true state.
                setWishlistIds((prev) => {
                    const next = new Set(prev)
                    if (isIn) next.add(productId)
                    else next.delete(productId)
                    return next
                })
            }
        },
        [user, storeSlug, wishlistIds],
    )

    const isWishlisted = useCallback((productId: string) => wishlistIds.has(productId), [wishlistIds])

    return (
        <WishlistContext.Provider value={{ wishlistIds, loading, toggle, isWishlisted }}>
            {children}
        </WishlistContext.Provider>
    )
}

export function useWishlist() {
    const ctx = useContext(WishlistContext)
    if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
    return ctx
}
