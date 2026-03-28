// contexts/WishlistContext.tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createCustomerClient } from '@/lib/customer-client'
import { useCustomerAuth } from './CustomerAuthContext'

interface WishlistContextType {
    wishlistIds: Set<string>
    loading: boolean
    toggle: (productId: string, storeId: string) => Promise<void>
    isWishlisted: (productId: string) => boolean
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export function WishlistProvider({ children, storeId }: { children: React.ReactNode; storeId: string }) {
    const { user } = useCustomerAuth()
    const supabase = createCustomerClient()
    const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [customerId, setCustomerId] = useState<string | null>(null)

    // Load wishlist when user is known
    useEffect(() => {
        if (!user) {
            setWishlistIds(new Set())
            setCustomerId(null)
            return
        }
        load()
    }, [user])

    const load = async () => {
        setLoading(true)
        const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('store_id', storeId)
            .eq('email', user!.email!)
            .single()

        if (!customer) return setLoading(false)
        setCustomerId(customer.id)

        const { data } = await supabase
            .from('wishlists')
            .select('product_id')
            .eq('customer_id', customer.id)

        setWishlistIds(new Set((data ?? []).map(r => r.product_id)))
        setLoading(false)
    }

    const toggle = useCallback(async (productId: string, storeId: string) => {
        if (!user || !customerId) return

        const isIn = wishlistIds.has(productId)

        // Optimistic update
        setWishlistIds(prev => {
            const next = new Set(prev)
            isIn ? next.delete(productId) : next.add(productId)
            return next
        })

        if (isIn) {
            await supabase.from('wishlists').delete()
                .eq('customer_id', customerId)
                .eq('product_id', productId)
        } else {
            await supabase.from('wishlists').insert({
                customer_id: customerId,
                product_id: productId,
                store_id: storeId,
            })
        }
    }, [user, customerId, wishlistIds])

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