import 'server-only'
import { getGoogleAccessToken, normalizePrivateKey } from '@/lib/google-jwt'
import { parseSubscriptionResponse, type PlayVerifyResult } from './_google-play-parse'

// Verifies a Google Play subscription purchase token against the Android Publisher
// API (purchases.subscriptionsv2.get). Auth reuses the beta-group service account
// (GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY) — acting as itself, no impersonation.

export { parseSubscriptionResponse }
export type { PlayVerifyResult }

const PACKAGE_NAME = 'cloud.menengai.twa'
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher'

export async function verifyPlaySubscription(purchaseToken: string): Promise<PlayVerifyResult> {
    const saEmail = process.env.GOOGLE_SA_EMAIL
    const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY
    if (!saEmail || !rawKey) return { ok: false, error: 'Google Play credentials not configured' }

    let token: string
    try {
        token = await getGoogleAccessToken({
            saEmail,
            privateKey: normalizePrivateKey(rawKey),
            scope: SCOPE,
        })
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'token error' }
    }

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return { ok: false, error: `Play verify failed (${res.status}): ${await res.text()}` }
    return parseSubscriptionResponse(await res.json())
}
