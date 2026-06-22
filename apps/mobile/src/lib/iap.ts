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

// Raised when the Play payment SUCCEEDED but our backend failed to verify/grant
// Pro. The user has paid (or will be charged unless Play auto-refunds), so they
// must be told it's our side and to contact support — not that the purchase failed.
class GrantError extends Error {
    detail: string
    constructor(detail: string) {
        super(detail)
        this.name = 'GrantError'
        this.detail = detail
    }
}

const SUPPORT_MESSAGE =
    "Payment went through but we couldn't activate Pro on our end. " +
    'You have not lost your money — please contact support@menengai.cloud ' +
    'with your store name and we’ll sort it out right away.'

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
                // Paid but backend said not granted → our problem, needs support.
                ctx.reject(new GrantError('backend returned pro=false'))
            }
        } catch (e) {
            // Payment succeeded but verify/grant threw. Do NOT acknowledge — Play
            // auto-refunds the unacknowledged purchase. Either way it's our side.
            ctx.reject(new GrantError(e instanceof Error ? e.message : 'verify failed'))
        } finally {
            pending.current = null
        }
    }, [])

    const handleError = useCallback((err: { code?: string; message?: string }) => {
        const ctx = pending.current
        pending.current = null
        // User dismissing the Play sheet is a benign no-op, not an error.
        if (err?.code === 'E_USER_CANCELLED' || err?.code === 'user-cancelled') {
            ctx?.resolve({ pro: false })
            return
        }
        // Surface the Play error code+message so failures are diagnosable in support.
        const msg = `purchaseError [${err?.code ?? 'no-code'}]: ${err?.message ?? 'unknown'}`
        setError(msg)
        ctx?.reject(new Error(msg))
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

    const rawProduct = useMemo(
        () => subscriptions.find((s) => s.id === SKU),
        [subscriptions],
    )

    const proProduct = useMemo(
        () => (rawProduct ? { displayPrice: rawProduct.displayPrice } : null),
        [rawProduct],
    )

    // Android subscriptions purchase against a base-plan *offer*. Pull the first
    // offer token from the fetched product; Play rejects the request without it.
    const offerToken = useMemo<string | null>(() => {
        const offers = (rawProduct as { subscriptionOfferDetailsAndroid?: { offerToken: string }[] } | undefined)
            ?.subscriptionOfferDetailsAndroid
        return offers && offers.length > 0 ? offers[0].offerToken : null
    }, [rawProduct])

    const purchasePro = useCallback((slug: string): Promise<{ pro: boolean }> => {
        setError(null)
        if (!SKU) {
            setError('Pro is not configured yet (missing SKU).')
            return Promise.resolve({ pro: false })
        }
        setLoading(true)
        return new Promise<{ pro: boolean }>((resolve, reject) => {
            pending.current = { slug, resolve, reject }
            requestPurchase({
                type: 'subs',
                request: {
                    google: {
                        skus: [SKU],
                        ...(offerToken
                            ? { subscriptionOffers: [{ sku: SKU, offerToken }] }
                            : {}),
                    },
                },
            }).catch((e: unknown) => {
                pending.current = null
                reject(e instanceof Error ? e : new Error('Could not start purchase'))
            })
        })
            // Never let the rejection escape — surface it via `error` state and
            // resolve so the caller (and the UI) stay interactive. A GrantError
            // means the user paid but we failed to activate: show the support
            // message (and log the technical detail), not the raw error.
            .catch((e: Error): { pro: boolean } => {
                if (e instanceof GrantError) {
                    console.warn('[iap] grant failed after payment:', e.detail)
                    setError(SUPPORT_MESSAGE)
                } else {
                    setError(e.message)
                }
                return { pro: false }
            })
            .finally(() => setLoading(false))
    }, [requestPurchase, offerToken])

    return { ready: connected, proProduct, purchasePro, loading, error }
}
