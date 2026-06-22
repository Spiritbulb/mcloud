// Pure parser for Google Play subscriptionsv2 responses. No `server-only` so it can
// be exercised by standalone node scripts. The network call lives in _google-play.ts.

export type PlayVerifyResult =
    | { ok: true; active: boolean; productId: string; orderId: string | null; expiryTime: string | null }
    | { ok: false; error: string }

const ACTIVE_STATES = new Set([
    'SUBSCRIPTION_STATE_ACTIVE',
    'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
])

/** Turn a subscriptionsv2 response into our result shape. */
export function parseSubscriptionResponse(data: any): PlayVerifyResult {
    const state = data?.subscriptionState
    const line = Array.isArray(data?.lineItems) ? data.lineItems[0] : undefined
    const productId = line?.productId
    if (!state || !productId) return { ok: false, error: 'Malformed Play response' }
    return {
        ok: true,
        active: ACTIVE_STATES.has(state),
        productId,
        orderId: data?.latestOrderId ?? null,
        expiryTime: line?.expiryTime ?? null,
    }
}
