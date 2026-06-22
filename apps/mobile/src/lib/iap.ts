// Thin wrapper over expo-iap for the single "Pro" subscription SKU. Screens use
// `useProIap()` and never touch the IAP SDK directly.
//
// Flow: requestPurchase (native Play sheet) → onPurchaseSuccess fires with the
// purchase → we send its purchaseToken to our backend to verify with Google and
// grant Pro → ONLY on backend success do we finishTransaction (acknowledge).
// If the backend rejects it we do NOT acknowledge, so Play auto-refunds in 3 days.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIAP } from 'expo-iap'
import type { Purchase } from 'expo-iap'
import { useAuth } from '@/auth/AuthContext'
import { api as makeApi } from '@/lib/api'

const SKU = process.env.EXPO_PUBLIC_PLAY_PRO_SKU as string

type PendingPurchase = {
    slug: string
    resolve: (v: { pro: boolean }) => void
    reject: (e: Error) => void
}

export function useProIap() {
    const { authedFetch } = useAuth()
    const api = useMemo(() => makeApi(authedFetch), [authedFetch])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // The purchase result arrives via a listener callback, outside the
    // requestPurchase() promise — bridge it back to the awaited purchasePro().
    const pending = useRef<PendingPurchase | null>(null)
    // useIAP's finishTransaction, captured for the success handler (which is
    // defined before the hook returns it).
    const finishRef = useRef<((args: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>) | null>(null)
    const subscribeRef = useRef(api)
    subscribeRef.current = api

    const handleSuccess = useCallback(async (purchase: Purchase) => {
        const ctx = pending.current
        if (!ctx) return
        const purchaseToken = (purchase as { purchaseToken?: string }).purchaseToken
        const productId = (purchase as { productId?: string }).productId
        if (!purchaseToken || !productId) {
            pending.current = null
            ctx.reject(new Error('Purchase missing token'))
            return
        }
        try {
            const r = await subscribeRef.current.subscribePro(ctx.slug, { purchaseToken, productId })
            if (r.pro) {
                // Acknowledge ONLY after our backend confirms the grant.
                await finishRef.current?.({ purchase, isConsumable: false })
                ctx.resolve({ pro: true })
            } else {
                ctx.reject(new Error('Subscription not granted'))
            }
        } catch (e) {
            // Do not acknowledge — Play auto-refunds the unacknowledged purchase.
            ctx.reject(e instanceof Error ? e : new Error('Verification failed'))
        } finally {
            pending.current = null
        }
    }, [])

    const handleError = useCallback((err: { code?: string; message?: string }) => {
        const ctx = pending.current
        pending.current = null
        if (!ctx) return
        // User dismissing the Play sheet is a benign no-op, not an error.
        if (err?.code === 'E_USER_CANCELLED' || err?.code === 'user-cancelled') {
            ctx.resolve({ pro: false })
            return
        }
        ctx.reject(new Error(err?.message ?? 'Purchase failed'))
    }, [])

    const {
        connected,
        subscriptions,
        fetchProducts,
        finishTransaction,
        requestPurchase,
    } = useIAP({
        onPurchaseSuccess: handleSuccess,
        onPurchaseError: handleError,
    })

    finishRef.current = finishTransaction

    // Load the Pro product once connected so we can show live localized pricing.
    useEffect(() => {
        if (connected && SKU) fetchProducts({ skus: [SKU], type: 'subs' })
    }, [connected, fetchProducts])

    const proProduct = useMemo(() => {
        const p = subscriptions.find((s) => s.id === SKU)
        return p ? { displayPrice: p.displayPrice } : null
    }, [subscriptions])

    const purchasePro = useCallback((slug: string) => {
        setError(null)
        setLoading(true)
        return new Promise<{ pro: boolean }>((resolve, reject) => {
            pending.current = { slug, resolve, reject }
            requestPurchase({
                type: 'subs',
                request: { google: { skus: [SKU] } },
            }).catch((e: unknown) => {
                pending.current = null
                reject(e instanceof Error ? e : new Error('Could not start purchase'))
            })
        })
            .catch((e: Error) => { setError(e.message); throw e })
            .finally(() => setLoading(false))
    }, [requestPurchase])

    return { ready: connected, proProduct, purchasePro, loading, error }
}
