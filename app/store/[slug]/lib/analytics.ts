// lib/analytics.ts

const SESSION_KEY = 'mc_session_id'

function getSessionId(): string {
    if (typeof window === 'undefined') return ''
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
        id = crypto.randomUUID()
        sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const w = window.innerWidth
    if (w < 768) return 'mobile'
    if (w < 1024) return 'tablet'
    return 'desktop'
}

type AnalyticsEvent = 'view' | 'add_to_cart' | 'checkout_started' | 'order_placed'

interface TrackOptions {
    storeSlug: string
    event: AnalyticsEvent
    productId?: string
    orderId?: string
}

async function track(opts: TrackOptions) {
    if (typeof window === 'undefined') return  // no SSR tracking

    try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/${opts.storeSlug}/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // fire-and-forget — don't block the UI
            keepalive: true,
            body: JSON.stringify({
                event: opts.event,
                product_id: opts.productId,
                order_id: opts.orderId,
                session_id: getSessionId(),
                device_type: getDeviceType(),
                referrer: document.referrer || null,
            }),
        })
    } catch {
        // analytics should never crash the storefront
    }
}

// ── Named helpers (use these in components) ───────────────────────────────────

export function trackView(storeSlug: string, productId?: string) {
    return track({ storeSlug, event: 'view', productId })
}

export function trackAddToCart(storeSlug: string, productId: string) {
    return track({ storeSlug, event: 'add_to_cart', productId })
}

export function trackCheckout(storeSlug: string) {
    return track({ storeSlug, event: 'checkout_started' })
}

export function trackOrderPlaced(storeSlug: string, productId: string, orderId: string) {
    return track({ storeSlug, event: 'order_placed', productId, orderId })
}