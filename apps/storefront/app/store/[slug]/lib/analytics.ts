// lib/analytics.ts

const SESSION_KEY = 'mc_session_id'
const UTM_KEY = 'mc_utm'

function getSessionId(): string {
    if (typeof window === 'undefined') return ''
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
        id = crypto.randomUUID()
        sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
}

type Utm = { utm_source?: string; utm_medium?: string; utm_campaign?: string }

// Capture UTM params from the LANDING url and remember them for the whole
// session. By the time a user reaches a product/cart page the original
// query string is gone, so the first read is the only chance to attribute
// the visit to its campaign.
function getUtm(): Utm {
    if (typeof window === 'undefined') return {}

    const stored = sessionStorage.getItem(UTM_KEY)
    if (stored) {
        try { return JSON.parse(stored) as Utm } catch { /* fall through */ }
    }

    const params = new URLSearchParams(window.location.search)
    const utm: Utm = {}
    const source = params.get('utm_source')
    const medium = params.get('utm_medium')
    const campaign = params.get('utm_campaign')
    if (source) utm.utm_source = source
    if (medium) utm.utm_medium = medium
    if (campaign) utm.utm_campaign = campaign

    // Persist even when empty so we don't re-parse (and don't let a later
    // in-session navigation with fresh utm params overwrite the real source).
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm))
    return utm
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
                ...getUtm(),
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